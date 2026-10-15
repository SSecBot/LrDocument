'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { ArrowRightLeft, Bug, CalendarRange, Check, Inbox, Lightbulb, Loader2, MessageSquarePlus, RefreshCw, Trash2, X } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { DECISION_KINDS, FEEDBACK_KIND_LABEL, isOpenStatus, type AdminFeedbackItem, type FeedbackKind, type FeedbackStatus } from '@/lib/feedback';
import { StatusBadge } from '@/components/settings/SupportSections';
import { formatTurkishDate, getRelativeTimeTurkish } from '@/lib/utils';

const KIND_ICON: Record<FeedbackKind, React.ElementType> = {
  istek: MessageSquarePlus,
  oneri: Lightbulb,
  hata: Bug,
  'hesap-gecis': ArrowRightLeft,
  takvim: CalendarRange,
};

type Filter = 'acik' | 'hepsi' | FeedbackKind;
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'acik', label: 'Açık' },
  { id: 'hesap-gecis', label: 'Hesap geçişi' },
  { id: 'takvim', label: 'Takvim' },
  { id: 'hata', label: 'Hata' },
  { id: 'istek', label: 'İstek' },
  { id: 'oneri', label: 'Öneri' },
  { id: 'hepsi', label: 'Tümü' },
];

const btn = 'h-9 px-3 rounded-md text-xs font-medium inline-flex items-center justify-center gap-1.5 disabled:opacity-50 transition-colors';

