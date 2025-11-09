'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { WithNavigation } from '@/components/layout/WithNavigation'
import { WikiUpload } from '@/components/WikiUpload'

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
        <div className="max-w-7xl mx-auto pt-3 pb-6 sm:px-6 lg:px-8">
          <div className="px-4 pt-3 pb-6 sm:px-0">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">
                Upload Wiki Documentation
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                Upload markdown files to create a new wiki. Support for Mermaid diagrams, syntax highlighting, and more.
                <br />
                <span className="text-xs text-gray-500">
                  This is the dedicated upload location. You can also access upload from the navigation tab or dashboard quick actions.
                </span>
              </p>
            </div>

            <WikiUpload onUploadSuccess={handleUploadSuccess} />
          </div>
        </div>
      </WithNavigation>
    </ProtectedRoute>
  )
}