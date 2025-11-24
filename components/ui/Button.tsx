import React from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'success' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps {
  type?: 'button' | 'submit' | 'reset'
  variant?: ButtonVariant
  size?: ButtonSize
  children: React.ReactNode
  disabled?: boolean
  loading?: boolean
  className?: string
  onClick?: () => void
  id?: string
  'data-testid'?: string
  fullWidth?: boolean
  ariaLabel?: string
}

export function Button({
  type = 'button',
  variant = 'primary',
  size = 'md',
  children,
  disabled = false,
  loading = false,
  className = '',
  onClick,
  id,
  'data-testid': dataTestId,
  fullWidth = false,
  ariaLabel,
}: ButtonProps) {
  // Variant styles
  const variants: Record<ButtonVariant, string> = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500 border border-gray-300',
    destructive: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
    ghost: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500',
  }

  // Size styles
  const sizes: Record<ButtonSize, string> = {
    sm: 'py-1.5 px-3 text-xs',
    md: 'py-2 px-4 text-sm',
    lg: 'py-3 px-6 text-base',
  }

  // Base classes
  const baseClasses = 'inline-flex justify-center items-center border border-transparent rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'

  // Width classes
  const widthClasses = fullWidth ? 'w-full' : 'w-auto'

  const classes = `${baseClasses} ${variants[variant]} ${sizes[size]} ${widthClasses} ${className}`

  return (
    <button
      type={type}
      disabled={disabled || loading}
      data-testid={dataTestId || id}
      aria-label={ariaLabel}
      className={classes}
      onClick={onClick}
    >
      {loading ? (
        <span className="flex items-center">
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
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