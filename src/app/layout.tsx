import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { PwaRegister } from '@/components/PwaRegister';
import { LocaleProvider } from '@/components/LocaleProvider';
import { KeyboardAware } from '@/components/KeyboardAware';
import { dictionaryVersion, pageLocale, translatorFor } from '@/lib/i18n/server';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin', 'latin-ext'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin', 'latin-ext'],
});

export async function generateMetadata(): Promise<Metadata> {
  const t = translatorFor(await pageLocale());
  return {
  // Pages set their own title; "%s · LrDocument" keeps the brand in every tab and search result.
  title: { default: t('LrDocument — Ders takibi, LaTeX notlar, görev ve takvim'), template: '%s · LrDocument' },
  description: t('Öğrenciler için ders, devamsızlık ve not takibi; LaTeX notlar, görevler, takvim, bütçe ve kurumsal ekipler için ortak çalışma alanı.'),
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
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  // Android: the on-screen keyboard shrinks the page, so fields above it stay reachable.
  interactiveWidget: 'resizes-content',
  themeColor: '#0e0f11',
  colorScheme: 'dark',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await pageLocale();
  return (
    <html lang={locale} className={`${geistSans.variable} ${geistMono.variable} dark h-full`}>
      {locale !== 'tr' && (
        <head>
          {/* The dictionary must be there before the app's (async) scripts run, see src/lib/i18n/index.ts.
              Only English pages load it; it is cached for a year by its ?v= version. */}
          {/* eslint-disable-next-line @next/next/no-sync-scripts */}
          <script src={`/i18n/${locale}.js?v=${dictionaryVersion(locale)}`} />
        </head>
      )}
      <body className="min-h-full bg-app text-fg flex flex-col antialiased selection:bg-brand selection:text-white">
        <LocaleProvider locale={locale}>
          {children}
          <PwaRegister />
          <KeyboardAware />
        </LocaleProvider>
      </body>
    </html>
  );
}
