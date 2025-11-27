'use client'

import React, { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'
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
  const pathname = usePathname()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [settings, setSettings] = useState<any>(null)
  const [showReconnectionBanner, setShowReconnectionBanner] = useState(false)
  const [reconnectionStatus, setReconnectionStatus] = useState<'success' | 'error' | null>(null)
  const navigationStartTime = React.useRef<number | null>(null)
  const isConnecting = React.useRef(false)
  const prevPathnameRef = useRef<string | null>(null)

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
  // Note: imported helpers like retrieveConnectionSettings are NOT included in deps
  // to avoid unnecessary re-runs; we only depend on connection state.
  useEffect(() => {
    try {
      const savedSettings = retrieveConnectionSettings()
      if (savedSettings) {
        setSettings(savedSettings)

        // Check if there's a preserved connection first
        const navigationTimestamp = retrieveNavigationTimestamp()
        const hasPreservedConnection = connectionState.connectionStatus === 'preserved' ||
          (navigationTimestamp && navigationTimestamp.startTime)

        // Only auto-connect if:
        // 1. Not connected
        // 2. Not connecting
        // 3. No preserved connection
        // 4. Not on /ai page (to avoid interfering with resume logic)
        if (!connectionState.isConnected &&
          !connectionState.isConnecting &&
          !hasPreservedConnection &&
          pathname === '/ai') {
          // Small delay to let pathname detection run first
          const timeoutId = setTimeout(() => {
            // Double-check after delay - pathname detection might have resumed the connection
            const stillNeedsConnection = !connectionState.isConnected &&
              !connectionState.isConnecting &&
              connectionState.connectionStatus !== 'preserved'
            if (stillNeedsConnection) {
              handleAutoConnect(savedSettings)
            }
          }, 200)

          return () => clearTimeout(timeoutId)
        }
      }
    } catch (error) {
      console.error('Error initializing AI page:', error)
    }
  }, [connectionState.isConnected, connectionState.isConnecting, connectionState.connectionStatus, pathname])

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



  // Handle navigation away (unmount) - ONLY save timestamp for UI purposes if needed,
  // but DO NOT pause the connection since it's now global and persistent.
  useEffect(() => {
    return () => {
      // When AiPage unmounts, just log it. We rely on the global provider to keep the connection alive.
      // We don't need to preserve/pause the connection anymore.
      console.log('AiPage: Unmounting')
    }
  }, [])

  // Handle navigation back (mount)
  useEffect(() => {
    // Check if we need to resume a preserved connection
    const checkAndResume = () => {
      const navigationTimestamp = retrieveNavigationTimestamp()
      const hasPreservedConnection = connectionState.connectionStatus === 'preserved' ||
        (navigationTimestamp && navigationTimestamp.startTime)

      if (hasPreservedConnection) {
        console.log('AiPage: Mount detected with preserved connection, resuming...')
        resumeConnection()
        if (navigationTimestamp) {
          clearNavigationTimestamp()
        }
      }
    }

    checkAndResume()
  }, []) // Run once on mount

  // Watch for socket becoming available and auto-resume if we have a preserved connection
  useEffect(() => {
    // Only auto-resume if the page is visible
    if (!document.hidden && pathname === '/ai' && connectionState.socket && connectionState.socket.connected) {
      const navigationTimestamp = retrieveNavigationTimestamp()
      const hasPreservedConnection = connectionState.connectionStatus === 'preserved' ||
        (navigationTimestamp && navigationTimestamp.startTime)

      if (hasPreservedConnection && connectionState.connectionStatus !== 'connected') {
        const startTime = navigationTimestamp?.startTime
        if (startTime) {
          const duration = Date.now() - startTime
          if (duration <= NAVIGATION_TIMEOUT) {
            console.log('AI page: Socket became available, auto-resuming preserved connection')
            resumeConnection()
            if (navigationTimestamp) {
              clearNavigationTimestamp()
            }
          }
        }
      }
    }
  }, [connectionState.socket, pathname, connectionState.connectionStatus, resumeConnection])

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
    console.log('AiPage: handleSettingsSave called', { ...newSettings, password: '***' })
    setSettings(newSettings)

    // If connected, reconnect with new settings; otherwise connect immediately
    if (connectionState.isConnected) {
      console.log('AiPage: Already connected, disconnecting first')
      await handleDisconnect()
      console.log('AiPage: Connecting with new settings')
      await connect(newSettings)
    } else {
      console.log('AiPage: Not connected, connecting with new settings')
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

  const isActiveConnection =
    connectionState.isConnected || connectionState.connectionStatus === 'preserved'

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
            onClick={isActiveConnection ? handleDisconnect : handleConnect}
            disabled={
              connectionState.isConnecting ||
              connectionState.connectionStatus === 'restoring' ||
              connectionState.connectionStatus === 'connecting'
            }
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isActiveConnection
              ? 'bg-red-100 text-red-700 hover:bg-red-200'
              : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            data-testid="ai-connect-button"
          >
            {connectionState.isConnecting ||
              connectionState.connectionStatus === 'restoring' ||
              connectionState.connectionStatus === 'connecting'
              ? 'Connecting...'
              : isActiveConnection
                ? 'Disconnect'
                : 'Connect'}
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
        <div className="w-1/2 bg-gray-50">
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