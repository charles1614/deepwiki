import React from 'react'

interface ButtonProps {
  type?: 'button' | 'submit' | 'reset'
  children: React.ReactNode
  disabled?: boolean
  loading?: boolean
  className?: string
  onClick?: () => void
  id?: string
}

export function Button({
  type = 'button',
  children,
  disabled = false,
  loading = false,
  className = '',
  onClick,
  id,
}: ButtonProps) {
  const baseClasses = 'w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed'

  return (
    <button
      type={type}
      disabled={disabled || loading}
      data-testid={id}
      className={`${baseClasses} ${className}`}
      onClick={onClick}
    >
      {loading ? (
        <span className="flex items-center">
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          {children}
        </span>
      ) : (
        children
      )}
    </button>
  )
}