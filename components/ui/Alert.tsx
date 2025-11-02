import React from 'react'

interface AlertProps {
  type: 'error' | 'success' | 'info'
  children: React.ReactNode
}

export function Alert({ type, children }: AlertProps) {
  const baseClasses = 'p-4 rounded-md text-sm'

  const typeClasses = {
    error: 'bg-red-50 text-red-800 border border-red-200',
    success: 'bg-green-50 text-green-800 border border-green-200',
    info: 'bg-blue-50 text-blue-800 border border-blue-200',
  }

  return (
    <div className={`${baseClasses} ${typeClasses[type]}`} role="alert">
      {children}
    </div>
  )
}