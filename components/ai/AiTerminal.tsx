'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import '@xterm/xterm/css/xterm.css'

interface AiTerminalProps {
  socket: any
}

export function AiTerminal({ socket }: AiTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)


  // Initialize terminal
  useEffect(() => {
    if (!terminalRef.current || termRef.current) return

    const term = new Terminal({
      cursorBlink: true,
      theme: {
        background: '#1e1e1e',
        foreground: '#ffffff',
      },
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      fontSize: 14,
    })

    const fitAddon = new FitAddon()
    const webLinksAddon = new WebLinksAddon()

    term.loadAddon(fitAddon)
    term.loadAddon(webLinksAddon)

    term.open(terminalRef.current)
    termRef.current = term
    fitAddonRef.current = fitAddon

    // Handle resize with ResizeObserver
    const resizeObserver = new ResizeObserver(() => {
      try {
        fitAddon.fit()
        if (socket && term) {
          socket.emit('ssh-resize', { cols: term.cols, rows: term.rows })
        }
      } catch (e) {
        console.error('Resize error:', e)
      }
    })

    if (terminalRef.current) {
      resizeObserver.observe(terminalRef.current)
    }

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

    return () => {
      resizeObserver.disconnect()
      term.dispose()
      termRef.current = null
    }
  }, [socket])

  // Handle socket events
  useEffect(() => {
    if (!socket || !termRef.current) return

    const term = termRef.current

    const handleData = (data: string) => {
      term.write(data)
    }

    const handleError = (err: string) => {
      term.write(`\r\n\x1b[31mError: ${err}\x1b[0m\r\n`)
    }

    const handleClose = () => {
      // Clear screen and scrollback
      term.write('\x1b[2J\x1b[3J\x1b[H')
      term.write('\r\n\x1b[33mConnection closed\x1b[0m\r\n')
    }

    socket.on('ssh-data', handleData)
    socket.on('ssh-error', handleError)
    socket.on('ssh-close', handleClose)

    return () => {
      socket.off('ssh-data', handleData)
      socket.off('ssh-error', handleError)
      socket.off('ssh-close', handleClose)
    }
  }, [socket])

  return (
    <div className="h-full w-full bg-[#1e1e1e] rounded-lg overflow-hidden p-2">
      <div ref={terminalRef} className="h-full w-full" />
    </div>
  )
}
