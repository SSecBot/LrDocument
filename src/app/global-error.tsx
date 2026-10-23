'use client';

import { t } from '@/lib/i18n';
// Replaces the root layout when it crashes, so it brings its own document and plain inline styles.
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  const button = { background: '#c2560c', color: '#fff', border: 0, borderRadius: 10, padding: '12px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', margin: 4 } as const;
  return (
    <html lang="tr">
      <body style={{ margin: 0, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0e0f11', color: '#f1f3f4', fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif', padding: 24, boxSizing: 'border-box' }}>
        <title>{t('Sayfa açılamadı · LrDocument')}</title>
        <main style={{ maxWidth: 400, textAlign: 'center' }}>
          <h1 style={{ fontSize: 20, margin: '0 0 8px' }}>{t('LrDocument açılırken takıldı')}</h1>
          <p style={{ color: '#9aa3aa', fontSize: 14, lineHeight: 1.6, margin: '0 0 20px' }}>
            {t('Beklenmedik bir durum oluştu. Kaydedilmiş verileriniz güvende. Önce “Tekrar dene”ye basın; olmazsa sayfayı yenileyin. Sorun sürerse bir süre sonra tekrar deneyin.')}
          </p>
          <button style={button} onClick={() => retry()}>{t('Tekrar dene')}</button>
          <button style={{ ...button, background: '#23272b' }} onClick={() => window.location.reload()}>{t('Sayfayı yenile')}</button>
        </main>
      </body>
    </html>
  );
}
