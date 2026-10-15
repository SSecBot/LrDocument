'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, Loader2, LogOut, UserPlus } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

interface RememberedAccount {
  id: string;
  name: string;
  email: string;
  active: boolean;
}

/** List of accounts signed in on this browser, with switch / add / sign-out actions. */
export function AccountSwitcher({ onClose, children }: { onClose?: () => void; children?: React.ReactNode }) {
  const { currentUser, switchAccount, logout } = useAppStore();
  const [accounts, setAccounts] = useState<RememberedAccount[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch('/api/auth/accounts', { signal: ctrl.signal, cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { accounts: [] }))
      .then((d: { accounts: RememberedAccount[] }) => setAccounts(d.accounts))
      .catch(() => setAccounts([]));
    return () => ctrl.abort();
  }, []);

  const list =
    accounts && accounts.length > 0
      ? accounts
      : currentUser
        ? [{ id: currentUser.id, name: currentUser.name, email: currentUser.email, active: true }]
        : [];

  const choose = async (a: RememberedAccount) => {
    if (a.active || busy) return;
    setBusy(a.id);
    setError(null);
    const err = await switchAccount(a.id);
    if (err) {
      setError(err);
      setBusy(null);
    }
  };

  const itemCls = 'w-full min-h-[40px] flex items-center gap-2.5 px-2.5 rounded-md text-left text-[13px] transition-colors';

  return (
    <div className="w-64 max-w-[calc(100vw-24px)] p-1.5 bg-surface border border-line-strong rounded-lg shadow-xl" role="menu" aria-label="Hesaplar">
      {children && <div className="pb-1 mb-1 border-b border-line">{children}</div>}
      <p className="px-2.5 pt-1.5 pb-1 text-[11px] text-muted">Hesaplar</p>
      {accounts === null && (
        <div className="px-2.5 py-2 text-xs text-muted flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Yükleniyor…
        </div>
      )}
      {list.map((a) => (
        <button
          key={a.id}
          role="menuitemradio"
          aria-checked={a.active}
          onClick={() => choose(a)}
          className={`${itemCls} ${a.active ? 'bg-surface-2' : 'hover:bg-surface-2'}`}
        >
          <span className="w-7 h-7 rounded-full bg-surface-3 text-body flex items-center justify-center text-xs font-semibold shrink-0">
            {a.name.charAt(0).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-fg truncate">{a.name}</span>
            <span className="block text-[11px] text-muted truncate">{a.email}</span>
          </span>
          {a.active && <Check className="w-4 h-4 text-brand-light shrink-0" />}
          {busy === a.id && <Loader2 className="w-4 h-4 animate-spin text-muted shrink-0" />}
        </button>
      ))}
      {error && <p className="px-2.5 py-1.5 text-[11px] text-rose-300" role="alert">{error}</p>}
      <div className="my-1 border-t border-line" />
      <Link href="/login?ekle=1" onClick={onClose} role="menuitem" className={`${itemCls} text-body hover:bg-surface-2`}>
        <UserPlus className="w-4 h-4 text-muted" /> Hesap ekle
      </Link>
      <button role="menuitem" onClick={() => logout()} className={`${itemCls} text-body hover:bg-surface-2`}>
        <LogOut className="w-4 h-4 text-muted" /> {list.length > 1 ? 'Bu hesaptan çık' : 'Çıkış yap'}
      </button>
      {list.length > 1 && (
        <button role="menuitem" onClick={() => logout(true)} className={`${itemCls} text-rose-300 hover:bg-surface-2`}>
          <LogOut className="w-4 h-4" /> Tüm hesaplardan çık
        </button>
      )}
    </div>
  );
}
