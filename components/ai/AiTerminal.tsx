'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { useAiConnection } from '@/lib/ai/AiConnectionContext'
import { preserveTerminalState, retrieveTerminalState, clearTerminalState } from '@/lib/ai/aiStorage'
import '@xterm/xterm/css/xterm.css'

interface AiTerminalProps {
  socket: any
}

export function AiTerminal({ socket }: AiTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const { state: connectionState } = useAiConnection()


  // Preserve terminal state when connection is preserved
  useEffect(() => {
    if (connectionState.connectionStatus === 'preserved' && termRef.current && isInitialized) {
      preserveTerminalState(termRef.current)
    }
  }, [connectionState.connectionStatus, isInitialized])

  // Use ref for state access in cleanup
  const connectionStateRef = useRef(connectionState)
  const isInitializedRef = useRef(isInitialized)

  useEffect(() => {
    connectionStateRef.current = connectionState
    isInitializedRef.current = isInitialized
  }, [connectionState, isInitialized])

  // Initialize terminal
  useEffect(() => {
    if (!terminalRef.current || termRef.current) return

    const term = new Terminal({
      cursorBlink: true,
      theme: {
        background: '#ffffff',
        foreground: '#1e1e1e',
        cursor: '#3b82f6',
        cursorAccent: '#ffffff',
        selectionBackground: '#3b82f6',
        selectionForeground: '#ffffff',
        // ANSI colors for terminal output
        black: '#1e1e1e',
        red: '#dc2626',
        green: '#16a34a',
        yellow: '#ca8a04',
        blue: '#2563eb',
        magenta: '#9333ea',
        cyan: '#0891b2',
        white: '#6b7280',
        brightBlack: '#4b5563',
        brightRed: '#ef4444',
        brightGreen: '#22c55e',
        brightYellow: '#eab308',
        brightBlue: '#3b82f6',
        brightMagenta: '#a855f7',
        brightCyan: '#06b6d4',
        brightWhite: '#1e1e1e',
      },
      fontFamily: '"MesloLGS NF", Menlo, Monaco, "Courier New", monospace',
      fontSize: 14,
      scrollback: 1000, // Keep last 1000 lines
    })

    const fitAddon = new FitAddon()
    const webLinksAddon = new WebLinksAddon()

    term.loadAddon(fitAddon)
    term.loadAddon(webLinksAddon)

    term.open(terminalRef.current)
    termRef.current = term
    fitAddonRef.current = fitAddon

    // Try to restore terminal state if available
    const storedState = retrieveTerminalState()
    if (storedState) {
      try {
        // We no longer restore buffer from local storage as it loses colors
        // Instead we rely on server sending 'ssh-history' event

        // Restore cursor position if available (optional, might be better to let history dictate)
        // if (storedState.cursorPosition) {
        //   term.write(`\x1b[${storedState.cursorPosition.y};${storedState.cursorPosition.x}H`)
        // }

        console.log('Terminal settings restored from storage')
      } catch (error) {
        console.error('Failed to restore terminal state:', error)
        clearTerminalState()
      }
    }

    // Ensure terminal has focus so cursor blinks
    term.focus()

    // Handle resize with ResizeObserver
    const resizeObserver = new ResizeObserver(() => {
      try {
        if (fitAddonRef.current) {
          fitAddonRef.current.fit()
          // Send new dimensions to server
          if (socket && socket.connected) {
            socket.emit('ssh-resize', {
              cols: term.cols,
              rows: term.rows
            })
          }
        }
      } catch (e) {
        console.error('Error resizing terminal:', e)
      }
    })

    if (terminalRef.current) {
      resizeObserver.observe(terminalRef.current)
    }

    // Xterm.js event handlers
    term.onData((data) => {
      if (socket) {
        socket.emit('ssh-data', data)
      }
    })

    term.onResize(({ cols, rows }) => {
      if (socket) {
        socket.emit('ssh-resize', { cols, rows })
      }
    })

    // Socket event listeners are handled in a separate useEffect
    // to ensure proper cleanup and avoid duplication

    setIsInitialized(true)

    return () => {
      resizeObserver.disconnect()

      // Preserve state on unmount if connected
      const state = connectionStateRef.current
      if (termRef.current && isInitializedRef.current && state.isConnected) {
        console.log('AiTerminal: Unmounting, preserving state')
        preserveTerminalState(termRef.current)
        // We don't call preserveConnection() here because it might be a simple unmount
        // (e.g. conditional rendering). The page/navigation logic should handle the connection preservation.
        // However, since we moved the provider to global, we need to ensure the connection isn't lost.
        // If we are navigating away, we want to preserve.
      }

      term.dispose()
      termRef.current = null
      setIsInitialized(false)
    }
  }, [socket]) // Only re-run if socket changes (which is rare)

  // Helper to handle incoming data and check for OSC sequences
  const handleData = (data: string) => {
    if (!termRef.current) return

    // Detect zellij-compatible marker: \x1b]99;__DEEPWIKI_PWD__:/path\x07
    const zellijMarkerMatch = data.match(/\x1b\]99;__DEEPWIKI_PWD__:(.+?)\x07/)
    if (zellijMarkerMatch) {
      const path = zellijMarkerMatch[1]
      console.log('AiTerminal: Zellij directory sync detected:', path)
      if (socket) {
        socket.emit('sftp-list', path)
      }
      // Remove marker from output (keep terminal clean)
      data = data.replace(/\x1b\]99;__DEEPWIKI_PWD__:.+?\x07/g, '')
    }

    // Fallback: Legacy OSC sequence support (non-zellij shells)
    if (!zellijMarkerMatch) {
      const legacyOscMatch = data.match(/\x1b\]99;(.+?)\x07/)
      if (legacyOscMatch) {
        const path = legacyOscMatch[1]
        console.log('AiTerminal: Legacy OSC directory sync detected:', path)
        if (socket) {
          socket.emit('sftp-list', path)
        }
        data = data.replace(/\x1b\]99;.+?\x07/g, '')
      }
    }

    termRef.current.write(data)
  }

  // Handle socket events
  useEffect(() => {
    if (!socket || !termRef.current) return

    const term = termRef.current

    const handleError = (err: string) => {
      term.write(`\r\n\x1b[31mError: ${err}\x1b[0m\r\n`)
    }

    const handleClose = () => {
      // Clear screen and scrollback
      term.write('\x1b[2J\x1b[3J\x1b[H')
      term.write('\r\n\x1b[33mConnection closed\x1b[0m\r\n')
    }

    const handleRestored = () => {
      console.log('Terminal connection restored')
      term.write('\r\n\x1b[32mConnection restored\x1b[0m\r\n')
    }

    const handleRestoreFailed = () => {
      console.log('Terminal connection restoration failed')
      term.write('\r\n\x1b[31mConnection restoration failed\x1b[0m\r\n')
    }

    const handleHistory = (history: string) => {
      console.log('Received session history, restoring terminal content')
      term.reset() // Clear current content
      term.write(history)
    }

    socket.on('ssh-data', handleData)
    socket.on('ssh-error', handleError)
    socket.on('ssh-close', handleClose)
    socket.on('ssh-restored', handleRestored)
    socket.on('ssh-restore-failed', handleRestoreFailed)
    socket.on('ssh-history', handleHistory)

    // Request history on mount/reconnect
    socket.emit('ssh-get-history')

    return () => {
      socket.off('ssh-data', handleData)
      socket.off('ssh-error', handleError)
      socket.off('ssh-close', handleClose)
      socket.off('ssh-restored', handleRestored)
      socket.off('ssh-restore-failed', handleRestoreFailed)
      socket.off('ssh-history', handleHistory)
    }
  }, [socket, isInitialized])

  // Note: Automatic PWD polling has been removed because it's intrusive in terminal multiplexers like zellij.
  // Use the manual sync button in the file browser instead, or configure your shell prompt to emit OSC sequences.

  // File-based PWD polling for zellij support
  useEffect(() => {
    if (!socket || !isInitialized) return

    let lastPath: string | null = null

    const handlePwdFileResult = (path: string) => {
      // Only emit sftp-list if path has changed
      if (path && path !== lastPath) {
        console.log('AiTerminal: Directory changed (file-based):', lastPath, '→', path)
        lastPath = path
        socket.emit('sftp-list', path)
      }
    }

    socket.on('ssh-pwd-file-result', handlePwdFileResult)

    // Poll PWD file every 2 seconds
    const pollInterval = setInterval(() => {
      socket.emit('ssh-poll-pwd-file')
    }, 2000)

    // Get initial PWD
    socket.emit('ssh-poll-pwd-file')

    return () => {
      socket.off('ssh-pwd-file-result', handlePwdFileResult)
      clearInterval(pollInterval)
    }
  }, [socket, isInitialized])

  return (
    <div className="h-full w-full bg-white rounded-lg overflow-hidden p-2" data-testid="ai-terminal">
      <div ref={terminalRef} className="h-full w-full" />
    </div>
  )
}
