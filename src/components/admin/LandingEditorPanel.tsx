'use client';

import React, { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, ExternalLink, Loader2, Plus, RotateCcw, Save, Trash2 } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { LANDING_ICONS, type LandingContent, type LandingIcon } from '@/lib/landingContent';
import { askConfirm, confirmDelete } from '@/components/ui/ConfirmDialog';

const inputCls = 'w-full h-9 bg-app border border-line rounded-md px-2.5 text-sm text-fg focus:outline-none focus:border-line-strong';
const areaCls = 'w-full bg-app border border-line rounded-md px-2.5 py-2 text-sm text-fg focus:outline-none focus:border-line-strong resize-y';
const smallBtn = 'w-7 h-7 inline-flex items-center justify-center rounded-md text-muted hover:text-fg hover:bg-surface-2 disabled:opacity-30';

type IconItem = { icon: LandingIcon; title: string; text: string };

/** Yönetici Paneli › Açılış sayfası: edits every text and list on the public landing page. */
export function LandingEditorPanel() {
  const { addToast } = useAppStore();
  const [draft, setDraft] = useState<LandingContent | null>(null);
  const [saved, setSaved] = useState<string>('');
  const [defaults, setDefaults] = useState<LandingContent | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch('/api/admin/landing', { signal: ctrl.signal, cache: 'no-store' })
      .then((r) => r.json())
      .then((d: { content?: LandingContent; defaults?: LandingContent; error?: string }) => {
        if (!d.content) throw new Error(d.error || 'İçerik alınamadı.');
        setDraft(d.content);
        setSaved(JSON.stringify(d.content));
        setDefaults(d.defaults ?? null);
      })
      .catch((err) => !ctrl.signal.aborted && setError(err instanceof Error ? err.message : 'İçerik alınamadı.'));
    return () => ctrl.abort();
  }, []);

  if (!draft) {
    return (
      <div className="py-10 flex justify-center text-sm text-muted">
        {error ? <span className="text-rose-300">{error}</span> : <Loader2 className="w-5 h-5 animate-spin" />}
      </div>
    );
  }

  const dirty = JSON.stringify(draft) !== saved;
  const set = <K extends keyof LandingContent>(section: K, patch: Partial<LandingContent[K]>) =>
    setDraft((d) => (d ? { ...d, [section]: { ...d[section], ...patch } } : d));

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/landing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: draft }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Kaydedilemedi.');
      setDraft(data.content);
      setSaved(JSON.stringify(data.content));
      addToast({ type: 'success', title: 'Açılış sayfası güncellendi', message: 'Değişiklikler yayında.' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 sticky top-0 z-10 bg-app py-2">
        <p className="text-xs text-muted max-w-xl">
          Açılış sayfasındaki tüm metinler. Kaydettiğinizde hemen yayına girer. Fiyatlar “Varsayılanlar” sekmesinden gelir.
        </p>
        <div className="flex gap-2">
          <a href="/" target="_blank" rel="noopener" className="h-9 px-3 text-xs text-body hover:text-fg bg-surface-2 hover:bg-surface-3 border border-line rounded-md inline-flex items-center gap-1.5">
            <ExternalLink className="w-3.5 h-3.5" /> Sayfayı aç
          </a>
          {defaults && (
            <button
              onClick={async () => (await askConfirm({ title: 'Tüm metinler varsayılana dönsün mü?', message: 'Kaydetmeden yayına girmez.', confirmText: 'Varsayılana dön', danger: false })) && setDraft(defaults)}
              className="h-9 px-3 text-xs text-body hover:text-fg bg-surface-2 hover:bg-surface-3 border border-line rounded-md inline-flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Varsayılan metinler
            </button>
          )}
          <button
            onClick={save}
            disabled={!dirty || saving}
            className="h-9 px-4 text-xs text-white bg-brand hover:bg-brand-hover rounded-md inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" /> {saving ? 'Kaydediliyor…' : dirty ? 'Kaydet ve yayınla' : 'Kaydedildi'}
          </button>
        </div>
      </div>
      {error && <p className="text-xs text-rose-300" role="alert">{error}</p>}

      <Section title="Arama motorları (SEO)">
        <p className="text-[11px] text-muted leading-relaxed">
          Google sonuçlarında ve paylaşılan bağlantılarda görünen başlık ve açıklama. Başlık 60, açıklama 160 karakter civarında kalırsa kesilmeden görünür.
        </p>
        <Field label="Sayfa başlığı" value={draft.seo.title} max={70} onChange={(v) => set('seo', { title: v })} />
        <Field label="Açıklama" multiline value={draft.seo.description} max={170} onChange={(v) => set('seo', { description: v })} />
        <Field label="Anahtar kelimeler (virgülle)" multiline value={draft.seo.keywords} max={400} onChange={(v) => set('seo', { keywords: v })} />
      </Section>

      <Section title="Giriş (üst bölüm)">
        <Field label="Üst etiket" value={draft.hero.eyebrow} max={120} onChange={(v) => set('hero', { eyebrow: v })} />
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Başlık" value={draft.hero.title} max={140} onChange={(v) => set('hero', { title: v })} />
          <Field label="Başlığın vurgulu kısmı" value={draft.hero.highlight} max={80} onChange={(v) => set('hero', { highlight: v })} />
        </div>
        <Field label="Açıklama" multiline value={draft.hero.subtitle} max={600} onChange={(v) => set('hero', { subtitle: v })} />
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Ana düğme" value={draft.hero.primaryCta} max={60} onChange={(v) => set('hero', { primaryCta: v })} />
          <Field label="Öğrenci düğmesi (boş = gizli)" value={draft.hero.secondaryCta} max={60} onChange={(v) => set('hero', { secondaryCta: v })} />
        </div>
        <StringList label="Güven maddeleri (en fazla 4)" items={draft.hero.trustPoints} max={4} maxLength={80} onChange={(v) => set('hero', { trustPoints: v })} />
        <Check label="Sağda uygulama önizlemesini göster" checked={draft.hero.showPreview} onChange={(v) => set('hero', { showPreview: v })} />
      </Section>

      <Section title="Özellikler" visible={draft.features.visible} onVisible={(v) => set('features', { visible: v })}>
        <SectionHeadFields value={draft.features} onChange={(p) => set('features', p)} />
        <IconList items={draft.features.items} max={12} onChange={(v) => set('features', { items: v })} />
      </Section>

      <Section title="Kurumsal" visible={draft.corporate.visible} onVisible={(v) => set('corporate', { visible: v })}>
        <SectionHeadFields value={draft.corporate} onChange={(p) => set('corporate', p)} />
        <IconList items={draft.corporate.items} max={8} onChange={(v) => set('corporate', { items: v })} />
      </Section>

      <Section title="Güvenlik" visible={draft.security.visible} onVisible={(v) => set('security', { visible: v })}>
        <SectionHeadFields value={draft.security} onChange={(p) => set('security', p)} />
        <IconList items={draft.security.items} max={8} onChange={(v) => set('security', { items: v })} />
      </Section>

      <Section title="Öğrenciler" visible={draft.students.visible} onVisible={(v) => set('students', { visible: v })}>
        <SectionHeadFields value={draft.students} onChange={(p) => set('students', p)} />
        <StringList label="Maddeler" items={draft.students.points} max={10} maxLength={300} onChange={(v) => set('students', { points: v })} />
        <p className="text-[11px] text-subtle">Adımlar</p>
        <IconList items={draft.students.steps} max={6} onChange={(v) => set('students', { steps: v })} />
      </Section>

      <Section title="Fiyatlar" visible={draft.pricing.visible} onVisible={(v) => set('pricing', { visible: v })}>
        <SectionHeadFields value={draft.pricing} onChange={(p) => set('pricing', p)} />
      </Section>

      <Section title="Sık sorulan sorular" visible={draft.faq.visible} onVisible={(v) => set('faq', { visible: v })}>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Üst etiket" value={draft.faq.eyebrow} max={120} onChange={(v) => set('faq', { eyebrow: v })} />
          <Field label="Başlık" value={draft.faq.title} max={140} onChange={(v) => set('faq', { title: v })} />
        </div>
        <ListEditor
          items={draft.faq.items}
          max={20}
          addLabel="Soru ekle"
          create={() => ({ q: 'Yeni soru', a: '' })}
          onChange={(v) => set('faq', { items: v })}
          render={(item, update) => (
            <>
              <Field label="Soru" value={item.q} max={200} onChange={(v) => update({ ...item, q: v })} />
              <Field label="Cevap" multiline value={item.a} max={1200} onChange={(v) => update({ ...item, a: v })} />
            </>
          )}
        />
      </Section>

      <Section title="Kapanış çağrısı" visible={draft.cta.visible} onVisible={(v) => set('cta', { visible: v })}>
        <Field label="Başlık" value={draft.cta.title} max={140} onChange={(v) => set('cta', { title: v })} />
        <Field label="Metin" value={draft.cta.text} max={600} onChange={(v) => set('cta', { text: v })} />
        <Field label="Düğme" value={draft.cta.button} max={60} onChange={(v) => set('cta', { button: v })} />
      </Section>

      <Section title="Alt bilgi">
        <Field label="Not (ör. şirket adı, boş bırakılabilir)" value={draft.footer.note} max={200} onChange={(v) => set('footer', { note: v })} />
      </Section>

      <Section title="Yasal metinler">
        <p className="text-[11px] text-muted leading-relaxed">
          Alt bilgideki KVKK, Gizlilik Politikası, Mesafeli Satış ve İade Koşulları ile Kullanım Şartları bağlantıları bu metinleri gösterir.
          Metinlerde {'{veriSorumlusu}'}, {'{iletisim}'} ve {'{saticiBilgileri}'} yazan yerlere aşağıdaki bilgiler yerleşir. “## ” ile başlayan satır başlık, “- ” ile başlayan satır madde olur. Yayına almadan önce veri sorumlusu ve
          iletişim bilgisini, satış yapıyorsanız satıcı bilgilerini kendi bilgilerinizle doldurun.
        </p>
        <Field label="Veri sorumlusu (kişi veya şirket unvanı)" value={draft.legal.controller} max={200} onChange={(v) => set('legal', { controller: v })} />
        <Field label="İletişim (KVKK başvuruları için e-posta)" value={draft.legal.contact} max={254} onChange={(v) => set('legal', { contact: v })} />
        <Field
          label="Satıcı bilgileri (unvan, adres, telefon, vergi dairesi / no, MERSİS no)"
          multiline
          rows={4}
          value={draft.legal.seller}
          max={2000}
          onChange={(v) => set('legal', { seller: v })}
        />
        <Field label="Son güncelleme tarihi" value={draft.legal.updated} max={40} onChange={(v) => set('legal', { updated: v })} />
        <Field label="KVKK aydınlatma metni" multiline rows={14} value={draft.legal.kvkk} max={40000} onChange={(v) => set('legal', { kvkk: v })} />
        <Field label="Gizlilik politikası" multiline rows={14} value={draft.legal.privacy} max={40000} onChange={(v) => set('legal', { privacy: v })} />
        <Field label="Mesafeli satış sözleşmesi" multiline rows={14} value={draft.legal.sales} max={40000} onChange={(v) => set('legal', { sales: v })} />
        <Field label="Teslimat ve iade şartları" multiline rows={14} value={draft.legal.delivery} max={40000} onChange={(v) => set('legal', { delivery: v })} />
        <Field label="Kullanım şartları" multiline rows={14} value={draft.legal.terms} max={40000} onChange={(v) => set('legal', { terms: v })} />
      </Section>
    </div>
  );
}

