'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { ArrowRightLeft, BookOpen, Bug, Clock, Keyboard, Lightbulb, MessageSquarePlus, Send, Undo2 } from 'lucide-react';
import { GUIDE_URL } from '@/components/layout/WelcomeGuide';
import { openShortcutsHelp } from '@/components/layout/Shortcuts';
import { useAppStore } from '@/store/useAppStore';
import { FEEDBACK_KIND_LABEL, FEEDBACK_STATUS_LABEL, isOpenStatus, type FeedbackItem, type UserFeedbackKind } from '@/lib/feedback';
import { getRelativeTimeTurkish } from '@/lib/utils';
import { Message, Panel, fieldCls, labelCls, primaryBtn } from './settingsUi';
import { askConfirm } from '@/components/ui/ConfirmDialog';

const secondaryBtn =
  'h-10 px-4 rounded-md border border-line-strong text-body hover:bg-surface-2 text-sm inline-flex items-center justify-center gap-2 disabled:opacity-50';

const STATUS_CLS: Record<FeedbackItem['status'], string> = {
  yeni: 'bg-sky-500/15 text-sky-300',
  inceleniyor: 'bg-amber-500/15 text-amber-300',
  cozuldu: 'bg-emerald-500/15 text-emerald-300',
  reddedildi: 'bg-rose-500/15 text-rose-300',
};

export function StatusBadge({ status }: { status: FeedbackItem['status'] }) {
  return <span className={`text-[11px] px-2 py-0.5 rounded-full whitespace-nowrap ${STATUS_CLS[status]}`}>{FEEDBACK_STATUS_LABEL[status]}</span>;
}

/** The signed-in person's own requests and reports. */
function useMyFeedback() {
  const [items, setItems] = useState<FeedbackItem[] | null>(null);
  const reload = useCallback(async () => {
    const res = await fetch('/api/feedback', { cache: 'no-store' }).catch(() => null);
    const json = res?.ok ? await res.json().catch(() => null) : null;
    setItems(json?.items ?? []);
  }, []);
  useEffect(() => {
    let cancelled = false;
    fetch('/api/feedback', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => !cancelled && setItems(json?.items ?? []))
      .catch(() => !cancelled && setItems([]));
    return () => {
      cancelled = true;
    };
  }, []);
  return { items, reload };
}

async function post(body: Record<string, unknown>): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch('/api/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    return res.ok ? { ok: true } : { ok: false, error: data.error || 'Gönderilemedi.' };
  } catch {
    return { ok: false, error: 'Sunucuya ulaşılamadı.' };
  }
}