/** Yönetici Paneli › Talepler: user reports and requests that need a decision. */
export function FeedbackInbox({ onCountChange }: { onCountChange?: (open: number) => void }) {
  const { addToast } = useAppStore();
  const [items, setItems] = useState<AdminFeedbackItem[] | null>(null);
  const [filter, setFilter] = useState<Filter>('acik');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const apply = useCallback(
    (json: { items?: AdminFeedbackItem[]; openCount?: number } | null) => {
      setItems(json?.items ?? []);
      onCountChange?.(json?.openCount ?? 0);
    },
    [onCountChange]
  );

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/feedback', { cache: 'no-store' }).catch(() => null);
    apply(res?.ok ? await res.json().catch(() => null) : null);
  }, [apply]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/feedback', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => !cancelled && apply(json))
      .catch(() => !cancelled && apply(null));
    return () => {
      cancelled = true;
    };
  }, [apply]);

  const patch = async (item: AdminFeedbackItem, body: { status?: FeedbackStatus; decision?: 'approve' | 'reject'; adminNote?: string }) => {
    setBusyId(item.id);
    try {
      const res = await fetch(`/api/admin/feedback/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, adminNote: notes[item.id] ?? item.adminNote ?? undefined }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'İşlem yapılamadı.');
      if (body.decision === 'approve') {
        addToast({ type: 'success', title: item.kind === 'takvim' ? 'Takvim yayınlandı' : 'Hesap bireysele geçirildi', message: 'Kullanıcıya e-posta gönderiliyor.' });
      }
      await load();
    } catch (err) {
      addToast({ type: 'error', title: 'Hata', message: (err as Error).message });
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (item: AdminFeedbackItem) => {
    if (!confirm('Bu kayıt silinsin mi?')) return;
    setBusyId(item.id);
    await fetch(`/api/admin/feedback/${item.id}`, { method: 'DELETE' }).catch(() => null);
    await load();
    setBusyId(null);
  };

  const visible = (items ?? []).filter((i) => (filter === 'acik' ? isOpenStatus(i.status) : filter === 'hepsi' ? true : i.kind === filter));

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar flex-1 -mx-1 px-1">
          {FILTERS.map((f) => {
            const n = (items ?? []).filter((i) => isOpenStatus(i.status) && (f.id === 'acik' || f.id === 'hepsi' || i.kind === f.id)).length;
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`h-8 px-3 rounded-full text-xs whitespace-nowrap border transition-colors ${
                  filter === f.id ? 'border-brand bg-brand-soft text-fg' : 'border-line text-subtle hover:text-fg'
                }`}
              >
                {f.label}
                {f.id !== 'hepsi' && n > 0 && <span className="ml-1.5 tabular-nums text-brand-light">{n}</span>}
              </button>
            );
          })}
        </div>
        <button onClick={load} className={`${btn} border border-line text-subtle hover:text-fg shrink-0`} aria-label="Yenile">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {!items ? (
        <div className="h-32 flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-subtle animate-spin" />
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line py-12 text-center text-sm text-muted">
          <Inbox className="w-6 h-6 mx-auto mb-2" />
          {filter === 'acik' ? 'Açık talep yok.' : 'Kayıt yok.'}
        </div>
      ) : (
        <ul className="space-y-2">
          {visible.map((item) => {
            const Icon = KIND_ICON[item.kind];
            const open = isOpenStatus(item.status);
            const decision = DECISION_KINDS.includes(item.kind);
            const busy = busyId === item.id;
            return (
              <li key={item.id} className="rounded-lg bg-surface border border-line p-4 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs text-subtle">
                    <Icon className="w-3.5 h-3.5" /> {FEEDBACK_KIND_LABEL[item.kind]}
                  </span>
                  <StatusBadge status={item.status} />
                  <span className="text-[11px] text-muted ml-auto" title={new Date(item.createdAt).toLocaleString('tr-TR')}>
                    {getRelativeTimeTurkish(item.createdAt)}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-fg break-words">{item.subject}</p>
                  <p className="text-xs text-muted mt-0.5 break-words">
                    {item.authorName}
                    {item.user ? ` · ${item.user.email}` : ''}
                    {item.user && item.authorName !== item.user.name ? ` (kurum: ${item.user.name})` : ''}
                  </p>
                </div>
                <p className="text-sm text-body whitespace-pre-line break-words">{item.message}</p>
                {item.context && <p className="text-[11px] text-muted font-mono break-all bg-surface-2 rounded px-2 py-1.5">{item.context}</p>}

                {item.kind === 'takvim' && item.payload?.terms && (
                  <div className="rounded-md border border-line bg-surface-2 p-3 space-y-2 text-xs">
                    <p className="text-fg font-medium">{item.payload.universityName}</p>
                    {item.payload.terms.map((t, i) => (
                      <div key={i} className="space-y-1">
                        <p className="text-body">
                          {t.name}: {t.start ? formatTurkishDate(t.start) : '—'} – {t.end ? formatTurkishDate(t.end) : '—'}
                        </p>
                        {t.holidays.length > 0 && (
                          <ul className="text-muted pl-3 list-disc">
                            {t.holidays.map((h, j) => (
                              <li key={j}>
                                {h.name}: {formatTurkishDate(h.start)}
                                {h.end !== h.start ? ` – ${formatTurkishDate(h.end)}` : ''}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                    <p className="text-muted">Onaylarsanız aynı adlı dönemler yayındaki takvimde değiştirilir, diğerleri korunur.</p>
                  </div>
                )}

                {open ? (
                  <div className="space-y-2">
                    <textarea
                      className="w-full min-h-[64px] bg-app border border-line rounded-md px-3 py-2 text-sm text-fg placeholder-muted focus:outline-none focus:border-line-strong"
                      placeholder="Kullanıcıya not (isteğe bağlı; sonuçla birlikte e-postayla gönderilir)"
                      maxLength={2000}
                      value={notes[item.id] ?? item.adminNote ?? ''}
                      onChange={(e) => setNotes((n) => ({ ...n, [item.id]: e.target.value }))}
                    />
                    <div className="flex flex-wrap gap-2">
                      {decision ? (
                        <>
                          <button disabled={busy} onClick={() => patch(item, { decision: 'approve' })} className={`${btn} bg-emerald-600 hover:bg-emerald-500 text-white`}>
                            <Check className="w-3.5 h-3.5" /> {item.kind === 'takvim' ? 'Onayla ve yayınla' : 'Onayla, bireysele geçir'}
                          </button>
                          <button disabled={busy} onClick={() => patch(item, { decision: 'reject' })} className={`${btn} border border-rose-500/40 text-rose-300 hover:bg-rose-500/10`}>
                            <X className="w-3.5 h-3.5" /> Reddet
                          </button>
                        </>
                      ) : (
                        <>
                          <button disabled={busy} onClick={() => patch(item, { status: 'cozuldu' })} className={`${btn} bg-emerald-600 hover:bg-emerald-500 text-white`}>
                            <Check className="w-3.5 h-3.5" /> Tamamlandı
                          </button>
                          <button disabled={busy} onClick={() => patch(item, { status: 'reddedildi' })} className={`${btn} border border-line text-subtle hover:text-fg`}>
                            Reddet
                          </button>
                        </>
                      )}
                      {item.status === 'yeni' && (
                        <button disabled={busy} onClick={() => patch(item, { status: 'inceleniyor' })} className={`${btn} border border-line text-subtle hover:text-fg`}>
                          İnceleniyor
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    {item.adminNote && <p className="text-xs text-subtle flex-1 min-w-0 break-words">Not: {item.adminNote}</p>}
                    {!decision && (
                      <button disabled={busy} onClick={() => patch(item, { status: 'inceleniyor' })} className={`${btn} border border-line text-subtle hover:text-fg`}>
                        Yeniden aç
                      </button>
                    )}
                    <button disabled={busy} onClick={() => remove(item)} className={`${btn} text-muted hover:text-rose-300 ml-auto`} aria-label="Sil">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
