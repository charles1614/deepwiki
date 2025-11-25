'use client'

import React, { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { AiFileBrowser } from '@/components/ai/AiFileBrowser'
import { AiSettingsModal } from '@/components/ai/AiSettingsModal'
import { WithNavigation } from '@/components/layout/WithNavigation'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { Cog6ToothIcon } from '@heroicons/react/24/outline'
import io from 'socket.io-client'

const AiTerminal = dynamic(() => import('@/components/ai/AiTerminal').then(mod => mod.AiTerminal), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-[#1e1e1e] animate-pulse" />
})

export default function AiPage() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [socket, setSocket] = useState<any>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [settings, setSettings] = useState<any>(null)
  const isClosing = React.useRef(false)

  useEffect(() => {
    const savedSettings = localStorage.getItem('ai_ssh_settings')
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings))
    }

    const newSocket = io({
      path: '/api/socket',
      addTrailingSlash: false,
    })
    setSocket(newSocket)

    newSocket.on('ssh-ready', () => {
      console.log('ssh-ready received')
      isClosing.current = false
      setIsConnected(true)
    })

    newSocket.on('ssh-data', () => {
      if (!isClosing.current) {
        setIsConnected(true)
      }
    })

    newSocket.on('sftp-list-result', () => {
      if (!isClosing.current) {
        setIsConnected(true)
      }
    })

    newSocket.on('ssh-close', () => {
      console.log('ssh-close received')
      isClosing.current = true
      setIsConnected(false)
    })

    return () => {
      newSocket.disconnect()
    }
  }, [])

  const handleConnect = () => {
    if (socket && settings) {
      isClosing.current = false
      socket.emit('ssh-connect', settings)
    } else {
      setIsSettingsOpen(true)
    }
  }

  const handleDisconnect = () => {
    if (socket) {
      isClosing.current = true
      setIsConnected(false)
      socket.emit('ssh-disconnect')
    }
  }

  const handleSettingsSave = (newSettings: any) => {
    setSettings(newSettings)
    localStorage.setItem('ai_ssh_settings', JSON.stringify(newSettings))
    // If we were connected or trying to connect, we might want to reconnect?
    // For now, let the user manually connect.
  }

  return (
    <ProtectedRoute>
      <WithNavigation>
        <div className="h-[calc(100vh-64px)] flex flex-col">
          <div className="flex-none px-6 py-4 border-b border-gray-200 bg-white flex justify-between items-center">
            <h1 className="text-xl font-semibold text-gray-900">AI Terminal & File Browser</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={isConnected ? handleDisconnect : handleConnect}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isConnected
                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
              >
                {isConnected ? 'Disconnect' : 'Connect'}
              </button>
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="SSH Settings"
              >
                <Cog6ToothIcon className="h-6 w-6" />
              </button>
            </div>
          </div>

          <div className="flex-1 flex overflow-hidden">
            {/* Left Column: Terminal */}
            <div className="w-1/2 border-r border-gray-200 bg-[#1e1e1e] p-4">
              {socket && <AiTerminal socket={socket} />}
            </div>

            {/* Right Column: File Browser */}
            <div className="w-1/2 bg-gray-50 p-4">
              {socket && <AiFileBrowser socket={socket} />}
            </div>
          </div>

          <AiSettingsModal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            onSave={handleSettingsSave}
          />
        </div>
      </WithNavigation>
    </ProtectedRoute>
  )
}
