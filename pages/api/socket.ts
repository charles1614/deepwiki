import { Server as NetServer } from 'http';
import { NextApiRequest, NextApiResponse } from 'next';
import { Server as SocketIOServer } from 'socket.io';
import { Client } from 'ssh2';

export const config = {
  api: {
    bodyParser: false,
  },
};

// Session management for persistent connections
interface AiSession {
  id: string
  socketId: string
  sshClient: Client
  sftpClient: any
  stream: any
  config: any
  createdAt: number
  expiresAt: number
  terminalState?: {
    buffer: string[]
    cursorPosition: { x: number; y: number }
    dimensions: { cols: number; rows: number }
  }
  fileBrowserState?: {
    currentPath: string
    selectedFile: string | null
    scrollPosition: number
  }
}

class AiSessionManager {
  private sessions = new Map<string, AiSession>()
  private readonly SESSION_TIMEOUT = 15 * 60 * 1000 // 15 minutes

  preserveSession(socketId: string, sshClient: Client, sftpClient: any, stream: any, config: any, terminalState?: any, fileBrowserState?: any): string {
    const sessionId = this.generateSessionId()
    const session: AiSession = {
      id: sessionId,
      socketId,
      sshClient,
      sftpClient,
      stream,
      config,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.SESSION_TIMEOUT,
      terminalState,
      fileBrowserState
    }

    this.sessions.set(sessionId, session)

    // Auto-cleanup after timeout
    setTimeout(() => {
      this.cleanupSession(sessionId)
    }, this.SESSION_TIMEOUT)

    return sessionId
  }

  restoreSession(sessionId: string): AiSession | null {
    const session = this.sessions.get(sessionId)
    if (session && session.expiresAt > Date.now()) {
      // Update expiration time
      session.expiresAt = Date.now() + this.SESSION_TIMEOUT
      setTimeout(() => {
        this.cleanupSession(sessionId)
      }, this.SESSION_TIMEOUT)
      return session
    }
    return null
  }

  private cleanupSession(sessionId: string): void {
    const session = this.sessions.get(sessionId)
    if (session) {
      try {
        session.sshClient.end()
      } catch (error) {
        console.error('Error cleaning up session:', error)
      }
      this.sessions.delete(sessionId)
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Cleanup expired sessions periodically
  startCleanupInterval(): void {
    setInterval(() => {
      const now = Date.now()
      for (const [sessionId, session] of this.sessions) {
        if (session.expiresAt <= now) {
          this.cleanupSession(sessionId)
        }
      }
    }, 5 * 60 * 1000) // Check every 5 minutes
  }
}

const sessionManager = new AiSessionManager()
sessionManager.startCleanupInterval()

const SocketHandler = (req: NextApiRequest, res: NextApiResponse) => {
  // Handle regular HTTP requests (like GET) gracefully
  if (req.method !== 'GET' || !res.socket) {
    res.status(400).json({ error: 'This endpoint only accepts WebSocket connections' });
    return;
  }

  const socket = res.socket as any;

  if (socket.server.io) {
    console.log('Socket is already running');
    res.end();
    return;
  }

  console.log('Socket is initializing');
  const io = new SocketIOServer(socket.server as NetServer, {
    path: '/api/socket',
    addTrailingSlash: false,
  });
  socket.server.io = io;

  io.on('connection', (socket) => {
    console.log('New client connected');
    let sshClient: Client | null = null;
    let stream: any = null;
    let sftpClient: any = null;
    let currentSessionId: string | null = null;

    socket.on('ssh-connect', (config) => {
      console.log('Received ssh-connect request', { ...config, password: '***' });
      try {
        if (sshClient) {
          sshClient.end();
        }

        sshClient = new Client();

        sshClient.on('ready', () => {
          // Setup SFTP first
          sshClient?.sftp((err, sftp) => {
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
              sftp.readdir(path, (err, list) => {
                if (err) {
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

            // Setup Shell
            sshClient?.shell((err, s) => {
              if (err) {
                socket.emit('ssh-error', err.message);
                return;
              }

              stream = s;

              stream.on('close', () => {
                socket.emit('ssh-close');
                sshClient?.end();
              });

              stream.on('data', (data: any) => {
                socket.emit('ssh-data', data.toString('utf-8'));
              });

              stream.stderr.on('data', (data: any) => {
                socket.emit('ssh-data', data.toString('utf-8'));
              });

              // Preserve session for potential restoration
              currentSessionId = sessionManager.preserveSession(
                socket.id,
                sshClient!,
                sftpClient!,
                stream,
                config
              );

              // Emit ready only after both SFTP and Shell are set up
              socket.emit('ssh-ready', { sessionId: currentSessionId });
            });
          });

        }).on('error', (err) => {
          console.error('SSH Client Error:', err);
          socket.emit('ssh-error', err.message);
        }).on('close', () => {
          socket.emit('ssh-close');
        });

        const port = parseInt(config.port);
        if (isNaN(port) || port < 0 || port >= 65536) {
          socket.emit('ssh-error', 'Invalid port number');
          return;
        }

        sshClient.connect({
          host: config.host,
          port: port,
          username: config.username,
          password: config.password,
        });
      } catch (err: any) {
        console.error('Error in ssh-connect handler:', err);
        socket.emit('ssh-error', 'Internal server error during connection: ' + err.message);
      }
    });

    // Navigation preservation handlers
    socket.on('navigation-pause', () => {
      console.log('Connection preserved for navigation');
      // Connection is preserved, don't actually disconnect
    });

    socket.on('navigation-resume', () => {
      console.log('Connection resumed after navigation');
      // Connection is active again
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
        if (session && session.socketId === socket.id) {
          try {
            sshClient = session.sshClient;
            sftpClient = session.sftpClient;
            stream = session.stream;
            currentSessionId = session.id;

            // Re-setup event handlers for restored connection
            if (sftpClient) {
              setupSftpHandlers(socket, sftpClient);
            }
            if (stream) {
              setupStreamHandlers(socket, stream);
            }

            socket.emit('ssh-restored');

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

    socket.on('ssh-resize', ({ cols, rows }) => {
      if (stream) {
        stream.setWindow(rows, cols, 0, 0);
      }
    });

    socket.on('disconnect', () => {
      if (sshClient) {
        sshClient.end();
      }
      console.log('Client disconnected');
    });
  });

  // Helper functions for setting up event handlers
  function setupSftpHandlers(socket: any, sftpClient: any) {
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

  function setupStreamHandlers(socket: any, stream: any) {
    stream.on('close', () => {
      socket.emit('ssh-close');
    });

    stream.on('data', (data: any) => {
      socket.emit('ssh-data', data.toString('utf-8'));
    });

    stream.stderr.on('data', (data: any) => {
      socket.emit('ssh-data', data.toString('utf-8'));
    });
  }

  res.end();
};

export default SocketHandler;
