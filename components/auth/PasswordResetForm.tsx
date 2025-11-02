'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { passwordResetSchema, type PasswordResetFormData } from '@/lib/validations'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'

export function PasswordResetForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PasswordResetFormData>({
    resolver: zodResolver(passwordResetSchema),
    disabled: success || isLoading,
  })

  const onSubmit = async (data: PasswordResetFormData) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/reset-password/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Failed to send reset email')
      } else {
        setSuccess(true)
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="w-full max-w-md mx-auto">
        <Alert type="success">
          Password reset email sent! Check your email for instructions.
        </Alert>
        <div className="text-center mt-4">
          <a
            href="/login"
            className="text-blue-600 hover:text-blue-500 text-sm"
            data-testid="back-to-login"
          >
            Back to login
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Reset your password</h2>
        <p className="mt-2 text-sm text-gray-600">
          Enter your email address and we&apos;ll send you a link to reset your password.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Input
          label="Email"
          type="email"
          id="email"
          placeholder="Enter your email"
          register={register}
          error={errors.email?.message}
          autoComplete="email"
          disabled={isLoading}
        />

        {error && (
          <Alert type="error">
            {error}
          </Alert>
        )}

        <Button
          type="submit"
          disabled={isLoading}
          loading={isLoading}
          id="reset-button"
        >
          {isLoading ? 'Sending...' : 'Send reset link'}
        </Button>

        <div className="text-center">
          <a
            href="/login"
            className="text-blue-600 hover:text-blue-500 text-sm"
            data-testid="back-to-login"
          >
            Back to login
          </a>
        </div>
      </form>
    </div>
  )
}