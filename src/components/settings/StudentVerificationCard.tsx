'use client';

import React, { useEffect, useRef, useState } from 'react';
import { BadgeCheck, Clock, FileUp, GraduationCap, MailCheck, XCircle } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { Message, Panel, primaryBtn } from './settingsUi';

interface Status {
  verified: boolean;
  verifiedAt: string | null;
  method: 'email' | 'document' | null;
  documentStatus: 'pending' | 'rejected' | null;
  studentEmail: string | null;
  academic: boolean;
}

type Msg = { kind: 'ok' | 'error'; text: string } | null;

const secondaryBtn =
  'h-10 px-4 rounded-md border border-line-strong text-body hover:bg-surface-2 text-sm inline-flex items-center justify-center gap-2 disabled:opacity-50';
const MAX_BYTES = 3 * 1024 * 1024;

/** Öğrencilik doğrulaması: code to the university e-mail, or an uploaded öğrenci belgesi. */
export function StudentVerificationCard() {
  const { setSettingsSection } = useAppStore();
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/student/verify', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setStatus(d))
      .catch(() => {});
  }, []);

  const call = async (body: Record<string, unknown>) => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/student/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg({ kind: 'error', text: data.error || 'İşlem yapılamadı.' });
        return null;
      }
      if (data.verified !== undefined) setStatus(data);
      return data;
    } catch {
      setMsg({ kind: 'error', text: 'Sunucuya ulaşılamadı.' });
      return null;
    } finally {
      setBusy(false);
    }
  };

  const upload = async (file: File) => {
    if (file.size > MAX_BYTES) return setMsg({ kind: 'error', text: 'Dosya en fazla 3 MB olabilir.' });
    const buf = new Uint8Array(await file.arrayBuffer());
    let bin = '';
    for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    const ok = await call({ action: 'document', fileName: file.name, mime: file.type, data: btoa(bin) });
    if (ok) setMsg({ kind: 'ok', text: 'Belgeniz yönetici incelemesine gönderildi.' });
  };

  if (!status) return null;

  if (status.verified) {
    return (
      <Panel title="Öğrencilik doğrulaması">
        <p className="text-sm text-emerald-300 flex items-center gap-2">
          <BadgeCheck className="w-4 h-4" />
          Öğrenciliğiniz doğrulandı ({status.method === 'email' ? 'üniversite e-postası' : 'öğrenci belgesi'}
          {status.verifiedAt ? `, ${new Date(status.verifiedAt).toLocaleDateString('tr-TR')}` : ''}).
        </p>
      </Panel>
    );
  }

  return (
    <Panel
      title="Öğrencilik doğrulaması"
      description="Öğrenci indirimi için öğrenciliğinizi doğrulayın: üniversite e-postanıza gelen kodla ya da e-Devlet’ten aldığınız öğrenci belgesiyle."
    >
      <div className="space-y-5 max-w-xl">
        {status.documentStatus === 'pending' && (
          <p className="text-sm text-amber-300 flex items-center gap-2">
            <Clock className="w-4 h-4" /> Belgeniz yönetici incelemesinde.
          </p>
        )}
        {status.documentStatus === 'rejected' && (
          <p className="text-sm text-rose-300 flex items-center gap-2">
            <XCircle className="w-4 h-4" /> Yüklediğiniz belge onaylanmadı; güncel bir öğrenci belgesi yükleyin.
          </p>
        )}

        <div className="space-y-2">
          <h3 className="text-sm font-medium text-fg flex items-center gap-2">
            <MailCheck className="w-4 h-4 text-subtle" /> Üniversite e-postası ile (anında)
          </h3>
          <p className="text-xs text-muted">Öğrenci e-postanıza gelen kodla doğrulayın; doğrulanan adresle giriş de yapabilirsiniz.</p>
          <button type="button" onClick={() => setSettingsSection('guvenlik')} className={primaryBtn}>
            <GraduationCap className="w-4 h-4" /> Güvenlik sekmesinde doğrula
          </button>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-medium text-fg flex items-center gap-2">
            <FileUp className="w-4 h-4 text-subtle" /> Öğrenci belgesi ile
          </h3>
          <p className="text-xs text-muted">PDF, JPG veya PNG, en fazla 3 MB. Belge yalnızca yönetici tarafından incelenir ve karar verildikten sonra silinir.</p>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            className="sr-only"
            tabIndex={-1}
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) upload(f);
            }}
          />
          <button disabled={busy} onClick={() => fileRef.current?.click()} className={secondaryBtn}>
            <FileUp className="w-4 h-4" /> {status.documentStatus === 'pending' ? 'Belgeyi değiştir' : 'Belge yükle'}
          </button>
        </div>
        {msg && <Message {...msg} />}
      </div>
    </Panel>
  );
}
