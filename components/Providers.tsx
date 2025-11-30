'use client'

import { SessionProvider } from 'next-auth/react'
import { AiConnectionProvider } from '@/lib/ai/AiConnectionContext'

export function Providers({ children, proxyAuthToken }: { children: React.ReactNode, proxyAuthToken?: string }) {
  // Debug: verify token prop is passed (client-side, will show in browser console)
  console.log('[Client] Providers received proxyAuthToken:', !!proxyAuthToken, 'Length:', proxyAuthToken?.length);

  return (
    <SessionProvider>
      <AiConnectionProvider proxyAuthToken={proxyAuthToken}>
        {children}
      </AiConnectionProvider>
    </SessionProvider>
  )
}