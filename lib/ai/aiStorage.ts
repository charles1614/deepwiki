import { TerminalState, FileBrowserState } from './AiConnectionContext'

// Constants
const TERMINAL_STATE_KEY = 'ai-terminal-state'
const FILE_BROWSER_STATE_KEY = 'ai-file-browser-state'
const CONNECTION_SETTINGS_KEY = 'ai-connection-settings'
const NAVIGATION_TIMESTAMP_KEY = 'ai-navigation-timestamp'

const MAX_TERMINAL_LINES = 1000
const STATE_EXPIRY_TIME = 30 * 60 * 1000 // 30 minutes

// Types
export interface StoredTerminalState extends TerminalState {
  timestamp: number
}

export interface StoredFileBrowserState extends FileBrowserState {
  timestamp: number
}

export interface NavigationTimestamp {
  startTime: number
  duration?: number
}

// Terminal State Storage
export const preserveTerminalState = (terminal: any): boolean => {
  try {
    if (!terminal || !terminal.buffer) {
      console.warn('Invalid terminal object provided for state preservation')
      return false
    }

    const buffer = terminal.buffer.active
    const state: StoredTerminalState = {
      buffer: [], // We rely on server history for content now
      cursorPosition: {
        x: buffer.cursorX || 0,
        y: buffer.cursorY || 0
      },
      dimensions: {
        cols: terminal.cols || 80,
        rows: terminal.rows || 24
      },
      timestamp: Date.now()
    }

    sessionStorage.setItem(TERMINAL_STATE_KEY, JSON.stringify(state))
    return true
  } catch (error) {
    console.error('Failed to preserve terminal state:', error)
    return false
  }
}

export const retrieveTerminalState = (): StoredTerminalState | null => {
  try {
    const stored = sessionStorage.getItem(TERMINAL_STATE_KEY)
    if (!stored) return null

    const state: StoredTerminalState = JSON.parse(stored)

    // Check if state is expired
    if (Date.now() - state.timestamp > STATE_EXPIRY_TIME) {
      sessionStorage.removeItem(TERMINAL_STATE_KEY)
      return null
    }

    return state
  } catch (error) {
    console.error('Failed to retrieve terminal state:', error)
    sessionStorage.removeItem(TERMINAL_STATE_KEY)
    return null
  }
}

export const clearTerminalState = (): void => {
  try {
    sessionStorage.removeItem(TERMINAL_STATE_KEY)
  } catch (error) {
    console.error('Failed to clear terminal state:', error)
  }
}

// File Browser State Storage
export const preserveFileBrowserState = (
  currentPath: string,
  selectedFile: string | null = null,
  scrollPosition: number = 0
): boolean => {
  try {
    const state: StoredFileBrowserState = {
      currentPath,
      selectedFile,
      scrollPosition,
      timestamp: Date.now()
    }

    sessionStorage.setItem(FILE_BROWSER_STATE_KEY, JSON.stringify(state))
    return true
  } catch (error) {
    console.error('Failed to preserve file browser state:', error)
    return false
  }
}

export const retrieveFileBrowserState = (): StoredFileBrowserState | null => {
  try {
    const stored = sessionStorage.getItem(FILE_BROWSER_STATE_KEY)
    if (!stored) return null

    const state: StoredFileBrowserState = JSON.parse(stored)

    // Check if state is expired
    if (Date.now() - state.timestamp > STATE_EXPIRY_TIME) {
      sessionStorage.removeItem(FILE_BROWSER_STATE_KEY)
      return null
    }

    return state
  } catch (error) {
    console.error('Failed to retrieve file browser state:', error)
    sessionStorage.removeItem(FILE_BROWSER_STATE_KEY)
    return null
  }
}

export const clearFileBrowserState = (): void => {
  try {
    sessionStorage.removeItem(FILE_BROWSER_STATE_KEY)
  } catch (error) {
    console.error('Failed to clear file browser state:', error)
  }
}

// Navigation Timestamp Storage
export const preserveNavigationTimestamp = (startTime: number): boolean => {
  try {
    const timestamp: NavigationTimestamp = {
      startTime
    }

    sessionStorage.setItem(NAVIGATION_TIMESTAMP_KEY, JSON.stringify(timestamp))
    return true
  } catch (error) {
    console.error('Failed to preserve navigation timestamp:', error)
    return false
  }
}

export const retrieveNavigationTimestamp = (): NavigationTimestamp | null => {
  try {
    const stored = sessionStorage.getItem(NAVIGATION_TIMESTAMP_KEY)
    if (!stored) return null

    return JSON.parse(stored)
  } catch (error) {
    console.error('Failed to retrieve navigation timestamp:', error)
    return null
  }
}

export const clearNavigationTimestamp = (): void => {
  try {
    sessionStorage.removeItem(NAVIGATION_TIMESTAMP_KEY)
  } catch (error) {
    console.error('Failed to clear navigation timestamp:', error)
  }
}

