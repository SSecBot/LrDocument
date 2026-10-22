'use client';

import React, { useState } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { flushPendingMutations, leaveDeletedAccount, useAppStore } from '@/store/useAppStore';
import { DELETE_PHRASE } from '@/lib/deleteAccount';
import { Message, Panel, fieldCls, labelCls } from './settingsUi';

/** Ayarlar › Hesap › Hesabı sil: permanent, after a warning, the password and a typed phrase. */
export function DeleteAccountSection() {
  const { currentUser } = useAppStore();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [phrase, setPhrase] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const corporate = currentUser?.accountType === 'CORPORATE';
  const ready = !!password && phrase.trim().toLocaleUpperCase('tr-TR') === DELETE_PHRASE && !busy;

  const close = () => {
    setOpen(false);
    setPassword('');
    setPhrase('');
    setError(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    setBusy(true);
    setError(null);
    flushPendingMutations();
    try {
      const res = await fetch('/api/auth/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, confirm: phrase }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Hesap silinemedi.');
        setBusy(false);
        return;
      }
      leaveDeletedAccount(!!data.switchedTo);
    } catch {
      setError('Sunucuya ulaşılamadı.');
      setBusy(false);
    }
  };

  if (currentUser?.role === 'ADMIN') return null;

  return (
    <Panel title="Hesabı sil" description="Hesabınızı ve içindeki tüm verileri kalıcı olarak silin.">
      <div className="space-y-3">
        <p className="text-xs text-subtle leading-relaxed">
          Notlarınız, PDF’leriniz, gizli notlarınız, görevleriniz, takviminiz, finans kayıtlarınız
          {corporate ? ', müşterileriniz ve kurumunuza eklediğiniz tüm kişiler' : ''}
          {currentUser?.accountType === 'STUDENT' ? ' ve ders takibi verileriniz' : ''} silinir. Bu işlem geri alınamaz; silmeden önce notlarınızı indirmek isteyebilirsiniz.
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="h-10 px-4 rounded-lg border border-rose-800/70 text-rose-300 hover:bg-rose-500/10 text-sm font-medium inline-flex items-center gap-2"
        >
          <Trash2 className="w-4 h-4" /> Hesabımı sil
        </button>
      </div>

      <Modal isOpen={open} onClose={close} title="Hesabınız kalıcı olarak silinsin mi?" maxWidth="max-w-md">
        <form onSubmit={submit} className="space-y-3.5">
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-rose-950/50 border border-rose-800/60 text-xs text-rose-200 leading-relaxed">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-px" />
            <div className="space-y-1">
              <p className="font-semibold">Bu işlem geri alınamaz.</p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>Hesabınızdaki tüm veriler ve yüklediğiniz dosyalar hemen silinir.</li>
                {corporate && <li>Kurumunuza eklediğiniz kişiler de artık giriş yapamaz.</li>}
                <li>Ödenmiş dönem ücreti iade edilmez (Teslimat ve İade Şartları).</li>
                <li>Aynı e-posta ile yeniden kayıt olabilirsiniz, ancak eski veriler geri gelmez.</li>
              </ul>
            </div>
          </div>
          <label className="block">
            <span className={labelCls}>Şifreniz</span>
            <input type="password" autoComplete="current-password" className={fieldCls} value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          <label className="block">
            <span className={labelCls}>
              Onaylamak için <strong className="text-fg select-all">{DELETE_PHRASE}</strong> yazın
            </span>
            <input className={fieldCls} value={phrase} onChange={(e) => setPhrase(e.target.value)} autoComplete="off" spellCheck={false} />
          </label>
          {error && <Message kind="error" text={error} />}
          <div className="modal-actions flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button type="button" onClick={close} className="h-10 px-4 rounded-lg bg-surface-2 hover:bg-surface-3 text-body text-sm">
              Vazgeç
            </button>
            <button type="submit" disabled={!ready} className="h-10 px-4 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold disabled:opacity-40">
              {busy ? 'Siliniyor…' : 'Hesabımı kalıcı olarak sil'}
            </button>
          </div>
        </form>
      </Modal>
    </Panel>
  );
}
