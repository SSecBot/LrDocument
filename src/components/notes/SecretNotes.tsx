'use client';

import { t, tx } from '@/lib/i18n';
import { responseError, thrownError } from '@/lib/errors';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Eye, KeyRound, Loader2, Lock, LockOpen, Pencil, Pin, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { KatexPreview } from './KatexPreview';
import { offerUndo, useAppStore } from '@/store/useAppStore';
import { formatTurkishDate } from '@/lib/utils';
import {
  createVault,
  openNote,
  openVault,
  sealNote,
  vaultSupported,
  VAULT_MIN_PASSWORD,
  type VaultMeta,
} from '@/lib/secretVault';

interface PlainNote {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

/** The vault locks itself after this long without any typing or tapping. */
const IDLE_LOCK_MS = 5 * 60_000;
const input =
  'w-full bg-surface-2 border border-line focus:border-brand rounded-lg px-3 py-2.5 text-sm text-fg placeholder-muted focus:outline-none min-h-[44px]';
const primary = 'h-11 px-4 rounded-lg bg-brand hover:bg-brand-hover text-white text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60';
const secondary = 'h-11 px-4 rounded-lg border border-line text-sm text-body hover:bg-surface-2 inline-flex items-center justify-center gap-2';

async function api(body?: Record<string, unknown>) {
  const res = await fetch('/api/secret-notes', body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : { cache: 'no-store' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(responseError(res, data, t('Gizli notlara ulaşılamadı.')));
  return data;
}

/**
 * Gizli notlar: a separate, password-protected list. Notes are encrypted on this device before they
 * are sent; the password and the key never leave the browser, and leaving the view locks it again.
 */
export function SecretNotes({ onExit }: { onExit: () => void }) {
  const { addToast } = useAppStore();
  const [meta, setMeta] = useState<VaultMeta | null | undefined>(undefined);
  const [sealed, setSealed] = useState<{ id: string; payload: string; createdAt: string; updatedAt: string }[]>([]);
  const [key, setKey] = useState<CryptoKey | null>(null);
  const [notes, setNotes] = useState<PlainNote[]>([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await api();
      setMeta(data.vault);
      setSealed(data.notes);
      return data as { vault: VaultMeta | null; notes: typeof sealed };
    } catch (err) {
      setError(thrownError(err));
      setMeta(null);
      return null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    api()
      .then((data) => {
        if (cancelled) return;
        setMeta(data.vault);
        setSealed(data.notes);
      })
      .catch((err) => !cancelled && (setError(thrownError(err)), setMeta(null)));
    return () => {
      cancelled = true;
    };
  }, []);

  const lock = useCallback(() => {
    setKey(null);
    setNotes([]);
  }, []);

  /** Opens the vault: every note is decrypted in memory. */
  const unlock = async (k: CryptoKey) => {
    const fresh = (await load()) ?? { notes: sealed };
    const opened: PlainNote[] = [];
    let broken = 0;
    for (const n of fresh.notes) {
      try {
        const plain = await openNote(k, n.payload);
        opened.push({ id: n.id, createdAt: n.createdAt, updatedAt: n.updatedAt, title: plain.title, content: plain.content, isPinned: !!plain.isPinned });
      } catch {
        broken++;
      }
    }
    if (broken) addToast({ type: 'warning', title: t('{broken} not açılamadı', { broken }), message: t('Bu notlar başka bir şifreyle kaydedilmiş olabilir.') });
    setNotes(opened);
    setKey(k);
  };

  // Idle lock and lock when the app stays in the background.
  useEffect(() => {
    if (!key) return;
    let timer = setTimeout(lock, IDLE_LOCK_MS);
    let hiddenAt = 0;
    const bump = () => {
      clearTimeout(timer);
      timer = setTimeout(lock, IDLE_LOCK_MS);
    };
    const onVisibility = () => {
      if (document.hidden) hiddenAt = Date.now();
      else if (hiddenAt && Date.now() - hiddenAt > 60_000) lock();
    };
    window.addEventListener('pointerdown', bump);
    window.addEventListener('keydown', bump);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('pointerdown', bump);
      window.removeEventListener('keydown', bump);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [key, lock]);

  const header = (
    <div className="flex items-center gap-2 px-4 py-3 border-b border-line bg-surface">
      <button onClick={onExit} className="w-10 h-10 -ml-2 rounded-md inline-flex items-center justify-center text-subtle hover:text-fg hover:bg-surface-2" aria-label={t('Notlara dön')}>
        <ArrowLeft className="w-4 h-4" />
      </button>
      <h2 className="text-sm font-semibold text-fg flex items-center gap-2 flex-1 min-w-0">
        <Lock className="w-4 h-4 text-amber-400 shrink-0" />{' '}{t('Gizli Notlar')}
      </h2>
      {key && (
        <button onClick={lock} className="h-9 px-3 rounded-md border border-line text-xs text-body hover:bg-surface-2 inline-flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5" />{' '}{t('Kilitle')}
        </button>
      )}
    </div>
  );

  let body: React.ReactNode;
  if (meta === undefined) {
    body = (
      <div className="flex-1 flex items-center justify-center text-muted">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  } else if (!vaultSupported()) {
    body = <Center icon={Lock} title={t('Bu tarayıcı desteklemiyor')}>{t('Gizli notlar için güncel bir tarayıcı ve HTTPS bağlantısı gerekir.')}</Center>;
  } else if (error && !meta) {
    body = <Center icon={Lock} title={t('Gizli notlar açılamadı')}>{tx(error)}</Center>;
  } else if (!meta) {
    body = <SetupForm onCreated={(m, k) => (setMeta(m), setKey(k), setNotes([]))} />;
  } else if (!key) {
    body = <UnlockForm meta={meta} onOpen={unlock} onReset={() => (setMeta(null), setSealed([]))} />;
  } else {
    body = <Vault vaultKey={key} notes={notes} setNotes={setNotes} onRekey={(m, k) => (setMeta(m), setKey(k))} />;
  }

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-app">
      {header}
      {body}
    </div>
  );
}

function Center({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="flex-1 overflow-y-auto flex items-start sm:items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-sm space-y-4 py-6">
        <div className="w-12 h-12 rounded-xl bg-surface border border-line flex items-center justify-center text-amber-400 mx-auto">
          <Icon className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-fg text-center">{tx(title)}</h3>
        <div className="text-sm text-subtle space-y-3">{children}</div>
      </div>
    </div>
  );
}

function SetupForm({ onCreated }: { onCreated: (meta: VaultMeta, key: CryptoKey) => void }) {
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < VAULT_MIN_PASSWORD) return setErr(t('Şifre en az {VAULT_MIN_PASSWORD} karakter olmalı.', { VAULT_MIN_PASSWORD }));
    if (pw !== pw2) return setErr(t('Şifreler aynı değil.'));
    setBusy(true);
    setErr('');
    try {
      const { meta, key } = await createVault(pw);
      await api({ action: 'setup', vault: meta });
      onCreated(meta, key);
    } catch (error) {
      setErr(thrownError(error));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Center icon={ShieldCheck} title={t('Gizli notlar için şifre belirleyin')}>
      <p className="text-center">
        {t('Gizli notlar bu cihazda şifrelenip öyle kaydedilir; sunucu ve yönetici bile içeriğini göremez. Hesap şifrenizden farklı bir şifre seçin.')}
      </p>
      <form onSubmit={submit} className="space-y-3">
        <input type="password" autoComplete="new-password" placeholder={t('Gizli notlar şifresi')} value={pw} onChange={(e) => setPw(e.target.value)} className={input} aria-label={t('Gizli notlar şifresi')} />
        <input type="password" autoComplete="new-password" placeholder={t('Şifre (tekrar)')} value={pw2} onChange={(e) => setPw2(e.target.value)} className={input} aria-label={t('Şifre (tekrar)')} />
        <p className="text-xs text-amber-300">{t('Bu şifreyi unutursanız gizli notlar kurtarılamaz; yalnızca silinip baştan başlanabilir.')}</p>
        {err && <p className="text-xs text-rose-400" role="alert">{tx(err)}</p>}
        <button type="submit" disabled={busy} className={`${primary} w-full`}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}{' '}{t('Şifreyi oluştur')}
        </button>
      </form>
    </Center>
  );
}

function UnlockForm({ meta, onOpen, onReset }: { meta: VaultMeta; onOpen: (key: CryptoKey) => Promise<void>; onReset: () => void }) {
  const { addToast } = useAppStore();
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [fails, setFails] = useState(0);
  const [resetOpen, setResetOpen] = useState(false);
  const [accountPw, setAccountPw] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [resetErr, setResetErr] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pw || busy) return;
    setBusy(true);
    setErr('');
    // Slows down guessing on a shared device (the key derivation itself also takes a moment).
    if (fails >= 3) await new Promise((r) => setTimeout(r, Math.min(30_000, 2000 * 2 ** (fails - 3))));
    const key = await openVault(pw, meta);
    if (!key) {
      setFails((f) => f + 1);
      setErr(t('Şifre hatalı.'));
      setBusy(false);
      return;
    }
    setPw('');
    await onOpen(key);
    setBusy(false);
  };

