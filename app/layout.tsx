import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from '@/components/Providers';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

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
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}