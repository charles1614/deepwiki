'use client'

import React from 'react'

interface ProgressBarProps {
  progress: number
  className?: string
  showPercentage?: boolean
  status?: 'uploading' | 'processing' | 'completed' | 'error'
  message?: string
}

export function ProgressBar({
  progress,
  className = '',
  showPercentage = true,
  status = 'uploading',
  message
}: ProgressBarProps) {
  const statusColors = {
    uploading: 'bg-blue-500',
    processing: 'bg-yellow-500',
    completed: 'bg-green-500',
    error: 'bg-red-500'
  }

  const statusMessages = {
    uploading: message || 'Uploading...',
    processing: message || 'Processing files...',
    completed: message || 'Upload completed!',
    error: message || 'Upload failed'
  }

  return (
    <div className={`w-full ${className}`} data-testid="progress-container">
      {/* Status message */}
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-700" data-testid="progress-status">
          {statusMessages[status]}
        </span>
        {showPercentage && (
          <span className="text-sm font-medium text-gray-500" data-testid="progress-percentage">
            {Math.round(progress)}%
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden" data-testid="progress-bar-bg">
        <div
          className={`h-full rounded-full transition-all duration-300 ease-out ${statusColors[status]}`}
          style={{ width: `${progress}%` }}
          data-testid="progress-bar-fill"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Upload progress"
        />
      </div>

      {/* Additional details for screen readers */}
      <div className="sr-only" role="status" aria-live="polite">
        {statusMessages[status]} {Math.round(progress)}% complete
      </div>
    </div>
  )
}