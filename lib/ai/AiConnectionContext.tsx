'use client'

import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
export interface TerminalState {
  buffer: string[]
  cursorPosition: { x: number; y: number }
  dimensions: { cols: number; rows: number }
}

export interface FileBrowserState {
  currentPath: string
  selectedFile: string | null
  scrollPosition: number
}

export interface AiConnectionState {
  socket: Socket | null
  isConnected: boolean
  isConnecting: boolean
  connectionStatus: 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error' | 'preserved' | 'restoring'
  lastConnected: number | null
  sessionId: string | null
  navigationStartTime: number | null
  terminalState: TerminalState | null
  fileBrowserState: FileBrowserState | null
  error: string | null
  reconnectAttempts: number
}

type AiConnectionAction =
  | { type: 'SET_SOCKET'; payload: Socket | null }
  | { type: 'SET_CONNECTING'; payload: boolean }
  | { type: 'SET_CONNECTION_STATUS'; payload: AiConnectionState['connectionStatus'] }
  | { type: 'SET_CONNECTED'; payload: boolean }
  | { type: 'SET_SESSION_ID'; payload: string | null }
  | { type: 'SET_NAVIGATION_START_TIME'; payload: number | null }
  | { type: 'SET_TERMINAL_STATE'; payload: TerminalState | null }
  | { type: 'SET_FILE_BROWSER_STATE'; payload: FileBrowserState | null }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'INCREMENT_RECONNECT_ATTEMPTS' }
  | { type: 'RESET_RECONNECT_ATTEMPTS' }
  | { type: 'RESET_STATE' }

const initialState: AiConnectionState = {
  socket: null,
  isConnected: false,
  isConnecting: false,
  connectionStatus: 'idle',
  lastConnected: null,
  sessionId: null,
  navigationStartTime: null,
  terminalState: null,
  fileBrowserState: null,
  error: null,
  reconnectAttempts: 0,
}

function aiConnectionReducer(state: AiConnectionState, action: AiConnectionAction): AiConnectionState {
  switch (action.type) {
    case 'SET_SOCKET':
      return { ...state, socket: action.payload }
    case 'SET_CONNECTING':
      return { ...state, isConnecting: action.payload }
    case 'SET_CONNECTION_STATUS':
      // Keep isConnecting in sync with connectionStatus
      const isConnecting = action.payload === 'connecting' || action.payload === 'restoring'
      return {
        ...state,
        connectionStatus: action.payload,
        isConnecting: isConnecting
      }
    case 'SET_CONNECTED':
      return {
        ...state,
        isConnected: action.payload,
        lastConnected: action.payload ? Date.now() : null,
        error: action.payload ? null : state.error
      }
    case 'SET_SESSION_ID':
      return { ...state, sessionId: action.payload }
    case 'SET_NAVIGATION_START_TIME':
      return { ...state, navigationStartTime: action.payload }
    case 'SET_TERMINAL_STATE':
      return { ...state, terminalState: action.payload }
    case 'SET_FILE_BROWSER_STATE':
      return { ...state, fileBrowserState: action.payload }
    case 'SET_ERROR':
      return { ...state, error: action.payload }
    case 'INCREMENT_RECONNECT_ATTEMPTS':
      return { ...state, reconnectAttempts: state.reconnectAttempts + 1 }
    case 'RESET_RECONNECT_ATTEMPTS':
      return { ...state, reconnectAttempts: 0 }
    case 'RESET_STATE':
      return { ...initialState }
    default:
      return state
  }
}

const AiConnectionContext = createContext<{
  state: AiConnectionState
  dispatch: React.Dispatch<AiConnectionAction>
  connect: (settings?: { host: string; port: number; username: string; password: string }) => Promise<void>
  disconnect: () => Promise<void>
  preserveConnection: () => void
  restoreConnection: () => Promise<boolean>
  pauseConnection: () => void
  resumeConnection: () => void
} | null>(null)

