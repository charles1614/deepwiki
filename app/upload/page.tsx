'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { WithNavigation } from '@/components/layout/WithNavigation'
import { EnhancedWikiUpload } from '@/components/EnhancedWikiUpload'

interface Wiki {
  id: string
  title: string
  slug: string
  description: string
}

export default function UploadPage() {
  const router = useRouter()

  const handleUploadSuccess = (wiki: Wiki) => {
    // Redirect to the uploaded wiki
    router.push(`/wiki/${wiki.slug}`)
  }

  return (
    <ProtectedRoute>
      <WithNavigation>
        <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">
                Upload Wiki Documentation
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                Upload markdown files to create a new wiki. Support for Mermaid diagrams, syntax highlighting, and more.
              </p>
            </div>

            <EnhancedWikiUpload onUploadSuccess={handleUploadSuccess} />
          </div>
        </div>
      </WithNavigation>
    </ProtectedRoute>
  )
}