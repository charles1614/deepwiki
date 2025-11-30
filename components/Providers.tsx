'use client'

import { SessionProvider } from 'next-auth/react'
import { AiConnectionProvider } from '@/lib/ai/AiConnectionContext'

export function Providers({ children, proxyAuthToken }: { children: React.ReactNode, proxyAuthToken?: string }) {
  return (
    <SessionProvider>
      <AiConnectionProvider proxyAuthToken={proxyAuthToken}>
        {children}
      </AiConnectionProvider>
    </SessionProvider>
  )
}