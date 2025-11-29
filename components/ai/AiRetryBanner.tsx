import React from 'react'
import { ExclamationCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline'

interface AiRetryBannerProps {
  attempt: number
  maxAttempts: number
  error: string | null
  onDismiss: () => void
  onRetry?: () => void
}

export function AiRetryBanner({
  attempt,
  maxAttempts,
  error,
  onDismiss,
  onRetry
}: AiRetryBannerProps) {
  // Don't show anything if we're not retrying or no error to show
  if (attempt === 0 && !error) {
    return null
  }

  const isRetrying = attempt > 0 && (maxAttempts === Infinity || attempt <= maxAttempts) && !error
  const hasFailed = maxAttempts !== Infinity && attempt >= maxAttempts && error

  return (
    <div className="fixed bottom-6 right-6 max-w-md z-50 animate-in slide-in-from-bottom-5">
      <div className={`rounded-lg shadow-lg border p-4 ${hasFailed
        ? 'bg-red-50 border-red-200'
        : isRetrying
          ? 'bg-blue-50 border-blue-200'
          : 'bg-white border-gray-200'
        }`}>
        <div className="flex items-start gap-3">
          {hasFailed ? (
            <ExclamationCircleIcon className="h-6 w-6 text-red-500 flex-shrink-0" />
          ) : isRetrying ? (
            <ArrowPathIcon className="h-6 w-6 text-blue-500 flex-shrink-0 animate-spin" />
          ) : null}

          <div className="flex-1 min-w-0">
            {isRetrying && (
              <>
                <h3 className="text-sm font-medium text-gray-900">
                  Connecting {maxAttempts === Infinity ? `(Attempt ${attempt})` : `(${attempt}/${maxAttempts})`}...
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Attempting to establish SSH connection
                </p>
              </>
            )}

            {hasFailed && (
              <>
                <h3 className="text-sm font-medium text-red-900">
                  Connection Failed ({maxAttempts}/{maxAttempts})
                </h3>
                <p className="text-sm text-red-700 mt-1 break-words">
                  {error || 'Unable to establish connection after multiple attempts'}
                </p>
                {onRetry && (
                  <button
                    onClick={onRetry}
                    className="mt-2 text-sm font-medium text-red-700 hover:text-red-800 underline"
                  >
                    Try Again
                  </button>
                )}
              </>
            )}
          </div>

          <button
            onClick={onDismiss}
            className="text-gray-400 hover:text-gray-600 flex-shrink-0"
            aria-label="Dismiss"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
