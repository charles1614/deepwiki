const { createServer } = require('http');
const { Server } = require('socket.io');
const { Client } = require('ssh2');
require('dotenv').config(); // Load env vars from .env if present

const port = parseInt(process.env.PORT || '3001', 10);

// Session management for persistent connections
class AiSessionManager {
  constructor() {
    this.sessions = new Map();
    this.SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours (effectively indefinite)
    this.startCleanupInterval();
  }

  preserveSession(socketId, sshClient, sftpClient, stream, config, terminalState, fileBrowserState) {
    const sessionId = this.generateSessionId();
    const session = {
      id: sessionId,
      socketId,
      sshClient,
      sftpClient,
      stream,
      config,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.SESSION_TIMEOUT,
      terminalState: terminalState || null,
      fileBrowserState: fileBrowserState || null,
      cleanupTimeoutId: null
    };

    this.sessions.set(sessionId, session);

    // Auto-cleanup after timeout - store timeout ID so it can be cancelled
    session.cleanupTimeoutId = setTimeout(() => {
      this.cleanupSession(sessionId);
    }, this.SESSION_TIMEOUT);

    return sessionId;
  }

  restoreSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session && session.expiresAt > Date.now()) {
      // Cancel existing cleanup timeout to prevent multiple timers
      if (session.cleanupTimeoutId) {
        clearTimeout(session.cleanupTimeoutId);
        session.cleanupTimeoutId = null;
      }

      // Update expiration time
      session.expiresAt = Date.now() + this.SESSION_TIMEOUT;

      // Schedule new cleanup timeout
      session.cleanupTimeoutId = setTimeout(() => {
        this.cleanupSession(sessionId);
      }, this.SESSION_TIMEOUT);

      return session;
    }
    return null;
  }

  cleanupSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      // Clear any pending cleanup timeout
      if (session.cleanupTimeoutId) {
        clearTimeout(session.cleanupTimeoutId);
        session.cleanupTimeoutId = null;
      }

      try {
        session.sshClient.end();
      } catch (error) {
        console.error('Error cleaning up session:', error);
      }
      this.sessions.delete(sessionId);
    }
  }

  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  startCleanupInterval() {
    setInterval(() => {
      const now = Date.now();
      for (const [sessionId, session] of this.sessions) {
        if (session.expiresAt <= now) {
          this.cleanupSession(sessionId);
        }
      }
    }, 5 * 60 * 1000); // Check every 5 minutes
  }
}

const sessionManager = new AiSessionManager();

const httpServer = createServer((req, res) => {
  res.writeHead(200);
  res.end('SSH Proxy Active');
});

// Initialize Socket.IO server
const io = new Server(httpServer, {
  path: '/api/socket', // Keep path consistent with client
  addTrailingSlash: false,
  transports: ['websocket', 'polling'],
  cors: {
    origin: '*', // Allow connections from any origin (Web App)
    methods: ['GET', 'POST'],
  },
  allowEIO3: true,
  upgradeTimeout: 10000,
});

// Authentication Middleware
io.use((socket, next) => {
  const token = process.env.PROXY_AUTH_TOKEN;

  // If no token is configured in environment, allow connection (dev mode or insecure mode)
  // WARN: This should be set in production
  if (!token) {
    console.warn('WARNING: No PROXY_AUTH_TOKEN set. Allowing all connections.');
    return next();
  }

  const clientToken = socket.handshake.auth.token;

  if (clientToken === token) {
    return next();
  }

  console.error('Authentication failed for client:', socket.id);
  console.error('Expected token length:', token.length);
  console.error('Received token:', clientToken ? `Length: ${clientToken.length}` : 'undefined');
  const err = new Error('Authentication error');
  err.data = { content: 'Invalid authentication token' };
  next(err);
});