// Connection Settings (localStorage for persistence across sessions)
export interface ConnectionSettings {
  host: string
  port: number
  username: string
  password: string
  anthropicBaseUrl?: string
  anthropicAuthToken?: string
}

export const preserveConnectionSettings = (settings: ConnectionSettings): boolean => {
  try {
    localStorage.setItem(CONNECTION_SETTINGS_KEY, JSON.stringify(settings))
    return true
  } catch (error) {
    console.error('Failed to preserve connection settings:', error)
    return false
  }
}

export const retrieveConnectionSettings = (): ConnectionSettings | null => {
  try {
    const stored = localStorage.getItem(CONNECTION_SETTINGS_KEY)
    if (!stored) return null

    return JSON.parse(stored)
  } catch (error) {
    console.error('Failed to retrieve connection settings:', error)
    return null
  }
}

export const clearConnectionSettings = (): void => {
  try {
    localStorage.removeItem(CONNECTION_SETTINGS_KEY)
  } catch (error) {
    console.error('Failed to clear connection settings:', error)
  }
}

// Storage Management
export const getAllStorageKeys = (): string[] => {
  const keys: string[] = []

  // Session storage keys
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i)
    if (key && key.startsWith('ai-')) {
      keys.push(key)
    }
  }

  // Local storage keys
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith('ai-')) {
      keys.push(key)
    }
  }

  return keys
}

export const cleanupExpiredStates = (): void => {
  const now = Date.now()

  // Clean terminal state
  const terminalState = sessionStorage.getItem(TERMINAL_STATE_KEY)
  if (terminalState) {
    try {
      const state: StoredTerminalState = JSON.parse(terminalState)
      if (now - state.timestamp > STATE_EXPIRY_TIME) {
        sessionStorage.removeItem(TERMINAL_STATE_KEY)
      }
    } catch (error) {
      sessionStorage.removeItem(TERMINAL_STATE_KEY)
    }
  }

  // Clean file browser state
  const fileBrowserState = sessionStorage.getItem(FILE_BROWSER_STATE_KEY)
  if (fileBrowserState) {
    try {
      const state: StoredFileBrowserState = JSON.parse(fileBrowserState)
      if (now - state.timestamp > STATE_EXPIRY_TIME) {
        sessionStorage.removeItem(FILE_BROWSER_STATE_KEY)
      }
    } catch (error) {
      sessionStorage.removeItem(FILE_BROWSER_STATE_KEY)
    }
  }

  // Clean old navigation timestamps (older than 24 hours)
  const navigationTimestamp = sessionStorage.getItem(NAVIGATION_TIMESTAMP_KEY)
  if (navigationTimestamp) {
    try {
      const timestamp: NavigationTimestamp = JSON.parse(navigationTimestamp)
      if (now - timestamp.startTime > 24 * 60 * 60 * 1000) {
        sessionStorage.removeItem(NAVIGATION_TIMESTAMP_KEY)
      }
    } catch (error) {
      sessionStorage.removeItem(NAVIGATION_TIMESTAMP_KEY)
    }
  }
}

export const clearAllAiStates = (): void => {
  try {
    // Clear session storage
    sessionStorage.removeItem(TERMINAL_STATE_KEY)
    sessionStorage.removeItem(FILE_BROWSER_STATE_KEY)
    sessionStorage.removeItem(NAVIGATION_TIMESTAMP_KEY)

    // Clear local storage
    localStorage.removeItem(CONNECTION_SETTINGS_KEY)
  } catch (error) {
    console.error('Failed to clear AI states:', error)
  }
}

// Storage Quota Management
export const checkStorageQuota = (): { available: boolean; usage: number } => {
  try {
    let totalUsage = 0

    // Calculate session storage usage
    for (let key in sessionStorage) {
      if (sessionStorage.hasOwnProperty(key) && key.startsWith('ai-')) {
        totalUsage += sessionStorage[key].length
      }
    }

    // Calculate local storage usage
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key) && key.startsWith('ai-')) {
        totalUsage += localStorage[key].length
      }
    }

    // Estimate available space (very rough approximation)
    // Most browsers have 5-10MB per domain
    const estimatedQuota = 5 * 1024 * 1024 // 5MB
    const available = totalUsage < estimatedQuota * 0.8 // Use 80% as threshold

    return {
      available,
      usage: totalUsage
    }
  } catch (error) {
    console.error('Failed to check storage quota:', error)
    return { available: false, usage: 0 }
  }
}

export const optimizeStorage = (): void => {
  try {
    // If storage is getting full, remove oldest states
    const quota = checkStorageQuota()
    if (!quota.available) {
      // Clear expired states first
      cleanupExpiredStates()

      // If still full, clear all AI states as last resort
      const quotaAfterCleanup = checkStorageQuota()
      if (!quotaAfterCleanup.available) {
        console.warn('Storage quota exceeded, clearing AI states')
        clearAllAiStates()
      }
    }
  } catch (error) {
    console.error('Failed to optimize storage:', error)
  }
}