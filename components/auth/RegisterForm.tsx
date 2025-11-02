'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { signIn } from 'next-auth/react'
import { registerSchema, type RegisterFormData } from '@/lib/validations'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'

export function RegisterForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Registration failed')
      } else {
        setSuccess(true)
        // Auto-login after successful registration
        await signIn('credentials', {
          email: data.email,
          password: data.password,
          redirect: false,
        })
        setTimeout(() => {
          window.location.href = '/dashboard'
        }, 2000)
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <Alert type="success">
        Account created successfully! Redirecting to dashboard...
      </Alert>
    )
  }

  return (
    <div className="w-full max-w-md mx-auto">
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

        <Input
          label="Password"
          type="password"
          id="password"
          placeholder="Create a password"
          register={register}
          error={errors.password?.message}
          autoComplete="new-password"
          disabled={isLoading}
        />

        <Input
          label="Confirm Password"
          type="password"
          id="confirmPassword"
          placeholder="Confirm your password"
          register={register}
          error={errors.confirmPassword?.message}
          autoComplete="new-password"
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
          id="register-button"
        >
          {isLoading ? 'Creating account...' : 'Create account'}
        </Button>
      </form>
    </div>
  )
}