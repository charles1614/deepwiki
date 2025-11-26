'use client'

import React from 'react'
import { XMarkIcon, ArrowPathIcon, ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline'

interface AiReconnectionBannerProps {
  status: 'success' | 'error' | null
  onDismiss: () => void
  onRetry: () => void
  message?: string
}

export function AiReconnectionBanner({ status, onDismiss, onRetry, message }: AiReconnectionBannerProps) {
  const getBannerContent = () => {
    switch (status) {
      case 'success':
        return {
          bgClass: 'bg-green-50 border-green-200',
          textClass: 'text-green-800',
          icon: CheckCircleIcon,
          title: 'Connection Restored',
          description: message || 'Your AI terminal connection has been successfully restored.',
          showRetry: false
        }
      case 'error':
        return {
          bgClass: 'bg-red-50 border-red-200',
          textClass: 'text-red-800',
          icon: ExclamationTriangleIcon,
          title: 'Connection Failed',
          description: message || 'Failed to restore your AI terminal connection. Please try reconnecting.',
          showRetry: true
        }
      default:
        return {
          bgClass: 'bg-blue-50 border-blue-200',
          textClass: 'text-blue-800',
          icon: ArrowPathIcon,
          title: 'Restoring Connection',
          description: 'Attempting to restore your AI terminal connection...',
          showRetry: false
        }
    }
  }

  const bannerContent = getBannerContent()
  const Icon = bannerContent.icon

  return (
    <div
      className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full mx-4"
      data-testid="ai-reconnection-banner"
    >
      <div className={`${bannerContent.bgClass} border rounded-lg shadow-lg p-4 ${bannerContent.textClass}`}>
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <Icon className={`h-6 w-6 ${status === null ? 'animate-spin' : ''}`} />
          </div>

          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium">{bannerContent.title}</h3>
            <p className="text-sm mt-1 opacity-90">{bannerContent.description}</p>

            {bannerContent.showRetry && (
              <div className="mt-3 flex gap-2">
                <button
                  onClick={onRetry}
                  className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                  data-testid="ai-retry-connection"
                >
                  <ArrowPathIcon className="h-4 w-4 mr-1" />
                  Try Again
                </button>
              </div>
            )}
          </div>

          <div className="ml-4 flex-shrink-0">
            <button
              onClick={onDismiss}
              className={`inline-flex rounded-md p-1.5 hover:bg-black hover:bg-opacity-10 transition-colors ${bannerContent.textClass}`}
              data-testid="ai-dismiss-banner"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Loading banner component for ongoing operations
export function AiLoadingBanner({ message = 'Processing...' }: { message?: string }) {
  return (
    <AiReconnectionBanner
      status={null}
      onDismiss={() => {}}
      onRetry={() => {}}
      message={message}
    />
  )
}

// Success banner component
export function AiSuccessBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <AiReconnectionBanner
      status="success"
      onDismiss={onDismiss}
      onRetry={() => {}}
      message={message}
    />
  )
}

// Error banner component
export function AiErrorBanner({ message, onDismiss, onRetry }: { message: string; onDismiss: () => void; onRetry: () => void }) {
  return (
    <AiReconnectionBanner
      status="error"
      onDismiss={onDismiss}
      onRetry={onRetry}
      message={message}
    />
  )
}