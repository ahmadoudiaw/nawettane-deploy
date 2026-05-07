import type { Metadata, Viewport } from 'next';
import './globals.css';
import { SiteHeader } from '@/components/site-header';
import { ToastProvider } from '@/components/ToastProvider';
import { GlobalApiHandler } from '@/components/global-api-handler';
import { LoadingBar } from '@/components/loading-bar';
import { OfflineDetector } from '@/components/offline-detector';

export const metadata: Metadata = {
  title: 'NAWETTANE Demo',
  description: 'Billetterie digitale et pilotage Nawettane.',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/logo.png', type: 'image/png' },
    ],
    apple: '/logo.png',
    shortcut: '/favicon.ico',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'NAWETTANE',
  },
};

export const viewport: Viewport = {
  themeColor: '#0f766e',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>
        <SiteHeader />
        <ToastProvider>
          <GlobalApiHandler />
          <LoadingBar />
          <OfflineDetector />
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
