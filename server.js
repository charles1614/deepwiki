const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { Server } = require('socket.io')
const { Client } = require('ssh2')

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = parseInt(process.env.PORT || '3000', 10)

// Session management for persistent connections
class AiSessionManager {
  constructor() {
    this.sessions = new Map()
    this.SESSION_TIMEOUT = 24 * 60 * 60 * 1000 // 24 hours (effectively indefinite)
    this.startCleanupInterval()
  }

  preserveSession(socketId, sshClient, sftpClient, stream, config, terminalState, fileBrowserState) {
    const sessionId = this.generateSessionId()
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
    }

    this.sessions.set(sessionId, session)

    // Auto-cleanup after timeout - store timeout ID so it can be cancelled
    session.cleanupTimeoutId = setTimeout(() => {
      this.cleanupSession(sessionId)
    }, this.SESSION_TIMEOUT)

    return sessionId
  }

  restoreSession(sessionId) {
    const session = this.sessions.get(sessionId)
    if (session && session.expiresAt > Date.now()) {
      // Cancel existing cleanup timeout to prevent multiple timers
      if (session.cleanupTimeoutId) {
        clearTimeout(session.cleanupTimeoutId)
        session.cleanupTimeoutId = null
      }

      // Update expiration time
      session.expiresAt = Date.now() + this.SESSION_TIMEOUT

      // Schedule new cleanup timeout
      session.cleanupTimeoutId = setTimeout(() => {
        this.cleanupSession(sessionId)
      }, this.SESSION_TIMEOUT)

      return session
    }
    return null
  }

  cleanupSession(sessionId) {
    const session = this.sessions.get(sessionId)
    if (session) {
      // Clear any pending cleanup timeout
      if (session.cleanupTimeoutId) {
        clearTimeout(session.cleanupTimeoutId)
        session.cleanupTimeoutId = null
      }

      try {
        session.sshClient.end()
      } catch (error) {
        console.error('Error cleaning up session:', error)
      }
      this.sessions.delete(sessionId)
    }
  }

  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  startCleanupInterval() {
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

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  })

  // Initialize Socket.IO server
  const io = new Server(httpServer, {
    path: '/api/socket',
    addTrailingSlash: false,
    transports: ['websocket', 'polling'],
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    allowEIO3: true,
    upgradeTimeout: 10000,
  })

  // Set up connection handler
  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id)
    let sshClient = null
    let stream = null
    let sftpClient = null
    let currentSessionId = null


    socket.on('ssh-connect', async (data) => {
      console.log('Received ssh-connect request')

      let config = null

      // Handle both legacy (direct settings) and new (connectionId) modes
      // If explicit credentials are provided, use them (avoids DB lookup issues in standalone server)
      if (data.connectionId && !data.webPassword && !data.password) {
        console.log('Using stored credentials for connection:', data.connectionId)
        try {
          // We need to import prisma and decryption here
          // Since server.js is a CommonJS file, we might need dynamic import or require
          // For simplicity in this custom server setup, we'll assume we can require the built encryption lib
          // But typescript files aren't built yet.
          // A better approach for the custom server is to query the DB directly using pg or similar, 
          // OR since we are in dev/prod, we can try to use the prisma client.

          const { PrismaClient } = require('@prisma/client')
          const prisma = new PrismaClient()

          // We also need the decryption logic. 
          // Since encryption.ts is TS, we can't require it directly in JS without compilation.
          // We will duplicate the decryption logic here for the server.js file to avoid build complexity
          // or we could compile encryption.ts. Duplication is safer for this specific file.
          const crypto = require('crypto')
          const ALGORITHM = 'aes-256-gcm'
          const IV_LENGTH = 16
          const SALT_LENGTH = 64
          const TAG_LENGTH = 16

          function getKey(salt) {
            const secret = process.env.ENCRYPTION_KEY
            if (!secret) throw new Error('ENCRYPTION_KEY not set')
            return crypto.pbkdf2Sync(secret, salt, 100000, 32, 'sha512')
          }

          function decrypt(text) {
            try {
              const buffer = Buffer.from(text, 'hex')
              const salt = buffer.subarray(0, SALT_LENGTH)
              const iv = buffer.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH)
              const tag = buffer.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH)
              const encrypted = buffer.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH)
              const key = getKey(salt)
              const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
              decipher.setAuthTag(tag)
              return decipher.update(encrypted) + decipher.final('utf8')
            } catch (error) {
              console.warn('Server decryption failed (key mismatch?):', error.message)
              return ''
            }
          }

          const connection = await prisma.sshConnection.findUnique({
            where: { id: data.connectionId }
          })

          if (!connection) {
            socket.emit('ssh-error', 'Connection setting not found')
            return
          }

          config = {
            host: connection.webHost,
            port: connection.webPort,
            username: connection.webUsername,
            password: decrypt(connection.encryptedWebPassword),
            anthropicAuthToken: connection.encryptedAuthToken ? decrypt(connection.encryptedAuthToken) : undefined,
            anthropicBaseUrl: connection.anthropicBaseUrl || process.env.ANTHROPIC_BASE_URL
          }

          await prisma.$disconnect()
        } catch (error) {
          console.error('Error fetching credentials:', error)
          socket.emit('ssh-error', 'Failed to load credentials')
          return
        }
      } else {
        // Legacy/Direct mode
        // For Web Mode (this server), we use webHost/webPort etc.
        config = {
          host: data.webHost || data.host,
          port: data.webPort || data.port,
          username: data.webUsername || data.username,
          password: data.webPassword || data.password,
          anthropicBaseUrl: data.anthropicBaseUrl,
          anthropicAuthToken: data.anthropicAuthToken
        }
      }

      console.log('Connecting to:', config.host)
      try {
        if (sshClient) {
          sshClient.end()
        }

        sshClient = new Client()

        sshClient.on('ready', () => {
          // Setup SFTP first
          sshClient.sftp((err, sftp) => {
            if (err) {
              console.error('SFTP error:', err)
              socket.emit('ssh-error', 'SFTP failed: ' + err.message)
              return
            }

            // Cache SFTP client for session restoration
            sftpClient = sftp

            // Remove existing listeners to prevent duplicates
            socket.removeAllListeners('sftp-list')
            socket.removeAllListeners('sftp-read')

            socket.on('sftp-list', (path) => {
              console.log('SFTP list request:', path)
              sftp.readdir(path, (err, list) => {
                if (err) {
                  console.error('SFTP list error:', err)
                  socket.emit('sftp-error', err.message)
                  return
                }
                // Add isDirectory property to help frontend
                const processedList = list.map(item => ({
                  ...item,
                  isDirectory: item.attrs.mode !== undefined ? (item.attrs.mode & 0o40000) === 0o40000 : false
                }))
                socket.emit('sftp-list-result', { path, list: processedList })
              })
            })

            socket.on('sftp-read', (path) => {
              sftp.readFile(path, (err, content) => {
                if (err) {
                  socket.emit('sftp-error', err.message)
                  return
                }
                socket.emit('sftp-read-result', { path, content: content.toString('utf-8') })
              })
            })

            // Setup Shell with environment variables
            const shellOptions = {
              env: {
                TERM: 'xterm-256color',
                ANTHROPIC_BASE_URL: config.anthropicBaseUrl || '',
                ANTHROPIC_AUTH_TOKEN: config.anthropicAuthToken || ''
              }
            }

            sshClient.shell(shellOptions, (err, s) => {
              if (err) {
                socket.emit('ssh-error', err.message)
                return
              }

              stream = s

              // Preserve session for potential restoration
              // Note: terminalState and fileBrowserState will be updated via navigation-disconnect event
              currentSessionId = sessionManager.preserveSession(
                socket.id,
                sshClient,
                sftpClient,
                stream,
                config,
                null, // terminalState - will be updated later
                null  // fileBrowserState - will be updated later
              )

              stream.on('close', () => {
                socket.emit('ssh-close')
                if (sshClient) {
                  sshClient.end()
                }
              })

              stream.on('data', (data) => {
                const text = data.toString('utf-8')
                socket.emit('ssh-data', text)
                // Append to session history
                const session = sessionManager.sessions.get(currentSessionId)
                if (session) {
                  session.history = (session.history || '') + text
                }
              })

              stream.stderr.on('data', (data) => {
                const text = data.toString('utf-8')
                socket.emit('ssh-data', text)
                // Append to session history
                const session = sessionManager.sessions.get(currentSessionId)
                if (session) {
                  session.history = (session.history || '') + text
                }
              })

              // Emit ready only after both SFTP and Shell are set up
              socket.emit('ssh-ready', { sessionId: currentSessionId })
            })
          })
        })

        sshClient.on('error', (err) => {
          console.error('SSH error:', err)
          socket.emit('ssh-error', err.message)
        })

        sshClient.on('close', () => {
          socket.emit('ssh-close')
        })

        const port = parseInt(String(config.port))
        if (isNaN(port) || port < 0 || port >= 65536) {
          socket.emit('ssh-error', 'Invalid port number')
          return
        }

        sshClient.connect({
          host: config.host,
          port: port,
          username: config.username,
          password: config.password,
        })
      } catch (error) {
        console.error('SSH connection error:', error)
        socket.emit('ssh-error', error.message || 'SSH connection failed')
      }
    })

    // Navigation preservation handlers
    socket.on('navigation-pause', () => {
      console.log('Connection preserved for navigation')
    })

    socket.on('navigation-resume', () => {
      console.log('Connection resumed after navigation')
      if (stream) {
        socket.emit('ssh-data', '\r\n\x1b[32mConnection resumed\x1b[0m\r\n')
      }
    })

    socket.on('navigation-disconnect', (data) => {
      console.log('Navigation disconnect with preservation')
      if (currentSessionId && sshClient && sftpClient && stream) {
        // Update session with current states
        const session = sessionManager.restoreSession(currentSessionId)
        if (session) {
          session.terminalState = data?.terminalState
          session.fileBrowserState = data?.fileBrowserState
        }
      }
    })

    socket.on('navigation-restore', (data) => {
      console.log('Attempting to restore connection')
      if (data?.sessionId) {
        const session = sessionManager.restoreSession(data.sessionId)
        // Remove socket ID check - session ID is the security mechanism
        // New socket connections will have different IDs, which is expected
        if (session) {
          try {
            sshClient = session.sshClient
            sftpClient = session.sftpClient
            stream = session.stream
            currentSessionId = session.id

            // Re-setup event handlers for restored connection
            if (sftpClient) {
              socket.removeAllListeners('sftp-list')
              socket.removeAllListeners('sftp-read')

              socket.on('sftp-list', (path) => {
                sftpClient.readdir(path, (err, list) => {
                  if (err) {
                    socket.emit('sftp-error', err.message)
                    return
                  }
                  const processedList = list.map(item => ({
                    ...item,
                    isDirectory: item.attrs.mode !== undefined ? (item.attrs.mode & 0o40000) === 0o40000 : false
                  }))
                  socket.emit('sftp-list-result', { path, list: processedList })
                })
              })

              socket.on('sftp-read', (path) => {
                sftpClient.readFile(path, (err, content) => {
                  if (err) {
                    socket.emit('sftp-error', err.message)
                    return
                  }
                  socket.emit('sftp-read-result', { path, content: content.toString('utf-8') })
                })
              })
            }

            if (stream) {
              stream.on('close', () => {
                socket.emit('ssh-close')
              })

              stream.on('data', (data) => {
                const text = data.toString('utf-8')
                socket.emit('ssh-data', text)
                // Append to session history
                const session = sessionManager.sessions.get(currentSessionId)
                if (session) {
                  session.history = (session.history || '') + text
                }
              })

              stream.stderr.on('data', (data) => {
                const text = data.toString('utf-8')
                socket.emit('ssh-data', text)
                // Append to session history
                const session = sessionManager.sessions.get(currentSessionId)
                if (session) {
                  session.history = (session.history || '') + text
                }
              })
            }

            socket.emit('ssh-restored')

            // Send history to restore terminal state with colors
            if (session.history) {
              socket.emit('ssh-history', session.history)
            }

            console.log('Session restored successfully')
          } catch (error) {
            console.error('Failed to restore session:', error)
            socket.emit('ssh-restore-failed', 'Failed to restore session')
          }
        } else {
          socket.emit('ssh-restore-failed', 'Session not found or expired')
        }
      } else {
        socket.emit('ssh-restore-failed', 'No session ID provided')
      }
    })

    socket.on('ssh-disconnect', () => {
      if (sshClient) {
        sshClient.end()
        sshClient = null
        sftpClient = null
        stream = null
        currentSessionId = null
        socket.emit('ssh-close')
      }
    })

    socket.on('ssh-data', (data) => {
      if (stream) {
        stream.write(data)
      }
    })

    socket.on('ssh-resize', (dims) => {
      if (stream) {
        stream.setWindow(dims.rows, dims.cols, dims.height, dims.width)
      }
    })

    socket.on('ssh-get-history', () => {
      if (currentSessionId) {
        const session = sessionManager.sessions.get(currentSessionId)
        if (session && session.history) {
          socket.emit('ssh-history', session.history)
        }
      }
    })

    socket.on('ssh-get-pwd', () => {
      if (sshClient && sshClient._sock && sshClient._sock.readable) {
        sshClient.exec('pwd', (err, execStream) => {
          if (err) {
            console.error('PWD exec error:', err)
            return
          }

          let pwdOutput = ''
          execStream.on('data', (data) => {
            pwdOutput += data.toString('utf-8')
          })

          execStream.on('close', () => {
            const path = pwdOutput.trim()
            if (path) {
              socket.emit('ssh-pwd-result', path)
            }
          })

          execStream.stderr.on('data', (data) => {
            console.error('PWD stderr:', data.toString())
          })
        })
      }
    })

    socket.on('disconnect', () => {
      if (sshClient) {
        try {
          sshClient.end()
        } catch (e) {
          console.error('Error closing SSH client:', e)
        }
      }
      console.log('Client disconnected:', socket.id)
    })
  })

  httpServer
    .once('error', (err) => {
      console.error(err)
      process.exit(1)
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`)
    })
})

