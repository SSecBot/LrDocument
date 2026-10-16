import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { PwaRegister } from '@/components/PwaRegister';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin', 'latin-ext'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin', 'latin-ext'],
});

export const metadata: Metadata = {
  // Pages set their own title; "%s · LrDocument" keeps the brand in every tab and search result.
  title: { default: 'LrDocument — Ders takibi, LaTeX notlar, görev ve takvim', template: '%s · LrDocument' },
  description: 'Öğrenciler için ders, devamsızlık ve not takibi; LaTeX notlar, görevler, takvim, bütçe ve kurumsal ekipler için ortak çalışma alanı.',
  applicationName: 'LrDocument',
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192.png', type: 'image/png', sizes: '192x192' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', type: 'image/png', sizes: '180x180' }],
  },
  appleWebApp: {
    capable: true,
    title: 'LrDocument',
    statusBarStyle: 'black-translucent',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0e0f11',
  colorScheme: 'dark',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className={`${geistSans.variable} ${geistMono.variable} dark h-full`}>
      <body className="min-h-full bg-app text-fg flex flex-col antialiased selection:bg-brand selection:text-white">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
