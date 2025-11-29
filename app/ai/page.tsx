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

const NAVIGATION_TIMEOUT = 24 * 60 * 60 * 1000 // 24 hours (effectively indefinite)

function AiPageContent() {
  const pathname = usePathname()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [settings, setSettings] = useState<any>(null)
  const [showReconnectionBanner, setShowReconnectionBanner] = useState(false)
  const [reconnectionStatus, setReconnectionStatus] = useState<'success' | 'error' | null>(null)
  const navigationStartTime = React.useRef<number | null>(null)
  const isConnecting = React.useRef(false)
  const prevPathnameRef = useRef<string | null>(null)
  const autoConnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  // Ref to track latest connection state to avoid stale closures in async loops
  const connectionStateRef = useRef<any>(null)

  const {
    state: connectionState,
    connect,
    disconnect,
    resetManualDisconnect,
    preserveConnection,
    restoreConnection,
    pauseConnection,
    resumeConnection,
  } = useAiConnection()

  // Keep connectionStateRef updated
  useEffect(() => {
    connectionStateRef.current = connectionState
  }, [connectionState])

  // Initialize settings on mount with error handling
  useEffect(() => {
    try {
      const savedSettings = retrieveConnectionSettings()
      if (savedSettings) {
        setSettings(savedSettings)

        // Don't auto-connect if manually disconnected
        if (connectionState.connectionStatus === 'manuallyDisconnected') {
          console.log('AiPage: Skipping auto-connect - manually disconnected')
          return
        }

        // Check if there's a preserved connection first
        const navigationTimestamp = retrieveNavigationTimestamp()
        const hasPreservedConnection = connectionState.connectionStatus === 'preserved' ||
          (navigationTimestamp && navigationTimestamp.startTime)

        // Only auto-connect if:
        // 1. On /ai page
        // 2. Not connected
        // 3. Not connecting
        // 4. No preserved connection
        // 5. Status is idle or error (NOT disconnected - respect manual disconnects)
        const shouldAutoConnect = pathname === '/ai' &&
          !connectionState.isConnected &&
          !connectionState.isConnecting &&
          !hasPreservedConnection &&
          (connectionState.connectionStatus === 'idle' || connectionState.connectionStatus === 'error')

        if (shouldAutoConnect) {
          console.log('AiPage: Scheduling auto-connect')
          // Small delay to let other initialization complete
          autoConnectTimeoutRef.current = setTimeout(() => {
            // Double-check manual disconnect status
            if (connectionState.connectionStatus === 'manuallyDisconnected') {
              console.log('AiPage: Auto-connect timeout fired but status is manuallyDisconnected, aborting')
              return
            }

            console.log('AiPage: Auto-connect timeout fired, attempting connection')
            if (!isConnecting.current) {
              handleAutoConnect(savedSettings)
            }
          }, 200)
        } else {
          console.log('AiPage: Skipping auto-connect', {
            pathname,
            isConnected: connectionState.isConnected,
            status: connectionState.connectionStatus
          })
        }

        return () => {
          if (autoConnectTimeoutRef.current) {
            console.log('AiPage: Cleaning up auto-connect timeout')
            clearTimeout(autoConnectTimeoutRef.current)
            autoConnectTimeoutRef.current = null
          }
        }
      }
    } catch (error) {
      console.error('Error initializing AI page:', error)
    }
  }, [pathname, connectionState.isConnected, connectionState.isConnecting, connectionState.connectionStatus])

  const handleAutoConnect = async (savedSettings: any) => {
    console.log('AiPage: handleAutoConnect called', {
      isConnectingRef: isConnecting.current,
      isConnected: connectionState.isConnected,
      status: connectionState.connectionStatus
    })

    // Extra guard - don't auto-connect if status is disconnected or manually disconnected
    if (connectionState.connectionStatus === 'disconnected' || connectionState.connectionStatus === 'manuallyDisconnected') {
      console.log('AiPage: Skipping auto-connect - status is disconnected/manuallyDisconnected')
      return
    }

    if (!isConnecting.current && !connectionState.isConnected) {
      isConnecting.current = true

      try {
        console.log('AiPage: Auto-connect attempt')
        await connect(savedSettings)

        // Wait for SSH connection (sessionId) or error
        // Poll every 500ms for up to 15 seconds
        let sshConnected = false
        let sshError = null

        for (let i = 0; i < 30; i++) { // 30 * 500ms = 15s
          await new Promise(resolve => setTimeout(resolve, 500))

          // Check if manually disconnected during wait
          if (connectionStateRef.current?.connectionStatus === 'manuallyDisconnected') {
            console.log('AiPage: Auto-connect aborted - manually disconnected')
            break
          }

          // Check for SSH success (sessionId present)
          if (connectionStateRef.current?.sessionId) {
            sshConnected = true
            break
          }

          // Check for error
          if (connectionStateRef.current?.error) {
            sshError = connectionStateRef.current.error
            break
          }
        }

        if (sshConnected) {
          console.log('AiPage: Auto-connect successful (SSH established)')
        } else if (sshError) {
          throw new Error(sshError)
        } else if (connectionStateRef.current?.connectionStatus === 'manuallyDisconnected') {
          // Already handled above
        } else {
          throw new Error('SSH connection timeout')
        }

        // Check for restoration after navigation (only if connected)
        if (connectionState.isConnected) {
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
        }
      } catch (error) {
        console.error('Auto-connect sequence failed:', error)
      } finally {
        isConnecting.current = false
      }
    } else {
      console.log('AiPage: Skipping auto-connect - already connecting or connected')
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
    // Reset manual disconnect status
    resetManualDisconnect()

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
    console.log('AiPage: handleDisconnect called')

    // Clear any pending auto-connect timeout
    if (autoConnectTimeoutRef.current) {
      console.log('AiPage: Clearing auto-connect timeout on manual disconnect')
      clearTimeout(autoConnectTimeoutRef.current)
      autoConnectTimeoutRef.current = null
    }

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
      <div className="flex-none px-4 py-2 border-b border-gray-200 bg-white flex justify-between items-center">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold text-gray-900">AI Agent</h1>
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
            onClick={isActiveConnection || connectionState.isConnecting || connectionState.connectionStatus === 'connecting' ? handleDisconnect : handleConnect}
            disabled={
              connectionState.connectionStatus === 'restoring'
            }
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isActiveConnection || connectionState.isConnecting || connectionState.connectionStatus === 'connecting'
              ? 'bg-red-100 text-red-700 hover:bg-red-200'
              : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            data-testid="ai-connect-button"
          >
            {connectionState.connectionStatus === 'restoring'
              ? 'Restoring...'
              : isActiveConnection || connectionState.isConnecting || connectionState.connectionStatus === 'connecting'
                ? 'Disconnect'
                : 'Connect'}
          </button>

          {connectionState.connectionStatus === 'preserved' && (
            <button
              onClick={handleManualReconnect}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-yellow-100 text-yellow-700 hover:bg-yellow-200 transition-colors"
              data-testid="ai-manual-reconnect-button"
            >
              Restore
            </button>
          )}

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="SSH Settings"
          >
            <Cog6ToothIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Column: Terminal */}
        <div className="w-full h-1/2 md:w-1/2 md:h-full border-b md:border-b-0 md:border-r border-gray-200 bg-[#1e1e1e] p-4">
          {connectionState.socket && <AiTerminal socket={connectionState.socket} />}
        </div>

        {/* Right Column: File Browser */}
        <div className="w-full h-1/2 md:w-1/2 md:h-full bg-gray-50">
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