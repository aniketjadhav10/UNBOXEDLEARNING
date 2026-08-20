import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import NextTopLoader from 'nextjs-toploader';
import { Providers } from './providers';
import '@/src/styles.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'UnBoxed Learning — Homeschool Management',
  description:
    'AI-powered homeschool management platform for tracking curriculum, tasks, and student progress.',
  keywords: ['homeschool', 'education', 'curriculum', 'AI learning', 'kids learning'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <NextTopLoader color="#8b5cf6" showSpinner={false} height={3} shadow="0 0 10px #8b5cf6,0 0 5px #8b5cf6" />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