export function AiConnectionProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(aiConnectionReducer, initialState)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const connect = async (settings?: {
    host: string
    port: number
    username: string
    password: string
    anthropicBaseUrl?: string
    anthropicAuthToken?: string
  }) => {
    try {
      // Clean up any existing socket first
      if (state.socket) {
        state.socket.removeAllListeners()
        state.socket.disconnect()
      }

      dispatch({ type: 'SET_CONNECTING', payload: true })
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'connecting' })
      dispatch({ type: 'RESET_RECONNECT_ATTEMPTS' })
      dispatch({ type: 'SET_ERROR', payload: null })

      // Try connecting with the custom path
      // Note: The socket.io server will be initialized automatically when the first client connects
      const socket = io(window.location.origin, {
        path: '/api/socket',
        transports: ['websocket', 'polling'], // Fallback to polling if websocket fails
        timeout: 10000,
        reconnection: false, // We'll handle reconnection manually
        autoConnect: true,
      })

      dispatch({ type: 'SET_SOCKET', payload: socket })

      // Connection timeout - if socket doesn't connect within 10 seconds, fail
      const connectionTimeout = setTimeout(() => {
        if (!socket.connected) {
          socket.disconnect()
          dispatch({ type: 'SET_ERROR', payload: 'Connection timeout: Unable to reach server' })
          // Set status to 'error' - reducer will automatically set isConnecting to false
          dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'error' })
        }
      }, 10000)

      // Set up ALL event handlers BEFORE the socket might connect
      // This ensures we don't miss any events

      socket.on('ssh-ready', (data: { sessionId: string }) => {
        console.log('Received ssh-ready event:', data)
        clearTimeout(connectionTimeout)
        if (sshTimeout) {
          clearTimeout(sshTimeout)
          sshTimeout = null
        }
        sshConnectEmitted = false // Reset flag to allow reconnection if needed
        console.log('SSH connection ready, sessionId:', data.sessionId)
        dispatch({ type: 'SET_SESSION_ID', payload: data.sessionId })
        dispatch({ type: 'SET_ERROR', payload: null }) // Clear any previous errors
        // Status is already set to 'connected' in the socket connect handler; no UI change needed here
        console.log('SSH connection fully established')
      })

      socket.on('ssh-error', (error: string) => {
        clearTimeout(connectionTimeout)
        if (sshTimeout) {
          clearTimeout(sshTimeout)
          sshTimeout = null
        }
        sshConnectEmitted = false // Reset flag to allow retry
        console.error('SSH error:', error)
        dispatch({ type: 'SET_ERROR', payload: error })
        // Set status to 'error' - reducer will automatically set isConnecting to false
        dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'error' })
      })

      socket.on('ssh-close', () => {
        clearTimeout(connectionTimeout)
        console.log('SSH connection closed')
        dispatch({ type: 'SET_CONNECTED', payload: false })
        // Set status to 'disconnected' - reducer will automatically set isConnecting to false
        dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'disconnected' })
        dispatch({ type: 'SET_SESSION_ID', payload: null })
      })

      // SSH connection timeout - if SSH doesn't connect within 30 seconds, fail
      let sshTimeout: NodeJS.Timeout | null = null
      let sshConnectEmitted = false // Flag to prevent multiple SSH connection attempts

      // Helper function to emit SSH connect and set timeout
      const emitSshConnect = () => {
        // Prevent multiple SSH connection attempts
        if (sshConnectEmitted) {
          console.log('SSH connect already emitted, skipping duplicate call')
          return
        }

        if (settings) {
          sshConnectEmitted = true
          console.log('Emitting ssh-connect with settings:', {
            ...settings,
            password: '***',
            anthropicAuthToken: settings.anthropicAuthToken ? '***' : undefined
          })

          // Clear any existing SSH timeout before setting a new one
          if (sshTimeout) {
            clearTimeout(sshTimeout)
            sshTimeout = null
          }

          socket.emit('ssh-connect', settings)
          console.log('ssh-connect event emitted; SSH connection establishing in background')

          // Set SSH timeout for better error feedback
          sshTimeout = setTimeout(() => {
            console.error('SSH connection timeout - no ssh-ready or ssh-error received')
            dispatch({ type: 'SET_ERROR', payload: 'SSH connection timeout: Server did not respond' })
            // Keep status as 'connected' (socket is still up), but surface error text in UI
            sshTimeout = null
          }, 30000) // 30 seconds for SSH connection
        } else {
          console.log('No SSH settings, leaving connection in connected state')
        }
      }

      socket.on('connect', () => {
        clearTimeout(connectionTimeout)
        console.log('Socket.io connected, socket.id:', socket.id)
        dispatch({ type: 'SET_CONNECTED', payload: true })
        // Consider the connection active as soon as Socket.IO is connected
        dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'connected' })
        console.log('State updated to connected (socket active); SSH tunnel will finish in background if configured')

        emitSshConnect()
      })

      // Check if socket is already connected (race condition)
      if (socket.connected) {
        console.log('Socket already connected when handlers were set up')
        clearTimeout(connectionTimeout)
        dispatch({ type: 'SET_CONNECTED', payload: true })
        dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'connected' })
        emitSshConnect()
      }

      socket.on('connect_error', (error: Error) => {
        clearTimeout(connectionTimeout)
        console.error('Socket.io connection error:', error)
        dispatch({ type: 'SET_ERROR', payload: `Connection failed: ${error.message || 'Unable to connect to server'}` })
        // Set status to 'error' - reducer will automatically set isConnecting to false
        dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'error' })
        socket.disconnect()
      })

      socket.on('disconnect', (reason: string) => {
        clearTimeout(connectionTimeout)
        console.log('Socket.io disconnected:', reason)
        dispatch({ type: 'SET_CONNECTED', payload: false })

        // Only attempt reconnection if it was an unexpected disconnect
        if (reason === 'io server disconnect' || reason === 'transport close') {
          // Set status to 'disconnected' - reducer will automatically set isConnecting to false
          dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'disconnected' })
        } else if (state.connectionStatus !== 'disconnected' && state.reconnectAttempts < 5) {
          dispatch({ type: 'INCREMENT_RECONNECT_ATTEMPTS' })
          const timeout = Math.min(1000 * Math.pow(2, state.reconnectAttempts), 16000)

          reconnectTimeoutRef.current = setTimeout(() => {
            connect(settings)
          }, timeout)
        }
      })

    } catch (error) {
      console.error('Error in connect function:', error)
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Connection failed' })
      // Set status to 'error' - reducer will automatically set isConnecting to false
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'error' })
    }
  }

  const disconnect = async () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }

    if (state.socket) {
      state.socket.emit('ssh-disconnect')
      state.socket.disconnect()
      dispatch({ type: 'SET_SOCKET', payload: null })
    }

    dispatch({ type: 'SET_CONNECTED', payload: false })
    dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'disconnected' })
    dispatch({ type: 'SET_SESSION_ID', payload: null })
    dispatch({ type: 'SET_TERMINAL_STATE', payload: null })
    dispatch({ type: 'SET_FILE_BROWSER_STATE', payload: null })
  }

  const preserveConnection = () => {
    if (state.socket && state.isConnected) {
      state.socket.emit('navigation-pause')
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'preserved' })
      dispatch({ type: 'SET_NAVIGATION_START_TIME', payload: Date.now() })
    }
  }

  const pauseConnection = () => {
    if (state.socket && state.isConnected) {
      state.socket.emit('navigation-pause')
    }
  }

  const resumeConnection = () => {
    // Resume if socket exists and connection is preserved, or if socket exists and we have navigation timestamp
    // (in case component remounted and status was reset)
    if (state.socket) {
      if (state.connectionStatus === 'preserved') {
        console.log('Resuming preserved connection (status is preserved)')
        state.socket.emit('navigation-resume')
        dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'connected' })
        dispatch({ type: 'SET_CONNECTED', payload: true })
        dispatch({ type: 'SET_NAVIGATION_START_TIME', payload: null })
      } else {
        // Check if we have a navigation timestamp (connection was preserved but status reset)
        try {
          const stored = sessionStorage.getItem('ai-navigation-timestamp')
          if (stored) {
            const timestamp = JSON.parse(stored)
            if (timestamp && timestamp.startTime) {
              // We have a preserved connection, restore the status and resume
              console.log('Resuming connection with stored navigation timestamp')
              dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'preserved' })
              state.socket.emit('navigation-resume')
              dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'connected' })
              dispatch({ type: 'SET_CONNECTED', payload: true })
              dispatch({ type: 'SET_NAVIGATION_START_TIME', payload: null })
            }
          } else if (state.isConnected && state.socket.connected) {
            // Socket is connected but status might not be preserved - just ensure status is correct
            console.log('Socket is connected, ensuring status is correct')
            dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'connected' })
          }
        } catch (error) {
          console.error('Error checking navigation timestamp:', error)
        }
      }
    } else {
      console.log('Cannot resume: socket not available')
    }
  }

  const restoreConnection = async (): Promise<boolean> => {
    if (!state.socket) {
      return false
    }

    try {
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'restoring' })

      return new Promise((resolve) => {
        state.socket!.emit('navigation-restore', {
          sessionId: state.sessionId,
          terminalState: state.terminalState,
          fileBrowserState: state.fileBrowserState
        })

        const timeout = setTimeout(() => {
          dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'error' })
          dispatch({ type: 'SET_ERROR', payload: 'Connection restoration timeout' })
          resolve(false)
        }, 10000)

        state.socket!.once('ssh-restored', () => {
          clearTimeout(timeout)
          dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'connected' })
          dispatch({ type: 'SET_NAVIGATION_START_TIME', payload: null })
          resolve(true)
        })

        state.socket!.once('ssh-restore-failed', () => {
          clearTimeout(timeout)
          dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'error' })
          dispatch({ type: 'SET_ERROR', payload: 'Failed to restore connection' })
          resolve(false)
        })
      })
    } catch (error) {
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'error' })
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Restoration failed' })
      return false
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [])

  const value = {
    state,
    dispatch,
    connect,
    disconnect,
    preserveConnection,
    restoreConnection,
    pauseConnection,
    resumeConnection,
  }

  return (
    <AiConnectionContext.Provider value={value}>
      {children}
    </AiConnectionContext.Provider>
  )
}

export function useAiConnection() {
  const context = useContext(AiConnectionContext)
  if (!context) {
    throw new Error('useAiConnection must be used within AiConnectionProvider')
  }
  return context
}