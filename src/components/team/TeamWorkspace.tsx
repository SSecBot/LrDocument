'use client';

import { t, tx, intlLocale } from '@/lib/i18n';
import { ERR, responseError, thrownError } from '@/lib/errors';
import React, { useCallback, useEffect, useState } from 'react';
import { Check, Copy, KeyRound, Loader2, Plus, Trash2, Users } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { Modal } from '@/components/ui/Modal';
import {
  CORP_ACCESS_LABEL,
  CORP_MODULES,
  CORP_MODULE_LABEL,
  ORG_ROLE_LABEL,
  type CorpAccess,
  type CorpModule,
  type CorpPermissions,
} from '@/lib/corporate';
import { formatTL, seatPrice, type SubscriptionPlanName } from '@/lib/pricing';

interface Member {
  id: string;
  name: string;
  role: 'MANAGER' | 'MEMBER';
  permissions: CorpPermissions;
  codeHint: string;
  live: boolean;
  lastSeenAt: string | null;
  createdAt: string;
}

interface TeamData {
  owner: { name: string; email?: string; live: boolean } | null;
  organization: string | null;
  seats: number;
  subscriptionPlan: SubscriptionPlanName;
  maxMembers: number;
  maxManagers: number;
  members: Member[];
}

const selectCls =
  'h-8 bg-app border border-line rounded-md px-2 text-xs text-fg focus:outline-none focus:border-line-strong disabled:opacity-60';