  const reset = async () => {
    setResetErr('');
    try {
      await api({ action: 'reset', password: accountPw });
      setResetOpen(false);
      addToast({ type: 'success', title: t('Gizli notlar sıfırlandı'), message: t('Yeni bir şifre belirleyebilirsiniz.') });
      onReset();
    } catch (error) {
      setResetErr(thrownError(error));
    }
  };

  return (
    <Center icon={Lock} title={t('Gizli notlar kilitli')}>
      <form onSubmit={submit} className="space-y-3">
        <input
          type="password"
          autoComplete="current-password"
          autoFocus
          placeholder={t('Gizli notlar şifresi')}
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          className={input}
          aria-label={t('Gizli notlar şifresi')}
        />
        {err && <p className="text-xs text-rose-400" role="alert">{tx(err)}</p>}
        <button type="submit" disabled={busy || !pw} className={`${primary} w-full`}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <LockOpen className="w-4 h-4" />}{' '}{t('Kilidi aç')}
        </button>
      </form>
      <button onClick={() => setResetOpen(true)} className="text-xs text-muted hover:text-fg underline underline-offset-2 mx-auto block">
        {t('Şifremi unuttum')}
      </button>

      <Modal isOpen={resetOpen} onClose={() => setResetOpen(false)} title={t('Gizli notları sıfırla')} subtitle={t('Şifre olmadan notlar açılamaz.')} maxWidth="max-w-md">
        <div className="space-y-3">
          <p className="text-sm text-body">
            {t('Gizli notlar şifreniz hiçbir yerde saklanmadığı için kurtarılamaz. Sıfırlarsanız')}{' '}<strong className="text-rose-300">{t('bütün gizli notlar kalıcı olarak silinir')}</strong>{' '}{t('ve yeni şifre belirlersiniz.')}
          </p>
          <input type="password" autoComplete="current-password" placeholder={t('Hesap şifreniz')} value={accountPw} onChange={(e) => setAccountPw(e.target.value)} className={input} aria-label={t('Hesap şifreniz')} />
          <input placeholder={t('Onaylamak için "SİL" yazın')} value={confirmText} onChange={(e) => setConfirmText(e.target.value)} className={input} aria-label={t('Onay')} />
          {resetErr && <p className="text-xs text-rose-400" role="alert">{tx(resetErr)}</p>}
        </div>
        <div className="modal-actions">
          <button onClick={() => setResetOpen(false)} className={secondary}>{t('Vazgeç')}</button>
          <button
            onClick={reset}
            disabled={!accountPw || confirmText.trim().toLocaleUpperCase('tr') !== 'SİL'}
            className="h-11 px-4 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold disabled:opacity-50"
          >
            {t('Tümünü sil ve sıfırla')}
          </button>
        </div>
      </Modal>
    </Center>
  );
}

