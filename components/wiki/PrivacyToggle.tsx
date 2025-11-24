'use client'

import React, { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/Button'

interface PrivacyToggleProps {
  wikiSlug: string
  currentPrivacy: boolean
  isOwner: boolean
  onPrivacyChange?: (isPublic: boolean) => void
  className?: string
}

export function PrivacyToggle({
  wikiSlug,
  currentPrivacy,
  isOwner,
  onPrivacyChange,
  className = ''
}: PrivacyToggleProps) {
  const { data: session } = useSession()
  const [isPublic, setIsPublic] = useState(currentPrivacy)
  const [isUpdating, setIsUpdating] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  if (!isOwner || !session) {
    return (
      <div
        data-testid="privacy-indicator"
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isPublic
          ? 'bg-green-100 text-green-800 border border-green-200'
          : 'bg-gray-100 text-gray-800 border border-gray-200'
          } ${className}`}
      >
        <span className="mr-1">
          {isPublic ? (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 16v-2a2 2 0 00-2-2 2 2 0 01-2-2 2 2 0 00-1.668-1.973z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
          )}
        </span>
        <span data-testid="privacy-status">
          {isPublic ? 'Public' : 'Private'}
        </span>
      </div>
    )
  }

  const handleToggleClick = () => {
    setShowConfirmDialog(true)
  }

  const handleConfirmPrivacyChange = async () => {
    setIsUpdating(true)
    setShowConfirmDialog(false)

    try {
      const response = await fetch(`/api/wiki/${wikiSlug}/privacy`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isPublic: !isPublic }),
      })

      if (!response.ok) {
        throw new Error('Failed to update privacy setting')
      }

      const data = await response.json()
      setIsPublic(!isPublic)
      onPrivacyChange?.(!isPublic)

      // Show success message
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)

      console.log(data.message)

    } catch (error) {
      console.error('Error updating privacy:', error)
      // Handle error (show toast message)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleCancelPrivacyChange = () => {
    setShowConfirmDialog(false)
  }

  return (
    <>
      <Button
        data-testid="privacy-toggle"
        variant="secondary"
        size="sm"
        onClick={handleToggleClick}
        disabled={isUpdating}
        loading={isUpdating}
        className={className}
      >
        <span className="flex items-center">
          {isPublic ? (
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 16v-2a2 2 0 00-2-2 2 2 0 01-2-2 2 2 0 00-1.668-1.973z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
          )}
          {isPublic ? 'Public' : 'Private'}
        </span>
      </Button>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          data-testid="confirm-privacy-dialog"
        >
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
            <h3 className="text-lg font-medium mb-4">
              {isPublic ? 'Make Wiki Private?' : 'Make Wiki Public?'}
            </h3>

            <div className="mb-6">
              {isPublic ? (
                <p className="text-gray-600">
                  This will make your wiki private and only visible to you. Public users will no longer be able to access this wiki.
                </p>
              ) : (
                <p className="text-gray-600">
                  This will make your wiki public and visible to anyone with the link. All users will be able to read this wiki.
                </p>
              )}
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                variant="secondary"
                onClick={handleCancelPrivacyChange}
                disabled={isUpdating}
                data-testid="cancel-privacy-change"
              >
                Cancel
              </Button>
              <Button
                variant={isPublic ? "destructive" : "primary"}
                onClick={handleConfirmPrivacyChange}
                disabled={isUpdating}
                loading={isUpdating}
                data-testid={isPublic ? "confirm-private-button" : "confirm-public-button"}
              >
                {isPublic ? 'Make Private' : 'Make Public'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {showSuccess && (
        <div
          className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg z-50 flex items-center"
          data-testid="privacy-success-toast"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Privacy settings updated successfully
        </div>
      )}
    </>
  )
}