// Set up connection handler
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  let sshClient = null;
  let stream = null;
  let sftpClient = null;
  let currentSessionId = null;

  socket.on('ssh-connect', async (data) => {
    console.log('Received ssh-connect request');

    let config = data;

    // Note: In proxy mode, we don't support connectionId lookup from DB
    // because this script runs standalone. The client must provide full credentials.
    // If connectionId is provided, we can't resolve it here.
    if (data.connectionId && !data.sshHost) {
      socket.emit('ssh-error', 'Proxy mode requires direct credentials (sshHost, sshUsername, sshPassword). Saved connections not supported in proxy mode yet.');
      return;
    }

    console.log('Connecting to:', config.sshHost);
    try {
      if (sshClient) {
        sshClient.end();
      }

      sshClient = new Client();

      sshClient.on('ready', () => {
        // Setup SFTP first
        sshClient.sftp((err, sftp) => {
          if (err) {
            console.error('SFTP error:', err);
            socket.emit('ssh-error', 'SFTP failed: ' + err.message);
            return;
          }

          // Cache SFTP client for session restoration
          sftpClient = sftp;

          // Remove existing listeners to prevent duplicates
          socket.removeAllListeners('sftp-list');
          socket.removeAllListeners('sftp-read');

          socket.on('sftp-list', (path) => {
            console.log('SFTP list request:', path);
            sftp.readdir(path, (err, list) => {
              if (err) {
                console.error('SFTP list error:', err);
                socket.emit('sftp-error', err.message);
                return;
              }
              // Add isDirectory property to help frontend
              const processedList = list.map(item => ({
                ...item,
                isDirectory: item.attrs.mode !== undefined ? (item.attrs.mode & 0o40000) === 0o40000 : false
              }));
              socket.emit('sftp-list-result', { path, list: processedList });
            });
          });

          socket.on('sftp-read', (path) => {
            sftp.readFile(path, (err, content) => {
              if (err) {
                socket.emit('sftp-error', err.message);
                return;
              }
              socket.emit('sftp-read-result', { path, content: content.toString('utf-8') });
            });
          });

          // Setup Shell with environment variables
          const shellOptions = {
            env: {
              TERM: 'xterm-256color',
              ANTHROPIC_BASE_URL: config.anthropicBaseUrl || '',
              ANTHROPIC_AUTH_TOKEN: config.anthropicAuthToken || ''
            }
          };

          sshClient.shell(shellOptions, (err, s) => {
            if (err) {
              socket.emit('ssh-error', err.message);
              return;
            }

            stream = s;

            // Preserve session for potential restoration
            currentSessionId = sessionManager.preserveSession(
              socket.id,
              sshClient,
              sftpClient,
              stream,
              config,
              null, // terminalState
              null  // fileBrowserState
            );

            stream.on('close', () => {
              socket.emit('ssh-close');
              if (sshClient) {
                sshClient.end();
              }
            });

            stream.on('data', (data) => {
              const text = data.toString('utf-8');
              socket.emit('ssh-data', text);
              // Append to session history
              const session = sessionManager.sessions.get(currentSessionId);
              if (session) {
                session.history = (session.history || '') + text;
              }
            });

            stream.stderr.on('data', (data) => {
              const text = data.toString('utf-8');
              socket.emit('ssh-data', text);
              // Append to session history
              const session = sessionManager.sessions.get(currentSessionId);
              if (session) {
                session.history = (session.history || '') + text;
              }
            });

            // Emit ready only after both SFTP and Shell are set up
            socket.emit('ssh-ready', { sessionId: currentSessionId });
          });
        });
      });

      sshClient.on('error', (err) => {
        console.error('SSH error:', err);
        socket.emit('ssh-error', err.message);
      });

      sshClient.on('close', () => {
        socket.emit('ssh-close');
      });

      const port = parseInt(String(config.sshPort));
      if (isNaN(port) || port < 0 || port >= 65536) {
        socket.emit('ssh-error', 'Invalid port number');
        return;
      }

      sshClient.connect({
        host: config.sshHost,
        port: port,
        username: config.sshUsername,
        password: config.sshPassword,
      });
    } catch (error) {
      console.error('SSH connection error:', error);
      socket.emit('ssh-error', error.message || 'SSH connection failed');
    }
  });

  // Navigation preservation handlers
  socket.on('navigation-pause', () => {
    console.log('Connection preserved for navigation');
  });

  socket.on('navigation-resume', () => {
    console.log('Connection resumed after navigation');
    if (stream) {
      socket.emit('ssh-data', '\r\n\x1b[32mConnection resumed\x1b[0m\r\n');
    }
  });

  socket.on('navigation-disconnect', (data) => {
    console.log('Navigation disconnect with preservation');
    if (currentSessionId && sshClient && sftpClient && stream) {
      // Update session with current states
      const session = sessionManager.restoreSession(currentSessionId);
      if (session) {
        session.terminalState = data?.terminalState;
        session.fileBrowserState = data?.fileBrowserState;
      }
    }
  });

  socket.on('navigation-restore', (data) => {
    console.log('Attempting to restore connection');
    if (data?.sessionId) {
      const session = sessionManager.restoreSession(data.sessionId);
      if (session) {
        try {
          sshClient = session.sshClient;
          sftpClient = session.sftpClient;
          stream = session.stream;
          currentSessionId = session.id;

          // Re-setup event handlers for restored connection
          if (sftpClient) {
            socket.removeAllListeners('sftp-list');
            socket.removeAllListeners('sftp-read');

            socket.on('sftp-list', (path) => {
              sftpClient.readdir(path, (err, list) => {
                if (err) {
                  socket.emit('sftp-error', err.message);
                  return;
                }
                const processedList = list.map(item => ({
                  ...item,
                  isDirectory: item.attrs.mode !== undefined ? (item.attrs.mode & 0o40000) === 0o40000 : false
                }));
                socket.emit('sftp-list-result', { path, list: processedList });
              });
            });

            socket.on('sftp-read', (path) => {
              sftpClient.readFile(path, (err, content) => {
                if (err) {
                  socket.emit('sftp-error', err.message);
                  return;
                }
                socket.emit('sftp-read-result', { path, content: content.toString('utf-8') });
              });
            });
          }

          if (stream) {
            stream.on('close', () => {
              socket.emit('ssh-close');
            });

            stream.on('data', (data) => {
              const text = data.toString('utf-8');
              socket.emit('ssh-data', text);
              const session = sessionManager.sessions.get(currentSessionId);
              if (session) {
                session.history = (session.history || '') + text;
              }
            });

            stream.stderr.on('data', (data) => {
              const text = data.toString('utf-8');
              socket.emit('ssh-data', text);
              const session = sessionManager.sessions.get(currentSessionId);
              if (session) {
                session.history = (session.history || '') + text;
              }
            });
          }

          socket.emit('ssh-restored');

          if (session.history) {
            socket.emit('ssh-history', session.history);
          }

          console.log('Session restored successfully');
        } catch (error) {
          console.error('Failed to restore session:', error);
          socket.emit('ssh-restore-failed', 'Failed to restore session');
        }
      } else {
        socket.emit('ssh-restore-failed', 'Session not found or expired');
      }
    } else {
      socket.emit('ssh-restore-failed', 'No session ID provided');
    }
  });

  socket.on('ssh-disconnect', () => {
    if (sshClient) {
      sshClient.end();
      sshClient = null;
      sftpClient = null;
      stream = null;
      currentSessionId = null;
      socket.emit('ssh-close');
    }
  });

  socket.on('ssh-data', (data) => {
    if (stream) {
      stream.write(data);
    }
  });

  socket.on('ssh-resize', (dims) => {
    if (stream) {
      stream.setWindow(dims.rows, dims.cols, dims.height, dims.width);
    }
  });

  socket.on('ssh-get-history', () => {
    if (currentSessionId) {
      const session = sessionManager.sessions.get(currentSessionId);
      if (session && session.history) {
        socket.emit('ssh-history', session.history);
      }
    }
  });

  socket.on('disconnect', () => {
    if (sshClient) {
      try {
        sshClient.end();
      } catch (e) {
        console.error('Error closing SSH client:', e);
      }
    }
    console.log('Client disconnected:', socket.id);
  });
});

httpServer.listen(port, () => {
  console.log(`> SSH Proxy ready on port ${port}`);
});