function Vault({
  vaultKey,
  notes,
  setNotes,
  onRekey,
}: {
  vaultKey: CryptoKey;
  notes: PlainNote[];
  setNotes: React.Dispatch<React.SetStateAction<PlainNote[]>>;
  onRekey: (meta: VaultMeta, key: CryptoKey) => void;
}) {
  const { addToast } = useAppStore();
  const [activeId, setActiveId] = useState<string | null>(notes[0]?.id ?? null);
  const [mobileView, setMobileView] = useState<'list' | 'editor'>('list');
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [saving, setSaving] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [deleting, setDeleting] = useState<PlainNote | null>(null);
  const [rekeyOpen, setRekeyOpen] = useState(false);
  const pending = useRef(new Map<string, { timer: ReturnType<typeof setTimeout>; note: PlainNote }>());

  const sorted = [...notes].sort((a, b) => (a.isPinned !== b.isPinned ? (a.isPinned ? -1 : 1) : b.updatedAt.localeCompare(a.updatedAt)));
  const active = notes.find((n) => n.id === activeId) ?? null;

  const save = useCallback(
    async (note: PlainNote) => {
      setSaving('saving');
      try {
        await api({ action: 'save', id: note.id, payload: await sealNote(vaultKey, note) });
        setSaving('saved');
      } catch (err) {
        setSaving('error');
        addToast({ type: 'error', title: t('Gizli not kaydedilemedi'), message: thrownError(err) });
      }
    },
    [vaultKey, addToast]
  );
  const scheduleSave = (note: PlainNote) => {
    const prev = pending.current.get(note.id);
    if (prev) clearTimeout(prev.timer);
    const timer = setTimeout(() => {
      pending.current.delete(note.id);
      void save(note);
    }, 700);
    pending.current.set(note.id, { timer, note });
  };
  // Edits still waiting are written (with the key still in hand) when the vault locks or closes.
  useEffect(() => {
    const waiting = pending.current;
    return () => {
      for (const { timer, note } of waiting.values()) {
        clearTimeout(timer);
        void save(note);
      }
      waiting.clear();
    };
  }, [save]);

  const update = (id: string, patch: Partial<PlainNote>) => {
    const current = notes.find((n) => n.id === id);
    if (!current) return;
    const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
    setNotes((list) => list.map((n) => (n.id === id ? next : n)));
    scheduleSave(next);
  };

  const add = async () => {
    const now = new Date().toISOString();
    const note: PlainNote = { id: crypto.randomUUID(), title: t('Yeni gizli not'), content: '', isPinned: false, createdAt: now, updatedAt: now };
    setNotes((list) => [note, ...list]);
    setActiveId(note.id);
    setMode('edit');
    setMobileView('editor');
    await save(note);
  };

  // Leaves the list at once; the server delete waits for the undo window (see offerUndo).
  const remove = (note: PlainNote) => {
    const index = notes.findIndex((n) => n.id === note.id);
    const putBack = () =>
      setNotes((list) => (list.some((n) => n.id === note.id) ? list : [...list.slice(0, index), note, ...list.slice(index)]));
    setNotes((list) => list.filter((n) => n.id !== note.id));
    if (activeId === note.id) {
      setActiveId(null);
      setMobileView('list');
    }
    setDeleting(null);
    offerUndo({
      title: t('Gizli not silindi'),
      message: note.title,
      undo: putBack,
      commit: () =>
        api({ action: 'delete', id: note.id }).catch((err) => {
          putBack();
          addToast({ type: 'error', title: t('Gizli not silinemedi'), message: thrownError(err) });
        }),
    });
  };

  return (
    <div className="flex flex-1 min-h-0">
      {/* List */}
      <div className={`${mobileView === 'list' ? 'flex' : 'hidden'} md:flex w-full md:w-80 shrink-0 flex-col border-r border-line bg-surface min-h-0`}>
        <div className="p-3 border-b border-line flex items-center gap-2">
          <button onClick={add} className="h-10 px-3 rounded-lg bg-brand hover:bg-brand-hover text-white text-xs font-semibold inline-flex items-center gap-1.5">
            <Plus className="w-4 h-4" />{' '}{t('Yeni gizli not')}
          </button>
          <button onClick={() => setRekeyOpen(true)} className="h-10 px-3 rounded-lg border border-line text-xs text-body hover:bg-surface-2 inline-flex items-center gap-1.5 ml-auto" title={t('Gizli notlar şifresini değiştir')}>
            <KeyRound className="w-3.5 h-3.5" />{' '}{t('Şifre')}
          </button>
        </div>
        <ul className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {sorted.length === 0 && <li className="p-6 text-center text-xs text-muted">{t('Henüz gizli not yok.')}</li>}
          {sorted.map((n) => (
            <li key={n.id}>
              <button
                onClick={() => {
                  setActiveId(n.id);
                  setMobileView('editor');
                }}
                className={`w-full text-left p-3 rounded-xl border transition-colors ${n.id === activeId ? 'bg-surface-2 border-brand' : 'border-line hover:bg-surface-2'}`}
              >
                <span className="flex items-center gap-1.5 text-xs font-semibold text-fg">
                  {n.isPinned && <Pin className="w-3 h-3 text-amber-400 rotate-45 shrink-0" />}
                  <span className="truncate">{n.title || t('Başlıksız')}</span>
                </span>
                <span className="block text-[11px] text-subtle line-clamp-2 mt-1">{n.content.replace(/[#*`$\n]/g, ' ').trim().slice(0, 90) || t('İçerik yok…')}</span>
                <span className="block text-[10px] text-muted mt-1.5">{tx(formatTurkishDate(n.updatedAt))}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Editor */}
      <div className={`${mobileView === 'editor' ? 'flex' : 'hidden'} md:flex flex-1 min-w-0 flex-col min-h-0`}>
        {active ? (
          <>
            <div className="flex items-center gap-1.5 px-3 sm:px-4 py-2 border-b border-line bg-surface flex-wrap">
              <button onClick={() => setMobileView('list')} className="md:hidden w-9 h-9 rounded-md inline-flex items-center justify-center text-subtle hover:bg-surface-2" aria-label={t('Listeye dön')}>
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="inline-flex rounded-md border border-line p-0.5">
                {(['edit', 'preview'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    aria-pressed={mode === m}
                    className={`h-8 px-2.5 rounded text-xs inline-flex items-center gap-1 ${mode === m ? 'bg-surface-3 text-fg' : 'text-subtle hover:text-fg'}`}
                  >
                    {m === 'edit' ? <Pencil className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {m === 'edit' ? t('Düzenle') : t('Önizleme')}
                  </button>
                ))}
              </div>
              <span className="text-[11px] text-muted ml-1" aria-live="polite">
                {saving === 'saving' ? t('Şifrelenip kaydediliyor…') : saving === 'saved' ? t('Kaydedildi') : saving === 'error' ? t('Kaydedilemedi') : ''}
              </span>
              <div className="ml-auto flex items-center gap-1">
                <button
                  onClick={() => update(active.id, { isPinned: !active.isPinned })}
                  aria-pressed={active.isPinned}
                  className={`w-9 h-9 rounded-md inline-flex items-center justify-center hover:bg-surface-2 ${active.isPinned ? 'text-amber-400' : 'text-subtle'}`}
                  aria-label={active.isPinned ? t('Sabitlemeyi kaldır') : t('Sabitle')}
                >
                  <Pin className="w-4 h-4" />
                </button>
                <button onClick={() => setDeleting(active)} className="w-9 h-9 rounded-md inline-flex items-center justify-center text-subtle hover:text-rose-400 hover:bg-surface-2" aria-label={t('Gizli notu sil')}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-3">
              <input
                value={active.title}
                onChange={(e) => update(active.id, { title: e.target.value.slice(0, 200) })}
                placeholder={t('Başlık')}
                aria-label={t('Başlık')}
                className="w-full bg-transparent text-lg sm:text-xl font-semibold text-fg placeholder-muted focus:outline-none"
              />
              {mode === 'edit' ? (
                <textarea
                  value={active.content}
                  onChange={(e) => update(active.id, { content: e.target.value.slice(0, 500_000) })}
                  placeholder={t('Gizli notunuzu yazın… (Markdown ve $LaTeX$ desteklenir)')}
                  aria-label={t('Not içeriği')}
                  className="w-full min-h-[50vh] bg-transparent text-sm text-body leading-relaxed placeholder-muted focus:outline-none resize-none font-mono"
                />
              ) : (
                <KatexPreview content={active.content} />
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-6 text-center text-sm text-muted">
            <div className="space-y-2">
              <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto" />
              <p>{t('Gizli notlarınız bu cihazda şifrelenir.')}</p>
            </div>
          </div>
        )}
      </div>

      <Modal isOpen={!!deleting} onClose={() => setDeleting(null)} title={t('Gizli notu sil')} subtitle={tx(deleting?.title)} maxWidth="max-w-md">
        <p className="text-sm text-body">{t('Bu gizli not silinecek. Sildikten sonra birkaç saniye içinde “Geri al” ile geri getirebilirsiniz.')}</p>
        <div className="modal-actions">
          <button onClick={() => setDeleting(null)} className={secondary}>{t('Vazgeç')}</button>
          <button onClick={() => deleting && remove(deleting)} className="h-11 px-4 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold">
            {t('Sil')}
          </button>
        </div>
      </Modal>

      <RekeyModal open={rekeyOpen} onClose={() => setRekeyOpen(false)} notes={notes} onDone={onRekey} />
    </div>
  );
}

function RekeyModal({ open, onClose, notes, onDone }: { open: boolean; onClose: () => void; notes: PlainNote[]; onDone: (meta: VaultMeta, key: CryptoKey) => void }) {
  const { addToast } = useAppStore();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < VAULT_MIN_PASSWORD) return setErr(t('Şifre en az {VAULT_MIN_PASSWORD} karakter olmalı.', { VAULT_MIN_PASSWORD }));
    if (pw !== pw2) return setErr(t('Şifreler aynı değil.'));
    setBusy(true);
    setErr('');
    try {
      const { meta, key } = await createVault(pw);
      const sealedNotes = await Promise.all(notes.map(async (n) => ({ id: n.id, payload: await sealNote(key, n) })));
      await api({ action: 'rekey', vault: meta, notes: sealedNotes });
      onDone(meta, key);
      setPw('');
      setPw2('');
      onClose();
      addToast({ type: 'success', title: t('Şifre değişti'), message: t('Gizli notlar yeni şifreyle yeniden şifrelendi.') });
    } catch (error) {
      setErr(thrownError(error));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal isOpen={open} onClose={onClose} title={t('Gizli notlar şifresini değiştir')} maxWidth="max-w-md">
      <form onSubmit={submit} className="space-y-3">
        <input type="password" autoComplete="new-password" placeholder={t('Yeni şifre')} value={pw} onChange={(e) => setPw(e.target.value)} className={input} aria-label={t('Yeni şifre')} />
        <input type="password" autoComplete="new-password" placeholder={t('Yeni şifre (tekrar)')} value={pw2} onChange={(e) => setPw2(e.target.value)} className={input} aria-label={t('Yeni şifre (tekrar)')} />
        {err && <p className="text-xs text-rose-400" role="alert">{tx(err)}</p>}
        <div className="modal-actions">
          <button type="button" onClick={onClose} className={secondary}>{t('Vazgeç')}</button>
          <button type="submit" disabled={busy} className={primary}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}{' '}{t('Değiştir')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
