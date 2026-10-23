'use client';

import { t as tl, tx } from '@/lib/i18n';
import { ERR, responseError } from '@/lib/errors';
import React, { useState } from 'react';
import { useAppStore, type SettingsSection } from '@/store/useAppStore';
import { ACCOUNT_TYPE_LABEL, billingNote, formatPlanPrice } from '@/lib/pricing';
import { StudentProfileCard } from './StudentProfileCard';
import { StudentVerificationCard } from './StudentVerificationCard';
import { AcademicSettingsCard } from './AcademicSettingsCard';
import { hasStudentAccess } from '@/lib/access';
import { ORG_ROLE_LABEL } from '@/lib/corporate';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { Message, Panel, fieldCls, labelCls, primaryBtn } from './settingsUi';
import { EmailSection, EmailVerificationPanel, TwoFactorSection } from './SecuritySections';
import { StudentEmailSection } from './StudentEmailSection';
import { AccountSwitchSection, SupportSection } from './SupportSections';
import { DeleteAccountSection } from './DeleteAccountSection';
import { CurrencyPanel, InstallAppPanel, NotesPanel, NotificationsPanel, ShortcutsPanel } from './PreferenceExtras';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

export function SettingsView() {
  const { currentUser, settingsSection, setSettingsSection } = useAppStore();
  const student = hasStudentAccess(currentUser);

  const tabs: { id: SettingsSection; label: string; show: boolean }[] = [
    { id: 'hesap', label: tl('Hesap'), show: true },
    // Corporate members sign in with the code their owner manages; no e-mail / password of their own.
    { id: 'guvenlik', label: tl('Güvenlik'), show: !currentUser?.memberId },
    { id: 'ogrenci', label: tl('Öğrenci bilgileri'), show: student },
    { id: 'ders', label: tl('Ders takibi'), show: student },
    { id: 'tercihler', label: tl('Tercihler'), show: true },
    { id: 'destek', label: tl('Destek'), show: true },
  ];
  const visible = tabs.filter((t) => t.show);
  const active = visible.some((t) => t.id === settingsSection) ? settingsSection : 'hesap';

  return (
    <div className="flex-1 flex flex-col h-full bg-app text-fg overflow-hidden">
      <div className="border-b border-line bg-surface px-4 sm:px-6 shrink-0">
        <div className="flex gap-1 overflow-x-auto no-scrollbar" role="tablist" aria-label={tl('Ayarlar')}>
          {visible.map((t) => (
            <button
              key={t.id}
              role="tab"
              id={`ayar-${t.id}`}
              aria-selected={active === t.id}
              aria-controls={`ayar-panel-${t.id}`}
              onClick={() => setSettingsSection(t.id)}
              className={`h-11 px-3 text-sm whitespace-nowrap border-b-2 -mb-px transition-colors ${
                active === t.id ? 'border-brand text-fg' : 'border-transparent text-subtle hover:text-fg'
              }`}
            >
              {tx(t.label)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 sm:p-6 max-w-3xl w-full space-y-5" role="tabpanel" id={`ayar-panel-${active}`} aria-labelledby={`ayar-${active}`}>
          {active === 'hesap' && (
            <>
              <AccountSection />
              {currentUser?.accountType === 'STUDENT' && !currentUser.memberId && <AccountSwitchSection />}
              {!currentUser?.memberId && <DeleteAccountSection />}
            </>
          )}
          {active === 'guvenlik' && (
            <>
              <EmailVerificationPanel />
              <EmailSection />
              {currentUser?.accountType === 'STUDENT' && <StudentEmailSection />}
              <PasswordSection />
              <TwoFactorSection />
            </>
          )}
          {active === 'ogrenci' && (
            <>
              {currentUser?.accountType === 'STUDENT' && <StudentVerificationCard />}
              <StudentProfileCard />
            </>
          )}
          {active === 'ders' && <AcademicSettingsCard />}
          {active === 'tercihler' && <PreferencesSection />}
          {active === 'destek' && <SupportSection />}
        </div>
      </div>
    </div>
  );
}

function AccountSection() {
  const { currentUser, systemSettings } = useAppStore();
  const lifetime = currentUser?.subscriptionPlan === 'Tek Seferlik';
  const type = currentUser?.accountType ?? 'STANDARD';
  if (currentUser?.memberId) {
    const memberRows: [string, React.ReactNode][] = [
      [tl('Ad soyad'), currentUser.name],
      [tl('Kurum'), currentUser.organization || '—'],
      [tl('Rol'), ORG_ROLE_LABEL[currentUser.orgRole ?? 'MEMBER']],
      [tl('Giriş'), tl('Kişisel kurumsal kod')],
    ];
    return (
      <Panel title={tl('Hesap')} description={tl('Kurumsal üyesiniz. Adınızı, rolünüzü ve izinlerinizi kurum sahibi düzenler; kodunuzu kaybederseniz ondan yeni kod isteyin.')}>
        <dl className="divide-y divide-line text-sm">
          {memberRows.map(([k, v]) => (
            <div key={k} className="py-2.5 grid grid-cols-1 min-[420px]:grid-cols-[minmax(8rem,auto)_1fr] gap-x-3 gap-y-0.5">
              <dt className="text-muted">{tx(k)}</dt>
              <dd className="text-body min-w-0 break-words">{typeof v === 'string' ? tx(v) : v}</dd>
            </div>
          ))}
        </dl>
      </Panel>
    );
  }
  const rows: [string, React.ReactNode][] = [
    [tl('Ad soyad'), currentUser?.name],
    [tl('E-posta'), currentUser?.email],
    [tl('Rol'), currentUser?.role === 'ADMIN' ? tl('Yönetici') : tl('Kullanıcı')],
    [tl('Hesap türü'), ACCOUNT_TYPE_LABEL[type]],
    ...(type === 'CORPORATE'
      ? ([
          [tl('Kurum'), currentUser?.organization || '—'],
          [tl('Kişi sayısı'), String(currentUser?.seats ?? '—')],
        ] as [string, React.ReactNode][])
      : []),
    [
      tl('Paket'),
      currentUser?.subscriptionPlan === 'VIP'
        ? tl('VIP — ömür boyu ücretsiz')
        : (
            <>
              {lifetime ? tl('Ömür boyu') : tl('Aylık')} — {formatPlanPrice(lifetime ? 'Tek Seferlik' : 'Aylık', type, systemSettings.pricing, currentUser?.seats ?? undefined)}
              {lifetime ? '' : ' / ay'}
              <span className="block text-xs text-muted whitespace-normal">{tx(billingNote(lifetime ? 'Tek Seferlik' : 'Aylık'))}</span>
            </>
          ),
    ],
  ];
  return (
    <Panel title={tl('Hesap')} description={tl('Hesap bilgilerinizi değiştirmek için Güvenlik sekmesini kullanın.')}>
      <dl className="divide-y divide-line text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="py-2.5 grid grid-cols-1 min-[420px]:grid-cols-[minmax(8rem,auto)_1fr] gap-x-3 gap-y-0.5">
            <dt className="text-muted">{tx(k)}</dt>
            <dd className="text-body min-w-0 break-words">{typeof v === 'string' ? tx(v) : v}</dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
}

function PasswordSection() {
  const { addToast, systemSettings } = useAppStore();
  const min = systemSettings.security.passwordMinLength;
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (next !== confirm) return setMsg({ kind: 'error', text: tl('Yeni şifreler eşleşmiyor.') });
    if (next.length < min) return setMsg({ kind: 'error', text: tl('Yeni şifre en az {min} karakter olmalıdır.', { min }) });
    setBusy(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: current, newPassword: next, confirmPassword: confirm }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg({ kind: 'error', text: responseError(res, data, tl('Şifre değiştirilemedi.')) });
        return;
      }
      setCurrent('');
      setNext('');
      setConfirm('');
      setMsg({ kind: 'ok', text: data.message || tl('Şifreniz değiştirildi. Diğer cihazlardaki oturumlar kapatıldı.') });
      addToast({ type: 'success', title: tl('Şifre değiştirildi') });
    } catch {
      setMsg({ kind: 'error', text: ERR.network });
    } finally {
      setBusy(false);
    }
  };

  const type = show ? 'text' : 'password';
  return (
    <Panel title={tl('Şifre')} description={tl('Şifreniz sunucuda yalnızca tek yönlü özet (bcrypt) olarak saklanır.')}>
      <form onSubmit={submit} className="space-y-4 max-w-md">
        <label className="block">
          <span className={labelCls}>{tl('Mevcut şifre')}</span>
          <input className={fieldCls} type={type} required autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </label>
        <label className="block">
          <span className={labelCls}>{tl('Yeni şifre (en az')}{' '}{min} karakter)</span>
          <input className={fieldCls} type={type} required minLength={min} autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
        </label>
        <label className="block">
          <span className={labelCls}>{tl('Yeni şifre (tekrar)')}</span>
          <input className={fieldCls} type={type} required autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </label>
        <button type="button" onClick={() => setShow((s) => !s)} className="text-xs text-subtle hover:text-fg inline-flex items-center gap-1.5">
          {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          {show ? tl('Şifreleri gizle') : tl('Şifreleri göster')}
        </button>
        {msg && <Message {...msg} />}
        <div>
          <button type="submit" disabled={busy} className={primaryBtn}>
            <ShieldCheck className="w-4 h-4" />
            {busy ? tl('Kaydediliyor…') : tl('Şifreyi değiştir')}
          </button>
        </div>
      </form>
    </Panel>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start justify-between gap-4 py-3 cursor-pointer">
      <span>
        <span className="block text-sm text-body">{tx(label)}</span>
        {hint && <span className="block text-xs text-muted mt-0.5">{tx(hint)}</span>}
      </span>
      <input type="checkbox" className="mt-1 w-4 h-4 accent-[var(--color-brand)]" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

function PreferencesSection() {
  const { preferences, setPreference } = useAppStore();
  return (
    <>
      <Panel title={tl('Dil')} description={tl('Uygulamanın, bildirimlerin ve e-postaların dili. Hesabınıza kaydedilir; tüm cihazlarınızda geçerli olur.')}>
        <LanguageSwitcher />
      </Panel>
      <Panel title={tl('Görünüm')} description={tl('Bu tercihler hesabınıza kaydedilir; her cihazda aynı görünür.')}>
        <div className="divide-y divide-line">
          <Toggle label={tl('Sol menüyü daralt')} checked={preferences.sidebarCollapsed} onChange={(v) => setPreference('sidebarCollapsed', v)} />
          <Toggle label={tl('Notlar listesini gizle')} checked={preferences.notesPanelCollapsed} onChange={(v) => setPreference('notesPanelCollapsed', v)} />
          <Toggle label={tl('Sembol çekmecesi açık başlasın')} checked={preferences.mathDrawerOpen} onChange={(v) => setPreference('mathDrawerOpen', v)} />
          <Toggle label={tl('Takvimde gün panelini gizle')} checked={preferences.calendarPanelCollapsed} onChange={(v) => setPreference('calendarPanelCollapsed', v)} />
          <Toggle
            label={tl('Görevler sayfası pano ile açılsın')}
            hint={tl('Kapalıyken liste görünümü açılır.')}
            checked={preferences.tasksView === 'pano'}
            onChange={(v) => setPreference('tasksView', v ? 'pano' : 'liste')}
          />
        </div>
      </Panel>
      <NotesPanel />
      <CurrencyPanel />
      <NotificationsPanel />
      <ShortcutsPanel />
      <InstallAppPanel />
      <Panel title={tl('Gizlilik')}>
        <ul className="space-y-2 text-xs text-subtle leading-relaxed list-disc pl-4">
          <li>{tl('Tarayıcınızda çerez, önbellek veya yerel depolama ile hiçbir kişisel veri tutulmaz; yalnızca oturumunuzu ve dil seçiminizi tanıyan, JavaScript’in okuyamadığı çerezler vardır.')}</li>
          <li>{tl('Notlarınız, görevleriniz, takvim ve finans kayıtlarınız, ders bilgileriniz ve bu tercihler sunucuda size özel bir anahtarla şifrelenmiş (AES-256) olarak saklanır.')}</li>
          <li>{tl('Şifreniz geri döndürülemez biçimde (bcrypt) saklanır; kimse göremez.')}</li>
          <li>{tl('Metne çevrilen PDF, Word ve Excel dosyaları cihazınızda okunur; dosyanın kendisi sunucuya gönderilmez.')}</li>
          <li>{tl('PDF olarak eklediğiniz notlar sunucuda size özel anahtarla şifrelenip saklanır, her açılışta bütünlüğü (SHA-256) kontrol edilir; tarayıcıda kopyası tutulmaz.')}</li>
          <li>{tl('Gizli notlar cihazınızda, yalnızca sizin bildiğiniz şifreyle şifrelenir; sunucu ve yönetici içeriğini göremez.')}</li>
        </ul>
      </Panel>
    </>
  );
}