function Section({ title, visible, onVisible, children }: { title: string; visible?: boolean; onVisible?: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-line bg-surface">
      <header className="px-4 py-3 border-b border-line flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-fg">{title}</h3>
        {onVisible && <Check label="Göster" checked={!!visible} onChange={onVisible} />}
      </header>
      <div className={`p-4 space-y-3 ${visible === false ? 'opacity-60' : ''}`}>{children}</div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  max,
  multiline,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  max: number;
  multiline?: boolean;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="flex justify-between text-[11px] text-subtle mb-1">
        {label}
        <span className="tabular-nums text-muted">
          {value.length}/{max}
        </span>
      </span>
      {multiline ? (
        <textarea className={areaCls} rows={rows} maxLength={max} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input className={inputCls} maxLength={max} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="inline-flex items-center gap-2 text-xs text-body cursor-pointer">
      <input type="checkbox" className="w-4 h-4 accent-[var(--color-brand)]" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

function SectionHeadFields<T extends { eyebrow: string; title: string; text: string }>({ value, onChange }: { value: T; onChange: (p: Partial<T>) => void }) {
  return (
    <>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Üst etiket" value={value.eyebrow} max={120} onChange={(v) => onChange({ eyebrow: v } as Partial<T>)} />
        <Field label="Başlık" value={value.title} max={140} onChange={(v) => onChange({ title: v } as Partial<T>)} />
      </div>
      <Field label="Açıklama" multiline value={value.text} max={600} onChange={(v) => onChange({ text: v } as Partial<T>)} />
    </>
  );
}

function ListEditor<T>({
  items,
  max,
  addLabel,
  create,
  onChange,
  render,
}: {
  items: T[];
  max: number;
  addLabel: string;
  create: () => T;
  onChange: (items: T[]) => void;
  render: (item: T, update: (next: T) => void) => React.ReactNode;
}) {
  const move = (i: number, d: number) => {
    const next = [...items];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
  };
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="rounded-md border border-line p-3 space-y-2 bg-surface-2/40">
          <div className="flex justify-between items-center">
            <span className="text-[11px] text-muted tabular-nums">{i + 1}.</span>
            <div className="flex gap-0.5">
              <button type="button" className={smallBtn} disabled={i === 0} onClick={() => move(i, -1)} aria-label="Yukarı taşı">
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button type="button" className={smallBtn} disabled={i === items.length - 1} onClick={() => move(i, 1)} aria-label="Aşağı taşı">
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
              <button type="button" className={smallBtn} onClick={async () => (await confirmDelete('Bu öğe', 'Kaydetmeden yayına girmez.')) && onChange(items.filter((_, j) => j !== i))} aria-label="Sil">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          {render(item, (next) => onChange(items.map((x, j) => (j === i ? next : x))))}
        </div>
      ))}
      {items.length < max && (
        <button
          type="button"
          onClick={() => onChange([...items, create()])}
          className="h-8 px-3 text-xs text-body hover:text-fg bg-surface-2 hover:bg-surface-3 border border-line rounded-md inline-flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" /> {addLabel}
        </button>
      )}
    </div>
  );
}