async function withdraw(id: string): Promise<boolean> {
  if (!(await askConfirm({ title: 'Talep geri çekilsin mi?', confirmText: 'Geri çek', message: 'Talebiniz yöneticinin listesinden kaldırılır.' }))) return false;
  const res = await fetch(`/api/feedback?id=${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => null);
  return !!res?.ok;
}

/** Ayarlar › Hesap (öğrenci): request a switch to an individual account; an admin approves it. */
export function AccountSwitchSection() {
  const { items, reload } = useMyFeedback();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  if (!items) return null;
  const requests = items.filter((i) => i.kind === 'hesap-gecis');
  const open = requests.find((i) => isOpenStatus(i.status));
  const last = requests[0];

  return (
    <Panel
      title="Bireysel hesaba geçiş"
      description="Öğrenci hesabından bireysel hesaba geçmek için talep gönderin. Geçiş yönetici onayından sonra yapılır; ders takibi verileriniz silinmez."
    >
      <div className="space-y-4 max-w-xl">
        {open ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-amber-300 flex items-center gap-2">
              <Clock className="w-4 h-4" /> Talebiniz yönetici onayı bekliyor ({getRelativeTimeTurkish(open.createdAt)}).
            </p>
            {open.status === 'yeni' && (
              <button
                type="button"
                disabled={busy}
                className={secondaryBtn}
                onClick={async () => {
                  setBusy(true);
                  if (await withdraw(open.id)) setMsg({ kind: 'ok', text: 'Talebiniz geri çekildi.' });
                  await reload();
                  setBusy(false);
                }}
              >
                <Undo2 className="w-4 h-4" /> Talebi geri çek
              </button>
            )}
          </div>
        ) : (
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setMsg(null);
              const r = await post({ kind: 'hesap-gecis', message: note.trim() || undefined });
              setMsg(r.ok ? { kind: 'ok', text: 'Talebiniz gönderildi. Onaylandığında e-posta ile bilgilendirileceksiniz.' } : { kind: 'error', text: r.error! });
              if (r.ok) setNote('');
              await reload();
              setBusy(false);
            }}
          >
            {last?.status === 'reddedildi' && (
              <p className="text-xs text-rose-300">
                Önceki talebiniz onaylanmadı{last.adminNote ? `: ${last.adminNote}` : '.'}
              </p>
            )}
            <label className="block">
              <span className={labelCls}>Not (isteğe bağlı)</span>
              <input className={fieldCls} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ör. mezun oldum" />
            </label>
            <button type="submit" disabled={busy} className={primaryBtn}>
              <ArrowRightLeft className="w-4 h-4" /> Geçiş talebi gönder
            </button>
          </form>
        )}
        {msg && <Message {...msg} />}
      </div>
    </Panel>
  );
}

const KINDS: { id: UserFeedbackKind; label: string; icon: React.ElementType; hint: string }[] = [
  { id: 'istek', label: 'İstek', icon: MessageSquarePlus, hint: 'Eklenmesini istediğiniz bir özellik' },
  { id: 'oneri', label: 'Öneri', icon: Lightbulb, hint: 'Daha iyi olabilecek bir şey' },
  { id: 'hata', label: 'Hata bildirimi', icon: Bug, hint: 'Çalışmayan ya da yanlış çalışan bir şey' },
];

/** Ayarlar › Destek: istek, öneri ve hata bildirimi; answers come back here (and by e-mail). */
export function SupportSection() {
  const { activeTab } = useAppStore();
  const { items, reload } = useMyFeedback();
  const [kind, setKind] = useState<UserFeedbackKind>('istek');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [withDevice, setWithDevice] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const context =
      kind === 'hata' && withDevice
        ? `${navigator.userAgent.slice(0, 300)} · ekran ${window.innerWidth}×${window.innerHeight} · bölüm: ${activeTab}`
        : undefined;
    const r = await post({ kind, subject: subject.trim(), message: message.trim(), context });
    if (r.ok) {
      setSubject('');
      setMessage('');
      setMsg({ kind: 'ok', text: 'Gönderildi, teşekkürler! Yanıtı aşağıda ve e-postanızda görebilirsiniz.' });
      await reload();
    } else {
      setMsg({ kind: 'error', text: r.error! });
    }
    setBusy(false);
  };

  const mine = (items ?? []).filter((i) => i.kind !== 'hesap-gecis');

  return (
    <>
      <Panel title="Kullanım kılavuzu" description="Her sekmenin ve ayarın ne işe yaradığını adım adım anlatır.">
        <div className="flex flex-wrap gap-2">
          <a href={GUIDE_URL} target="_blank" rel="noopener" className={`${primaryBtn} inline-flex items-center gap-2`}>
            <BookOpen className="w-4 h-4" /> Kılavuzu aç (PDF)
          </a>
          <button type="button" onClick={openShortcutsHelp} className={secondaryBtn}>
            <Keyboard className="w-4 h-4" /> Kısayollar
          </button>
        </div>
      </Panel>
      <Panel title="İstek, öneri ve hata bildirimi" description="Yazdıklarınız doğrudan yöneticiye iletilir.">
        <form onSubmit={submit} className="space-y-4 max-w-xl">
          <div role="radiogroup" aria-label="Bildirim türü" className="grid grid-cols-3 gap-2">
            {KINDS.map((k) => {
              const Icon = k.icon;
              const on = kind === k.id;
              return (
                <button
                  key={k.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  title={k.hint}
                  onClick={() => setKind(k.id)}
                  className={`min-h-[44px] rounded-md border px-2 py-2 text-xs sm:text-sm flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 transition-colors ${
                    on ? 'border-brand bg-brand-soft text-fg' : 'border-line text-subtle hover:text-fg hover:bg-surface-2'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${on ? 'text-brand-light' : ''}`} /> {k.label}
                </button>
              );
            })}
          </div>
          <label className="block">
            <span className={labelCls}>Konu</span>
            <input className={fieldCls} required minLength={3} maxLength={120} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={KINDS.find((k) => k.id === kind)!.hint} />
          </label>
          <label className="block">
            <span className={labelCls}>Açıklama</span>
            <textarea
              className={`${fieldCls} h-auto min-h-[120px] py-2 leading-relaxed`}
              required
              minLength={10}
              maxLength={4000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={kind === 'hata' ? 'Ne yaptınız, ne bekliyordunuz, ne oldu?' : 'Ayrıntıları yazın…'}
            />
          </label>
          {kind === 'hata' && (
            <label className="flex items-start gap-2 text-xs text-subtle">
              <input type="checkbox" className="mt-0.5 w-4 h-4 accent-[var(--color-brand)]" checked={withDevice} onChange={(e) => setWithDevice(e.target.checked)} />
              Tarayıcı ve ekran bilgisini ekle (hatayı bulmayı kolaylaştırır)
            </label>
          )}
          {msg && <Message {...msg} />}
          <button type="submit" disabled={busy} className={primaryBtn}>
            <Send className="w-4 h-4" /> {busy ? 'Gönderiliyor…' : 'Gönder'}
          </button>
        </form>
      </Panel>

      <Panel title="Gönderdikleriniz">
        {!items ? (
          <p className="text-xs text-muted">Yükleniyor…</p>
        ) : mine.length === 0 ? (
          <p className="text-xs text-muted">Henüz bir bildiriminiz yok.</p>
        ) : (
          <ul className="divide-y divide-line -my-2">
            {mine.map((i) => (
              <li key={i.id} className="py-3 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] text-muted">{FEEDBACK_KIND_LABEL[i.kind]}</span>
                  <StatusBadge status={i.status} />
                  <span className="text-[11px] text-muted ml-auto">{getRelativeTimeTurkish(i.createdAt)}</span>
                </div>
                <p className="text-sm text-fg break-words">{i.subject}</p>
                <p className="text-xs text-subtle whitespace-pre-line break-words line-clamp-4">{i.message}</p>
                {i.adminNote && (
                  <p className="text-xs text-body rounded-md bg-surface-2 border border-line px-3 py-2 whitespace-pre-line break-words">
                    <span className="text-muted">Yönetici: </span>
                    {i.adminNote}
                  </p>
                )}
                {i.status === 'yeni' && (
                  <button
                    type="button"
                    className="text-xs text-muted hover:text-rose-300"
                    onClick={async () => {
                      if (await withdraw(i.id)) await reload();
                    }}
                  >
                    Geri çek
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
