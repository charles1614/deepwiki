import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { Providers } from '@/components/Providers';
import './globals.css';

// import { getPublicSystemSettings } from '@/app/actions/public-settings';

// Force dynamic rendering to ensure environment variables are read at runtime
// and console logs appear in the container output
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'DeepWiki',
  description: 'Generated with Claude Code Next.js scaffolding',
};

/*
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicSystemSettings();
  return {
    title: settings['site_name'] || 'DeepWiki',
    description: 'Generated with Claude Code Next.js scaffolding',
  };
}
*/

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Read from server-side env var (NO NEXT_PUBLIC_ prefix)
  // This gets the runtime container value, not build-time value
  // Fallback to NEXT_PUBLIC_ variant just in case the env file wasn't updated
  const proxyAuthToken = process.env.PROXY_AUTH_TOKEN || process.env.NEXT_PUBLIC_PROXY_AUTH_TOKEN;

  // Debug: verify token is available (server-side only, won't show in browser)
  console.log('[Server] Token Check:', {
    PROXY_AUTH_TOKEN: !!process.env.PROXY_AUTH_TOKEN,
    NEXT_PUBLIC_VAR: !!process.env.NEXT_PUBLIC_PROXY_AUTH_TOKEN,
    FINAL_TOKEN: !!proxyAuthToken,
    LENGTH: proxyAuthToken?.length
  });

  return (
    <html lang="en" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className={GeistSans.className}>
        <Providers proxyAuthToken={proxyAuthToken}>
          {children}
        </Providers>
      </body>
    </html>
  );
}