function StringList({ label, items, max, maxLength, onChange }: { label: string; items: string[]; max: number; maxLength: number; onChange: (v: string[]) => void }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] text-subtle">{label}</p>
      {items.map((item, i) => (
        <div key={i} className="flex gap-1.5">
          <input className={inputCls} maxLength={maxLength} value={item} onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))} />
          <button type="button" className={smallBtn} onClick={async () => (await confirmDelete('Bu satır', 'Kaydetmeden yayına girmez.')) && onChange(items.filter((_, j) => j !== i))} aria-label="Sil">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      {items.length < max && (
        <button
          type="button"
          onClick={() => onChange([...items, ''])}
          className="h-8 px-3 text-xs text-body hover:text-fg bg-surface-2 hover:bg-surface-3 border border-line rounded-md inline-flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" /> Madde ekle
        </button>
      )}
    </div>
  );
}

function IconList({ items, max, onChange }: { items: IconItem[]; max: number; onChange: (v: IconItem[]) => void }) {
  return (
    <ListEditor
      items={items}
      max={max}
      addLabel="Öğe ekle"
      create={() => ({ icon: 'FileText' as LandingIcon, title: 'Yeni başlık', text: '' })}
      onChange={onChange}
      render={(item, update) => (
        <>
          <div className="grid grid-cols-[140px_1fr] gap-2">
            <label className="block">
              <span className="block text-[11px] text-subtle mb-1">İkon</span>
              <select className={inputCls} value={item.icon} onChange={(e) => update({ ...item, icon: e.target.value as LandingIcon })}>
                {LANDING_ICONS.map((i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </select>
            </label>
            <Field label="Başlık" value={item.title} max={80} onChange={(v) => update({ ...item, title: v })} />
          </div>
          <Field label="Metin" multiline value={item.text} max={400} onChange={(v) => update({ ...item, text: v })} />
        </>
      )}
    />
  );
}
