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

    // Delay fit
    requestAnimationFrame(() => {
      try {
        fitAddon.fit()
      } catch (e) {
        console.error('Failed to fit terminal:', e)
      }
    })

    // Handle resize
    const handleResize = () => {
      try {
        fitAddon.fit()
        if (socket && term) {
          socket.emit('ssh-resize', { cols: term.cols, rows: term.rows })
        }
      } catch (e) {
        // Ignore
      }
    }
    window.addEventListener('resize', handleResize)

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
      window.removeEventListener('resize', handleResize)
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
