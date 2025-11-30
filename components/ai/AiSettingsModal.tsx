'use client'

import React, { useState, useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { retrieveConnectionSettings, preserveConnectionSettings } from '@/lib/ai/aiStorage'

interface AiSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (settings: any) => void
  currentMode: 'web' | 'proxy'
}

export function AiSettingsModal({ isOpen, onClose, onSave, currentMode }: AiSettingsModalProps) {
  const [formData, setFormData] = useState({
    webHost: '',
    webPort: '22',
    webUsername: '',
    webPassword: '',
    sshHost: '',
    sshPort: '22',
    sshUsername: '',
    sshPassword: '',
    anthropicBaseUrl: '',
    anthropicAuthToken: '',
    proxyUrl: ''
  })
  // Mode is now controlled by parent via currentMode prop
  const [hasSavedWebPassword, setHasSavedWebPassword] = useState(false)
  const [hasSavedSshPassword, setHasSavedSshPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadSettings()
    }
  }, [isOpen])

  const loadSettings = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/ai/ssh-settings')
      if (res.ok) {
        const data = await res.json()
        if (data) {
          setFormData({
            webHost: data.webHost || '',
            webPort: String(data.webPort || '22'),
            webUsername: data.webUsername || '',
            webPassword: '', // Don't show password
            sshHost: data.sshHost || '',
            sshPort: String(data.sshPort || '22'),
            sshUsername: data.sshUsername || '',
            sshPassword: '', // Don't show password
            anthropicBaseUrl: data.anthropicBaseUrl || '',
            anthropicAuthToken: '', // Don't show token
            proxyUrl: data.proxyUrl || ''
          })
          if (data.connectionMode) {
            // We don't set local mode state anymore, just use the prop for display logic if needed
            // But we might want to notify parent if DB has different mode? 
            // For now, assume parent (AiPage) handles mode loading.
          }
          setHasSavedWebPassword(data.hasWebPassword)
          setHasSavedSshPassword(data.hasSshPassword)
        }
      }
    } catch (err) {
      console.error('Failed to load settings:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const res = await fetch('/api/ai/ssh-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, connectionMode: currentMode })
      })

      if (!res.ok) {
        throw new Error(await res.text())
      }

      const { id } = await res.json()
      console.log('AiSettingsModal: Settings saved, calling onSave')
      onSave({ ...formData, connectionId: id, connectionMode: currentMode })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={onClose}></div>
        </div>
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">SSH Connection Settings</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Close"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Web Server Settings */}
              {currentMode === 'web' && (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    Web Server Connection
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Web Host</label>
                      <input
                        type="text"
                        value={formData.webHost}
                        onChange={(e) => setFormData({ ...formData, webHost: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        placeholder="e.g., 192.168.1.100"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Web Port</label>
                        <input
                          type="number"
                          value={formData.webPort}
                          onChange={(e) => setFormData({ ...formData, webPort: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          placeholder="22"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Web Username</label>
                        <input
                          type="text"
                          value={formData.webUsername}
                          onChange={(e) => setFormData({ ...formData, webUsername: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          placeholder="root"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Web Password</label>
                      <input
                        type="password"
                        value={formData.webPassword}
                        onChange={(e) => setFormData({ ...formData, webPassword: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        placeholder={formData.webPassword || hasSavedWebPassword ? '••••••••' : 'Required'}
                        required={!formData.webPassword && !hasSavedWebPassword}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* SSH Proxy Settings */}
              {currentMode === 'proxy' && (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    SSH Proxy Connection
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Proxy URL</label>
                      <input
                        type="text"
                        value={formData.proxyUrl}
                        onChange={(e) => setFormData({ ...formData, proxyUrl: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        placeholder="e.g., http://your-china-server:3001"
                        required
                      />
                      <p className="mt-1 text-[10px] text-gray-500">
                        Required for direct connection.
                        {!formData.proxyUrl.match(/:\d+$/) && formData.proxyUrl.length > 0 && (
                          <span className="text-amber-600 font-medium ml-1">
                            Warning: URL usually requires a port (e.g., :3001)
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="border-t border-gray-200 my-3"></div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">SSH Host</label>
                      <input
                        type="text"
                        value={formData.sshHost}
                        onChange={(e) => setFormData({ ...formData, sshHost: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        placeholder="e.g., 10.0.0.5 (Internal IP)"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">SSH Port</label>
                        <input
                          type="number"
                          value={formData.sshPort}
                          onChange={(e) => setFormData({ ...formData, sshPort: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          placeholder="22"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">SSH Username</label>
                        <input
                          type="text"
                          value={formData.sshUsername}
                          onChange={(e) => setFormData({ ...formData, sshUsername: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          placeholder="root"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">SSH Password</label>
                      <input
                        type="password"
                        value={formData.sshPassword}
                        onChange={(e) => setFormData({ ...formData, sshPassword: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        placeholder={formData.sshPassword || hasSavedSshPassword ? '••••••••' : 'Required'}
                        required={!formData.sshPassword && !hasSavedSshPassword}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Anthropic Integration (Optional)</h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Base URL</label>
                    <input
                      type="text"
                      value={formData.anthropicBaseUrl}
                      onChange={(e) => setFormData({ ...formData, anthropicBaseUrl: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="https://api.anthropic.com"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Auth Token</label>
                    <input
                      type="password"
                      value={formData.anthropicAuthToken}
                      onChange={(e) => setFormData({ ...formData, anthropicAuthToken: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder={formData.anthropicAuthToken ? '••••••••' : 'Leave empty to keep unchanged'}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50"
                  disabled={isLoading}
                >
                  {isLoading ? 'Saving...' : 'Save & Connect'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