/** Kurum ve Ekip: people, their personal codes, roles and per-module permissions. */
export function TeamWorkspace() {
  const { currentUser, systemSettings, addToast } = useAppStore();
  const isOwner = currentUser?.orgRole === 'OWNER';
  const [data, setData] = useState<TeamData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<'MEMBER' | 'MANAGER'>('MEMBER');
  const [shownCode, setShownCode] = useState<{ name: string; code: string } | null>(null);
  const [confirm, setConfirm] = useState<{ kind: 'remove' | 'code'; member: Member } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/org/members', { cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(responseError(res, json, t('Kurum bilgileri alınamadı.')));
      setData(json as TeamData);
      setError(null);
    } catch (err) {
      setError(thrownError(err, t('Kurum bilgileri alınamadı.')));
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch
    load();
  }, [load]);

  const call = async (key: string, url: string, init: RequestInit): Promise<Record<string, unknown> | null> => {
    setBusy(key);
    try {
      const res = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json' } });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        addToast({ type: 'error', title: t('İşlem yapılamadı'), message: responseError(res, json, t('Değişiklik kaydedilemedi.')) });
        return null;
      }
      await load();
      return json;
    } catch {
      addToast({ type: 'error', title: t('Bağlantı hatası'), message: ERR.network });
      return null;
    } finally {
      setBusy(null);
    }
  };

  const addMember = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (name.length < 2) return;
    const json = await call('add', '/api/org/members', { method: 'POST', body: JSON.stringify({ name, role: newRole }) });
    if (json?.code) {
      setShownCode({ name, code: String(json.code) });
      setNewName('');
      setNewRole('MEMBER');
    }
  };

  const patch = (m: Member, body: Record<string, unknown>) =>
    call(m.id, `/api/org/members/${encodeURIComponent(m.id)}`, { method: 'PATCH', body: JSON.stringify(body) });

  const setPermission = (m: Member, module: CorpModule, access: CorpAccess) => patch(m, { permissions: { ...m.permissions, [module]: access } });

  const runConfirm = async () => {
    if (!confirm) return;
    const { kind, member } = confirm;
    setConfirm(null);
    if (kind === 'remove') {
      const ok = await call(member.id, `/api/org/members/${encodeURIComponent(member.id)}`, { method: 'DELETE' });
      if (ok) addToast({ type: 'success', title: t('Kişi çıkarıldı'), message: t('{name} artık kuruma giriş yapamaz.', { name: member.name }) });
    } else {
      const json = await patch(member, { regenerateCode: true });
      if (json?.code) setShownCode({ name: member.name, code: String(json.code) });
    }
  };

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-sm text-rose-300" role="alert">
        {tx(error)}
      </div>
    );
  }
  if (!data) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted text-sm gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />{' '}{t('Yükleniyor…')}
      </div>
    );
  }

  const managers = data.members.filter((m) => m.role === 'MANAGER').length;
  const plan = data.subscriptionPlan === 'Tek Seferlik' ? 'Tek Seferlik' : 'Aylık';
  const perSeat = seatPrice(plan, 'CORPORATE', systemSettings.pricing);
  const full = data.members.length >= data.maxMembers;

  return (
    <div className="flex-1 overflow-y-auto bg-app p-4 sm:p-5">
      <div className="max-w-6xl mx-auto space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-semibold text-fg tracking-tight truncate">{data.organization || t('Kurum')}</h1>
            <p className="text-xs text-muted">
              {ORG_ROLE_LABEL[currentUser?.orgRole ?? 'MEMBER']}{' '}{t('olarak görüntülüyorsunuz. Kurumdaki her şey ortak; izinler kişi başına ayarlanır.')}
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <Info label={t('Kişi sayısı')} value={`${data.seats}`} hint={t('Sahip + {length} kişi · en fazla {v1}', { length: data.members.length, v1: data.maxMembers + 1 })} />
          <Info label={t('Yönetici')} value={`${managers} / ${data.maxManagers}`} hint={t('Yöneticiler tüm bölümleri düzenler ve üyelerin izinlerini ayarlar.')} />
          {isOwner && (data.subscriptionPlan as string) === 'VIP' ? (
            <Info label={t('Ücret')} value="VIP · ücretsiz" hint={t('Yönetici ödemeyi kalıcı olarak kaldırdı; kişi ekleseniz de ücret istenmez.')} />
          ) : isOwner ? (
            <Info
              label={plan === 'Tek Seferlik' ? t('Ömür boyu ücret') : t('Aylık ücret')}
              value={formatTL(perSeat * data.seats)}
              hint={t('{seats} kişi × {v1} (normal fiyatın %{corporatePercent}\'i). Kişi ekledikçe değişir.', { seats: data.seats, v1: formatTL(perSeat), corporatePercent: systemSettings.pricing.corporatePercent })}
            />
          ) : (
            <Info label={t('Kurum sahibi')} value={data.owner?.name ?? '—'} hint={data.owner?.live ? t('Şu anda çevrimiçi') : undefined} />
          )}
        </div>

        {isOwner && (
          <form onSubmit={addMember} className="rounded-lg bg-surface border border-line p-4 space-y-3" aria-label={t('Kişi ekle')}>
            <div>
              <h2 className="text-sm font-semibold text-fg">{t('Kişi ekle')}</h2>
              <p className="text-xs text-muted mt-0.5">
                {t('Eklenen kişiye özel bir kurumsal kod oluşturulur. Kişi, giriş sayfasında “Kurumsal giriş”i seçip bu kodla doğrudan bu kuruma girer.')}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t('Ad soyad')}
                aria-label={t('Ad soyad')}
                maxLength={80}
                className="flex-1 h-10 bg-app border border-line rounded-md px-3 text-sm text-fg placeholder-muted focus:outline-none focus:border-line-strong"
              />
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as 'MEMBER' | 'MANAGER')}
                aria-label={t('Rol')}
                className="h-10 bg-app border border-line rounded-md px-3 text-sm text-fg focus:outline-none"
              >
                <option value="MEMBER">{t('Üye')}</option>
                <option value="MANAGER" disabled={managers >= data.maxManagers}>
                  {t('Yönetici')}{managers >= data.maxManagers ? ' (dolu)' : ''}
                </option>
              </select>
              <button
                type="submit"
                disabled={busy === 'add' || newName.trim().length < 2 || full}
                className="h-10 px-4 rounded-md bg-brand hover:bg-brand-hover text-white text-sm font-medium inline-flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {busy === 'add' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}{' '}{t('Ekle ve kod oluştur')}
              </button>
            </div>
            {full && <p className="text-xs text-amber-300">{t('Kişi sınırına ulaşıldı. Sınırı yönetici panelinden sistem yöneticisi belirler.')}</p>}
          </form>
        )}

        <section className="rounded-lg bg-surface border border-line overflow-hidden" aria-label={t('Kişiler')}>
          <header className="px-4 py-3 border-b border-line flex items-center justify-between">
            <h2 className="text-sm font-semibold text-fg">{t('Kişiler ve izinler')}</h2>
            <span className="text-[11px] text-muted">{t('Gizli · Görüntüler · Düzenler')}</span>
          </header>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[860px]">
              <thead>
                <tr className="text-left text-[11px] text-muted border-b border-line">
                  <th className="px-4 py-2 font-medium">{t('Kişi')}</th>
                  <th className="px-2 py-2 font-medium">{t('Rol')}</th>
                  {CORP_MODULES.map((m) => (
                    <th key={m} className="px-2 py-2 font-medium whitespace-nowrap">
                      {tx(CORP_MODULE_LABEL[m])}
                    </th>
                  ))}
                  <th className="px-4 py-2 font-medium text-right">{t('Kod')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                <tr>
                  <td className="px-4 py-3">
                    <PersonCell name={data.owner?.name ?? 'Kurum sahibi'} sub={tx(data.owner?.email)} live={!!data.owner?.live} />
                  </td>
                  <td className="px-2 py-3 text-xs text-subtle">{tx(ORG_ROLE_LABEL.OWNER)}</td>
                  <td colSpan={CORP_MODULES.length} className="px-2 py-3 text-xs text-muted">
                    {t('Her şeyi görür ve düzenler; kişi ekler, çıkarır ve kod verir.')}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-muted">{t('E-posta ile')}</td>
                </tr>
                {data.members.length === 0 && (
                  <tr>
                    <td colSpan={CORP_MODULES.length + 3} className="px-4 py-6 text-center text-xs text-muted">
                      {t('Henüz kimse eklenmedi.')}
                    </td>
                  </tr>
                )}
                {data.members.map((m) => {
                  const canSetPermissions = isOwner || m.role === 'MEMBER';
                  const rowBusy = busy === m.id;
                  return (
                    <tr key={m.id} className={rowBusy ? 'opacity-60' : undefined}>
                      <td className="px-4 py-3">
                        <PersonCell
                          name={m.name}
                          sub={m.live ? t('Çevrimiçi') : m.lastSeenAt ? t('Son görülme {v0}', { v0: new Date(m.lastSeenAt).toLocaleString(intlLocale(), { dateStyle: 'short', timeStyle: 'short' }) }) : t('Henüz giriş yapmadı')}
                          live={m.live}
                        />
                      </td>
                      <td className="px-2 py-3">
                        {isOwner ? (
                          <select
                            value={m.role}
                            disabled={rowBusy}
                            onChange={(e) => patch(m, { role: e.target.value })}
                            aria-label={t('{name} rolü', { name: m.name })}
                            className={selectCls}
                          >
                            <option value="MEMBER">{t('Üye')}</option>
                            <option value="MANAGER" disabled={m.role !== 'MANAGER' && managers >= data.maxManagers}>
                              {t('Yönetici')}
                            </option>
                          </select>
                        ) : (
                          <span className="text-xs text-subtle">{tx(ORG_ROLE_LABEL[m.role])}</span>
                        )}
                      </td>
                      {m.role === 'MANAGER' ? (
                        <td colSpan={CORP_MODULES.length} className="px-2 py-3 text-xs text-muted">
                          {t('Yönetici: tüm bölümleri görür ve düzenler.')}
                        </td>
                      ) : (
                        CORP_MODULES.map((mod) => (
                          <td key={mod} className="px-2 py-3">
                            <select
                              value={m.permissions[mod]}
                              disabled={!canSetPermissions || rowBusy}
                              onChange={(e) => setPermission(m, mod, e.target.value as CorpAccess)}
                              aria-label={`${m.name} – ${CORP_MODULE_LABEL[mod]}`}
                              className={selectCls}
                            >
                              {(['none', 'view', 'edit'] as CorpAccess[]).map((a) => (
                                <option key={a} value={a}>
                                  {tx(CORP_ACCESS_LABEL[a])}
                                </option>
                              ))}
                            </select>
                          </td>
                        ))
                      )}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-[11px] font-mono text-muted mr-1" title={t('Kodun son karakterleri')}>
                            …{tx(m.codeHint)}
                          </span>
                          {isOwner && (
                            <>
                              <button
                                onClick={() => setConfirm({ kind: 'code', member: m })}
                                disabled={rowBusy}
                                title={t('Yeni kod oluştur')}
                                aria-label={t('{name} için yeni kod', { name: m.name })}
                                className="w-8 h-8 rounded-md flex items-center justify-center text-subtle hover:text-fg hover:bg-surface-2"
                              >
                                <KeyRound className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setConfirm({ kind: 'remove', member: m })}
                                disabled={rowBusy}
                                title={t('Kurumdan çıkar')}
                                aria-label={t('{name} kişisini çıkar', { name: m.name })}
                                className="w-8 h-8 rounded-md flex items-center justify-center text-rose-300 hover:bg-rose-500/10"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {shownCode && <CodeDialog name={shownCode.name} code={shownCode.code} onClose={() => setShownCode(null)} />}

      {confirm && (
        <Modal isOpen onClose={() => setConfirm(null)} title={confirm.kind === 'remove' ? t('Kişiyi çıkar') : t('Yeni kod oluştur')} maxWidth="max-w-md">
          <div className="space-y-4 text-sm text-body">
            <p>
              {confirm.kind === 'remove'
                ? t('{name} kurumdan çıkarılacak ve oturumu kapanacak. Kurumdaki ortak veriler silinmez.', { name: confirm.member.name })
                : t('{name} için yeni bir kod oluşturulacak. Eski kod hemen geçersiz olur ve açık oturumları kapanır.', { name: confirm.member.name })}
            </p>
            <div className="modal-actions flex justify-end gap-2">
              <button onClick={() => setConfirm(null)} className="h-10 px-4 rounded-md border border-line text-subtle hover:text-fg">
                {t('Vazgeç')}
              </button>
              <button
                onClick={runConfirm}
                className={`h-10 px-4 rounded-md text-white text-sm font-medium ${confirm.kind === 'remove' ? 'bg-rose-600 hover:bg-rose-500' : 'bg-brand hover:bg-brand-hover'}`}
              >
                {confirm.kind === 'remove' ? t('Çıkar') : t('Yeni kod oluştur')}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Info({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg bg-surface border border-line p-3.5">
      <p className="text-[11px] text-muted">{tx(label)}</p>
      <p className="text-lg font-semibold text-fg tabular-nums mt-1">{tx(value)}</p>
      {hint && <p className="text-[11px] text-muted mt-0.5">{tx(hint)}</p>}
    </div>
  );
}

function PersonCell({ name, sub, live }: { name: string; sub?: string; live: boolean }) {
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <span className="relative w-8 h-8 rounded-full bg-surface-3 text-body flex items-center justify-center text-xs font-semibold shrink-0">
        {tx(name.charAt(0).toUpperCase())}
        <span
          className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-surface ${live ? 'bg-emerald-400' : 'bg-surface-4'}`}
          aria-hidden="true"
        />
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] text-fg truncate">{tx(name)}</span>
        {sub && <span className="block text-[11px] text-muted truncate">{tx(sub)}</span>}
      </span>
    </div>
  );
}

/** Shows a freshly created code once; it is not stored in readable form anywhere. */
function CodeDialog({ name, code, onClose }: { name: string; code: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  return (
    <Modal isOpen onClose={onClose} title={t('Kurumsal kod')} subtitle={tx(name)} maxWidth="max-w-md">
      <div className="space-y-4">
        <div className="rounded-lg border border-line-strong bg-app p-4 text-center">
          <p className="font-mono text-xl sm:text-2xl tracking-wider text-fg select-all break-all">{tx(code)}</p>
        </div>
        <p className="text-xs text-subtle leading-relaxed">
          {t('Bu kodu')}{' '}{tx(name)}{' '}{t('ile güvenli bir yoldan paylaşın. Kod yalnızca şimdi gösterilir; sunucuda okunabilir hâli tutulmaz. Kaybedilirse “Yeni kod oluştur” ile değiştirebilirsiniz. Giriş: giriş sayfası › Kurumsal giriş.')}
        </p>
        <div className="modal-actions flex justify-end gap-2">
          <button onClick={copy} className="h-10 px-4 rounded-md border border-line text-body hover:bg-surface-2 inline-flex items-center gap-2 text-sm">
            {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />} {copied ? t('Kopyalandı') : t('Kopyala')}
          </button>
          <button onClick={onClose} className="h-10 px-4 rounded-md bg-brand hover:bg-brand-hover text-white text-sm font-medium">
            {t('Tamam')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
