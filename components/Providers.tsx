'use client'

import { SessionProvider } from 'next-auth/react'
import { AiConnectionProvider } from '@/lib/ai/AiConnectionContext'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AiConnectionProvider>
        {children}
      </AiConnectionProvider>
    </SessionProvider>
  )
}