'use client'

import React, { useState, useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { retrieveConnectionSettings, preserveConnectionSettings } from '@/lib/ai/aiStorage'

interface AiSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (settings: any) => void
}

export function AiSettingsModal({ isOpen, onClose, onSave }: AiSettingsModalProps) {
  const [host, setHost] = useState('')
  const [port, setPort] = useState('22')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [anthropicBaseUrl, setAnthropicBaseUrl] = useState('')
  const [anthropicAuthToken, setAnthropicAuthToken] = useState('')

  useEffect(() => {
    if (isOpen) {
      const savedSettings = retrieveConnectionSettings()
      if (savedSettings) {
        setHost(savedSettings.host || '')
        setPort(String(savedSettings.port || '22'))
        setUsername(savedSettings.username || '')
        setPassword(savedSettings.password || '')
        setAnthropicBaseUrl(savedSettings.anthropicBaseUrl || '')
        setAnthropicAuthToken(savedSettings.anthropicAuthToken || '')
      } else {
        setHost('')
        setPort('22')
        setUsername('')
        setPassword('')
        setAnthropicBaseUrl('')
        setAnthropicAuthToken('')
      }
    }
  }, [isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('AiSettingsModal: Form submitted', { host, port, username, password: '***' })
    const settings = {
      host,
      port: Number(port),
      username,
      password,
      anthropicBaseUrl,
      anthropicAuthToken
    }
    console.log('AiSettingsModal: Saving settings', { ...settings, password: '***', anthropicAuthToken: '***' })
    preserveConnectionSettings(settings)
    console.log('AiSettingsModal: Calling onSave callback')
    onSave(settings)
    console.log('AiSettingsModal: Closing modal')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={onClose}></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">SSH Connection Settings</h3>
              <button
                onClick={onClose}
                className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Host</label>
                <input
                  type="text"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="localhost"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Port</label>
                <input
                  type="number"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="22"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="root"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="••••••••"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Anthropic Base URL (Optional)</label>
                <input
                  type="text"
                  value={anthropicBaseUrl}
                  onChange={(e) => setAnthropicBaseUrl(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="https://api.anthropic.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Anthropic Auth Token (Optional)</label>
                <input
                  type="password"
                  value={anthropicAuthToken}
                  onChange={(e) => setAnthropicAuthToken(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="sk-..."
                />
              </div>

              <div className="mt-5 sm:mt-6">
                <button
                  type="submit"
                  className="inline-flex justify-center w-full rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm"
                >
                  Save & Connect
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
