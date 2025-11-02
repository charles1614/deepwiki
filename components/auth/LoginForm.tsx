'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { signIn } from 'next-auth/react'
import { loginSchema, type LoginFormData } from '@/lib/validations'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      })

      if (result?.error) {
        setError('Invalid credentials')
      } else if (result?.ok) {
        // Redirect will be handled by NextAuth.js
        window.location.href = '/dashboard'
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
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
          placeholder="Enter your password"
          register={register}
          error={errors.password?.message}
          autoComplete="current-password"
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
          id="login-button"
        >
          {isLoading ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>
    </div>
  )
}