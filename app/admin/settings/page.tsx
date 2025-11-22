'use client'

import { useState, useEffect } from 'react'
import { getSystemSettings, updateSystemSetting } from '@/app/actions/settings'

export default function SystemSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const data = await getSystemSettings()
      setSettings(data)
    } catch (error) {
      console.error('Failed to load settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')

    try {
      // Save all settings
      await Promise.all(
        Object.entries(settings).map(([key, value]) =>
          updateSystemSetting(key, value)
        )
      )
      setMessage('Settings saved successfully')
    } catch (error) {
      console.error('Failed to save settings:', error)
      setMessage('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  if (loading) return <div className="p-4">Loading...</div>

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">System Settings</h1>

      {message && (
        <div className={`p-4 mb-6 rounded-md ${message.includes('Failed') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Site Name
          </label>
          <input
            type="text"
            value={settings['site_name'] || ''}
            onChange={(e) => handleChange('site_name', e.target.value)}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="DeepWiki"
          />
          <p className="mt-1 text-sm text-gray-500">The name of your wiki instance.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Registration Enabled
          </label>
          <select
            value={settings['registration_enabled'] || 'true'}
            onChange={(e) => handleChange('registration_enabled', e.target.value)}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
          <p className="mt-1 text-sm text-gray-500">Allow new users to register.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Welcome Message
          </label>
          <textarea
            value={settings['welcome_message'] || ''}
            onChange={(e) => handleChange('welcome_message', e.target.value)}
            rows={3}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="Welcome to DeepWiki!"
          />
          <p className="mt-1 text-sm text-gray-500">Message displayed on the dashboard.</p>
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={saving}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  )
}
