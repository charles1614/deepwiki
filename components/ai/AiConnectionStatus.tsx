'use client'

import React from 'react'
import { useAiConnection } from '@/lib/ai/AiConnectionContext'

interface AiConnectionStatusProps {
  className?: string
  showText?: boolean
  compact?: boolean
}

export function AiConnectionStatus({
  className = '',
  showText = true,
  compact = false
}: AiConnectionStatusProps) {
  const { state } = useAiConnection()

  const getStatusColor = () => {
    switch (state.connectionStatus) {
      case 'connected':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'connecting':
      case 'restoring':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'preserved':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'disconnected':
        return 'text-gray-600 bg-gray-50 border-gray-200'
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'idle':
      default:
        return 'text-gray-400 bg-gray-50 border-gray-200'
    }
  }

  const getStatusIcon = () => {
    switch (state.connectionStatus) {
      case 'connected':
        return (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <circle cx="10" cy="10" r="3" />
          </svg>
        )
      case 'connecting':
      case 'restoring':
        return (
          <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )
      case 'preserved':
        return (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        )
      case 'disconnected':
        return (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        )
      case 'error':
        return (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      default:
        return (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
    }
  }

  const getStatusText = () => {
    switch (state.connectionStatus) {
      case 'connected':
        return 'Connected'
      case 'connecting':
        return state.reconnectAttempts > 0 ? `Reconnecting (${state.reconnectAttempts}/5)` : 'Connecting'
      case 'restoring':
        return 'Restoring'
      case 'preserved':
        const duration = state.navigationStartTime ? Date.now() - state.navigationStartTime : 0
        return `Preserved (${Math.floor(duration / 1000)}s)`
      case 'disconnected':
        return 'Disconnected'
      case 'error':
        return state.error || 'Error'
      case 'idle':
      default:
        return 'Idle'
    }
  }

  const getTooltipText = () => {
    if (state.lastConnected) {
      const lastConnected = new Date(state.lastConnected).toLocaleTimeString()
      return `Last connected: ${lastConnected}\n${getStatusText()}`
    }
    return getStatusText()
  }

  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-1 px-1 py-0.5 rounded-full border text-xs ${getStatusColor()} ${className}`}
        title={getTooltipText()}
        data-testid="ai-connection-status-compact"
      >
        {getStatusIcon()}
      </div>
    )
  }

  return (
    <div
      className={`inline-flex items-center gap-2 px-2 py-1 rounded-md border text-sm ${getStatusColor()} ${className}`}
      title={getTooltipText()}
      data-testid="ai-connection-status"
    >
      {getStatusIcon()}
      {showText && (
        <span className="whitespace-nowrap">
          {getStatusText()}
        </span>
      )}
      {state.connectionStatus === 'connecting' && state.reconnectAttempts > 0 && (
        <span className="text-xs opacity-75">
          ({state.reconnectAttempts}/5)
        </span>
      )}
    </div>
  )
}

// Compact version for navigation bar
export function AiConnectionStatusIndicator() {
  const { state } = useAiConnection()

  const getIndicatorColor = () => {
    switch (state.connectionStatus) {
      case 'connected':
        return 'bg-green-500'
      case 'connecting':
      case 'restoring':
        return 'bg-yellow-500 animate-pulse'
      case 'preserved':
        return 'bg-blue-500'
      case 'disconnected':
        return 'bg-gray-400'
      case 'error':
        return 'bg-red-500 animate-pulse'
      default:
        return 'bg-gray-300'
    }
  }

  const getTooltipText = () => {
    let text = 'AI Terminal: '
    switch (state.connectionStatus) {
      case 'connected':
        text += 'Connected'
        break
      case 'connecting':
        text += state.reconnectAttempts > 0 ? `Reconnecting (${state.reconnectAttempts}/5)` : 'Connecting'
        break
      case 'restoring':
        text += 'Restoring session'
        break
      case 'preserved':
        const duration = state.navigationStartTime ? Date.now() - state.navigationStartTime : 0
        text += `Connection preserved (${Math.floor(duration / 1000)}s)`
        break
      case 'disconnected':
        text += 'Disconnected'
        break
      case 'error':
        text += state.error || 'Connection error'
        break
      default:
        text += 'Not connected'
    }

    if (state.lastConnected) {
      const lastConnected = new Date(state.lastConnected).toLocaleTimeString()
      text += `\nLast connected: ${lastConnected}`
    }

    return text
  }

  if (state.connectionStatus === 'idle') {
    return null
  }

  return (
    <div
      className={`w-2 h-2 rounded-full ${getIndicatorColor()}`}
      title={getTooltipText()}
      data-testid="ai-connection-indicator"
    />
  )
}