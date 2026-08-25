import type { Metadata, Viewport } from 'next';
import { Inter, Baloo_2, Mulish } from 'next/font/google';
import NextTopLoader from 'nextjs-toploader';
import { Providers } from './providers';
import '@/src/styles.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const baloo = Baloo_2({
  subsets: ['latin'],
  variable: '--font-baloo',
  weight: ['500', '600', '700', '800'],
  display: 'swap',
});

const mulish = Mulish({
  subsets: ['latin'],
  variable: '--font-mulish',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'UnBoxed Learning — Homeschool Management',
  description:
    'AI-powered homeschool management platform for tracking curriculum, tasks, and student progress.',
  keywords: ['homeschool', 'education', 'curriculum', 'AI learning', 'kids learning'],
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'UnBoxed',
  },
  icons: {
    icon: [
      { url: '/icons/icon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#3d2a52',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${baloo.variable} ${mulish.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <NextTopLoader color="#8b5cf6" showSpinner={false} height={3} shadow="0 0 10px #8b5cf6,0 0 5px #8b5cf6" />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
