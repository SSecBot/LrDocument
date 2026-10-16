import type { MetadataRoute } from 'next';

/**
 * Installable app (PWA): Windows (Edge / Chrome › "Uygulamayı yükle"), Android and iOS. The service
 * worker is public/sw.js; icons are in public/icons.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/dashboard',
    name: 'LrDocument',
    short_name: 'LrDocument',
    description: 'Ders takibi, LaTeX notlar, görevler, takvim ve bütçe.',
    lang: 'tr',
    dir: 'ltr',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui'],
    orientation: 'any',
    background_color: '#0e0f11',
    theme_color: '#0e0f11',
    categories: ['education', 'productivity', 'finance'],
    icons: [
      { src: '/icons/icon-192.png', type: 'image/png', sizes: '192x192', purpose: 'any' },
      { src: '/icons/icon-512.png', type: 'image/png', sizes: '512x512', purpose: 'any' },
      { src: '/icons/maskable-192.png', type: 'image/png', sizes: '192x192', purpose: 'maskable' },
      { src: '/icons/maskable-512.png', type: 'image/png', sizes: '512x512', purpose: 'maskable' },
      { src: '/icons/icon.svg', type: 'image/svg+xml', sizes: 'any', purpose: 'any' },
    ],
    // Right-click on the taskbar / Start menu icon (Windows) or long-press (Android).
    shortcuts: [
      { name: 'Notlar', url: '/dashboard?sekme=notes', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Görevler', url: '/dashboard?sekme=tasks', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Takvim', url: '/dashboard?sekme=calendar', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Gelir ve Gider', url: '/dashboard?sekme=finance', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
    ],
  };
}
