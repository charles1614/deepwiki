import React from 'react'
import { UseFormRegister, FieldErrors } from 'react-hook-form'

interface InputProps {
  label: string
  type: string
  id: string
  placeholder?: string
  register: UseFormRegister<any>
  error?: string
  autoComplete?: string
  disabled?: boolean
}

export function Input({
  label,
  type,
  id,
  placeholder,
  register,
  error,
  autoComplete,
  disabled = false,
}: InputProps) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="block text-sm font-medium text-gray-700"
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        {...register(id)}
        autoComplete={autoComplete}
        disabled={disabled}
        data-testid={id}
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && (
        <p
          id={`${id}-error`}
          className="text-sm text-red-600"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  )
}