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
    this.SESSION_TIMEOUT = 15 * 60 * 1000 // 15 minutes
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

  restoreSession(sessionId) {
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

  cleanupSession(sessionId) {
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

    socket.on('ssh-connect', (config) => {
      console.log('Received ssh-connect request', { ...config, password: '***' })
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
              sftp.readdir(path, (err, list) => {
                if (err) {
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

            // Setup Shell
            sshClient.shell((err, s) => {
              if (err) {
                socket.emit('ssh-error', err.message)
                return
              }

              stream = s

              stream.on('close', () => {
                socket.emit('ssh-close')
                sshClient.end()
              })

              stream.on('data', (data) => {
                socket.emit('ssh-data', data.toString('utf-8'))
              })

              stream.stderr.on('data', (data) => {
                socket.emit('ssh-data', data.toString('utf-8'))
              })

              // Preserve session for potential restoration
              currentSessionId = sessionManager.preserveSession(
                socket.id,
                sshClient,
                sftpClient,
                stream,
                config
              )

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
        if (session && session.socketId === socket.id) {
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
                socket.emit('ssh-data', data.toString('utf-8'))
              })

              stream.stderr.on('data', (data) => {
                socket.emit('ssh-data', data.toString('utf-8'))
              })
            }

            socket.emit('ssh-restored')

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

    socket.on('ssh-resize', ({ cols, rows }) => {
      if (stream) {
        stream.setWindow(rows, cols, 0, 0)
      }
    })

    socket.on('disconnect', () => {
      if (sshClient) {
        sshClient.end()
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

