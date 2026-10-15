import type { MetadataRoute } from 'next';

/** Installable on phones ("Ana Ekrana Ekle"). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'LrDocument',
    short_name: 'LrDocument',
    description: 'Ders takibi, LaTeX notlar, görevler, takvim ve bütçe.',
    lang: 'tr',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    background_color: '#0e0f11',
    theme_color: '#0e0f11',
    icons: [
      { src: '/icon.svg', type: 'image/svg+xml', sizes: 'any', purpose: 'any' },
      { src: '/apple-touch-icon.svg', type: 'image/svg+xml', sizes: 'any', purpose: 'maskable' },
    ],
  };
}
