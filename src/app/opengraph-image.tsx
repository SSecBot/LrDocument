import { ImageResponse } from 'next/og';

// Preview image for links shared on WhatsApp, X, LinkedIn… (1200×630).
// The built-in font covers Latin-1 only, so the text avoids ş/ğ/ı.
export const alt = 'LrDocument — notlar, ders takibi, görevler ve takvim';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  const chip = (label: string, color: string) => (
    <div style={{ display: 'flex', padding: '10px 22px', borderRadius: 999, border: `2px solid ${color}`, color, fontSize: 28 }}>{label}</div>
  );
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#0e0f11', padding: 72, color: '#f1f3f4' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ width: 96, height: 96, borderRadius: 20, background: '#c2560c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64, color: '#fff' }}>Σ</div>
          <div style={{ fontSize: 64, fontWeight: 700 }}>LrDocument</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ fontSize: 58, fontWeight: 700, lineHeight: 1.15 }}>Notlar, ders takibi, görevler ve takvim</div>
          <div style={{ fontSize: 32, color: '#9aa3aa' }}>LaTeX notlar · devamsızlık ve not ortalaması · kurumsal ekipler</div>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          {chip('Bireysel', '#f59e5b')}
          {chip('Kurumsal', '#3fc283')}
          {chip('Ders takibi', '#5996f2')}
        </div>
      </div>
    ),
    size
  );
}
