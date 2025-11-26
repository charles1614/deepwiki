'use client'

import React, { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { AiFileBrowser } from '@/components/ai/AiFileBrowser'
import { AiSettingsModal } from '@/components/ai/AiSettingsModal'
import { AiReconnectionBanner } from '@/components/ai/AiReconnectionBanner'
import { WithNavigation } from '@/components/layout/WithNavigation'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { useAiConnection } from '@/lib/ai/AiConnectionContext'
import { Cog6ToothIcon } from '@heroicons/react/24/outline'
import { retrieveConnectionSettings, preserveNavigationTimestamp, retrieveNavigationTimestamp, clearNavigationTimestamp } from '@/lib/ai/aiStorage'

const AiTerminal = dynamic(() => import('@/components/ai/AiTerminal').then(mod => mod.AiTerminal), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-[#1e1e1e] animate-pulse" />
})

const NAVIGATION_TIMEOUT = 5 * 60 * 1000 // 5 minutes

function AiPageContent() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [settings, setSettings] = useState<any>(null)
  const [showReconnectionBanner, setShowReconnectionBanner] = useState(false)
  const [reconnectionStatus, setReconnectionStatus] = useState<'success' | 'error' | null>(null)
  const navigationStartTime = React.useRef<number | null>(null)
  const isConnecting = React.useRef(false)

  const {
    state: connectionState,
    connect,
    disconnect,
    preserveConnection,
    restoreConnection,
    pauseConnection,
    resumeConnection,
  } = useAiConnection()

  // Initialize settings on mount with error handling
  useEffect(() => {
    try {
      const savedSettings = retrieveConnectionSettings()
      if (savedSettings) {
        setSettings(savedSettings)

        // Auto-connect if settings exist
        if (!connectionState.isConnected && !connectionState.isConnecting) {
          handleAutoConnect(savedSettings)
        }
      }
    } catch (error) {
      console.error('Error initializing AI page:', error)
    }
  }, [retrieveConnectionSettings, connectionState.isConnected, connectionState.isConnecting])

  // Auto-connect with saved settings
  const handleAutoConnect = async (savedSettings: any) => {
    if (!isConnecting.current && !connectionState.isConnected) {
      isConnecting.current = true
      try {
        await connect(savedSettings)

        // Check for restoration after navigation
        const navigationTimestamp = retrieveNavigationTimestamp()
        if (navigationTimestamp && navigationTimestamp.startTime) {
          const duration = Date.now() - navigationTimestamp.startTime

          if (duration > NAVIGATION_TIMEOUT) {
            // Long navigation - attempt restoration
            setShowReconnectionBanner(true)
            setReconnectionStatus(null)

            const restored = await restoreConnection()
            setReconnectionStatus(restored ? 'success' : 'error')

            setTimeout(() => {
              setShowReconnectionBanner(false)
              setReconnectionStatus(null)
            }, restored ? 3000 : 5000)
          } else {
            // Short navigation - just resume
            resumeConnection()
          }

          clearNavigationTimestamp()
        }
      } catch (error) {
        console.error('Auto-connect failed:', error)
      } finally {
        isConnecting.current = false
      }
    }
  }

  // Navigation detection via page visibility (works across App Router navigations)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden, preserve connection
        navigationStartTime.current = Date.now()
        preserveConnection()
        preserveNavigationTimestamp(navigationStartTime.current)
      } else {
        // Page is visible again
        if (navigationStartTime.current && connectionState.connectionStatus === 'preserved') {
          const duration = Date.now() - navigationStartTime.current

          if (duration <= NAVIGATION_TIMEOUT) {
            // Short navigation - resume connection
            resumeConnection()
          }
          // Long navigation case is handled by auto-connect logic
        }
        navigationStartTime.current = null
      }
    }

    // Page visibility API for tab switching / backgrounding
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [connectionState.connectionStatus, preserveConnection, resumeConnection])

  const handleConnect = async () => {
    if (settings) {
      try {
        await connect(settings)
      } catch (error) {
        console.error('Connection failed:', error)
      }
    } else {
      setIsSettingsOpen(true)
    }
  }

  const handleDisconnect = async () => {
    try {
      await disconnect()
    } catch (error) {
      console.error('Disconnect failed:', error)
    }
  }

  const handleSettingsSave = async (newSettings: any) => {
    setSettings(newSettings)

    // If connected, reconnect with new settings; otherwise connect immediately
    if (connectionState.isConnected) {
      await handleDisconnect()
      await connect(newSettings)
    } else {
      await connect(newSettings)
    }
  }

  const handleManualReconnect = async () => {
    setShowReconnectionBanner(true)
    setReconnectionStatus(null)

    try {
      const restored = await restoreConnection()
      setReconnectionStatus(restored ? 'success' : 'error')

      if (restored) {
        setTimeout(() => {
          setShowReconnectionBanner(false)
          setReconnectionStatus(null)
        }, 3000)
      } else {
        // If restoration fails, try full reconnect
        if (settings) {
          await connect(settings)
          setReconnectionStatus('success')
          setTimeout(() => {
            setShowReconnectionBanner(false)
            setReconnectionStatus(null)
          }, 3000)
        }
      }
    } catch (error) {
      console.error('Manual reconnection failed:', error)
      setReconnectionStatus('error')
      setTimeout(() => {
        setShowReconnectionBanner(false)
        setReconnectionStatus(null)
      }, 5000)
    }
  }

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">
      <div className="flex-none px-6 py-4 border-b border-gray-200 bg-white flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-gray-900">AI Terminal & File Browser</h1>
          {connectionState.connectionStatus !== 'idle' && (
            <div className="text-xs text-gray-500">
              {connectionState.connectionStatus === 'connected' && 'Active'}
              {connectionState.connectionStatus === 'preserved' && 'Connection preserved'}
              {connectionState.connectionStatus === 'restoring' && 'Restoring...'}
              {connectionState.connectionStatus === 'connecting' && 'Connecting...'}
              {connectionState.connectionStatus === 'error' && (
                <span className="text-red-600">Error: {connectionState.error || 'Connection failed'}</span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={connectionState.isConnected ? handleDisconnect : handleConnect}
            disabled={connectionState.isConnecting || connectionState.connectionStatus === 'restoring'}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              connectionState.isConnected || connectionState.connectionStatus === 'preserved'
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
            data-testid="ai-connect-button"
          >
            {connectionState.isConnecting || connectionState.connectionStatus === 'restoring'
              ? 'Connecting...'
              : connectionState.isConnected || connectionState.connectionStatus === 'preserved'
                ? 'Disconnect'
                : 'Connect'
            }
          </button>

          {connectionState.connectionStatus === 'preserved' && (
            <button
              onClick={handleManualReconnect}
              className="px-3 py-2 rounded-lg text-sm font-medium bg-yellow-100 text-yellow-700 hover:bg-yellow-200 transition-colors"
              data-testid="ai-manual-reconnect-button"
            >
              Restore
            </button>
          )}

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
          {connectionState.socket && <AiTerminal socket={connectionState.socket} />}
        </div>

        {/* Right Column: File Browser */}
        <div className="w-1/2 bg-gray-50 p-4">
          {connectionState.socket && <AiFileBrowser socket={connectionState.socket} />}
        </div>
      </div>

      <AiSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSettingsSave}
      />

      {showReconnectionBanner && (
        <AiReconnectionBanner
          status={reconnectionStatus}
          onDismiss={() => setShowReconnectionBanner(false)}
          onRetry={handleManualReconnect}
        />
      )}
    </div>
  )
}

export default function AiPage() {
  return (
    <ProtectedRoute>
      <WithNavigation>
        <AiPageContent />
      </WithNavigation>
    </ProtectedRoute>
  )
}