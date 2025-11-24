import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { Providers } from '@/components/Providers';
import './globals.css';

// import { getPublicSystemSettings } from '@/app/actions/public-settings';

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
  return (
    <html lang="en" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className={GeistSans.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}