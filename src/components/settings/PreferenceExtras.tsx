'use client';

import { t, tx } from '@/lib/i18n';
import { responseError, thrownError } from '@/lib/errors';
import React, { useEffect, useRef, useState } from 'react';
import { BellRing, Download, Keyboard, Loader2, MonitorSmartphone, Play, Upload, Volume2 } from 'lucide-react';
import { playNotificationSound, resetNotificationSound } from '@/lib/notificationSound';
import { openShortcutsHelp } from '@/components/layout/Shortcuts';
import { enableDesktopNotifications, useAppStore } from '@/store/useAppStore';
import { canPromptInstall, isStandalone, promptInstall, subscribeInstall } from '@/lib/pwaInstall';
import { Modal } from '@/components/ui/Modal';
import { NotificationReasons, PermissionHelp, readPermission, type PermissionState } from '@/components/notifications/NotificationOptIn';
import { Message, Panel, fieldCls, labelCls, primaryBtn } from './settingsUi';

/** Ayarlar › Tercihler › Döviz: the kur marjı is off (0 TL) unless the user turns it on. */
export function CurrencyPanel() {
  const { exchangeRates, setExchangeRateMarkup } = useAppStore();
  const current = exchangeRates.markupTRY ?? 0;
  const [enabled, setEnabled] = useState(current > 0);
  const [markup, setMarkup] = useState(current > 0 ? String(current) : '');
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  return (
    <Panel
      title={t('Döviz')}
      description={t('USD ve EUR işlemleri TL’ye canlı kurla çevrilir. İsterseniz her çevirmede kura eklenecek sabit bir marj (TL) tanımlayabilirsiniz.')}
    >
      <div className="space-y-4 max-w-sm">
        <label className="flex items-start justify-between gap-4 cursor-pointer">
          <span>
            <span className="block text-sm text-body">{t('Kur marjı uygula')}</span>
            <span className="block text-xs text-muted mt-0.5">{t('Kapalıyken marj 0 TL’dir.')}</span>
          </span>
          <input
            type="checkbox"
            className="mt-1 w-4 h-4 accent-[var(--color-brand)]"
            checked={enabled}
            onChange={(e) => {
              setMsg(null);
              setEnabled(e.target.checked);
              if (!e.target.checked) {
                setExchangeRateMarkup(0);
                setMarkup('');
                setMsg({ kind: 'ok', text: t('Kur marjı kapatıldı (0 TL).') });
              }
            }}
          />
        </label>
        {enabled && (
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const n = Number(markup.replace(',', '.'));
              if (!Number.isFinite(n) || n < 0 || n > 1000) return setMsg({ kind: 'error', text: t('Marj 0 ile 1000 TL arasında olmalı.') });
              setExchangeRateMarkup(n);
              setMsg({ kind: 'ok', text: t('Kur marjı {v0} TL olarak kaydedildi.', { v0: n.toFixed(2) }) });
            }}
          >
            <label className="flex-1">
              <span className={labelCls}>{t('Kur marjı (TL)')}</span>
              <input className={fieldCls} inputMode="decimal" placeholder={t('Ör. 2,50')} value={markup} onChange={(e) => setMarkup(e.target.value)} />
            </label>
            <button type="submit" className={primaryBtn}>
              {t('Kaydet')}
            </button>
          </form>
        )}
        {msg && <Message {...msg} />}
      </div>
    </Panel>
  );
}

/** Ayarlar › Tercihler › Bildirimler: system notifications on this device. */
const CLASS_REMINDER_OPTIONS: { value: string; label: string }[] = [
  { value: 'off', label: 'Kapalı' },
  { value: '60', label: 'Dersten 1 saat önce' },
  { value: '30', label: 'Dersten 30 dakika önce' },
  { value: '15', label: 'Dersten 15 dakika önce' },
  { value: '10', label: 'Dersten 10 dakika önce' },
  { value: '5', label: 'Dersten 5 dakika önce' },
  { value: '0', label: 'Ders başlarken' },
  { value: '-5', label: 'Ders başladıktan 5 dakika sonra' },
  { value: '-10', label: 'Ders başladıktan 10 dakika sonra' },
];

export function NotificationsPanel() {
  const { preferences, setPreference, currentUser } = useAppStore();
  const student = currentUser?.accountType === 'STUDENT';
  const [permission, setPermission] = useState<PermissionState | null>(null);
  const [busy, setBusy] = useState(false);
  // The browser asks only once; before that the person sees why the permission is needed.
  const [explain, setExplain] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setPermission(readPermission()));
  }, []);

  const turnOn = async () => {
    setExplain(false);
    setBusy(true);
    const result = await enableDesktopNotifications(true);
    setPermission(result === 'unsupported' ? readPermission() : result);
    setBusy(false);
  };

  const on = preferences.desktopNotifications && permission === 'granted';
  return (
    <Panel
      title={t('Bildirimler')}
      description={t('Zil simgesindeki bildirimler canlı güncellenir: gecikmiş görevler, bugünkü etkinlikler ve (kurumsalda) ekibinizin eklediği görev, ödeme ve notlar anında düşer.')}
    >
      <div className="space-y-3 max-w-xl">
        <label className="flex items-start justify-between gap-4 cursor-pointer">
          <span>
            <span className="text-sm text-body flex items-center gap-2">
              <BellRing className="w-4 h-4 text-subtle" />{' '}{t('Telefon ve bilgisayar bildirimleri')}
            </span>
            <span className="block text-xs text-muted mt-0.5">
              {t('Bu cihaza (telefon, tablet, bilgisayar) bildirim gelir; uygulama kapalıyken de: görevin son günü geldiğinde / geçtiğinde, ödeme günü geldiğinde / geçtiğinde, günün etkinlikleri, öğrencilerde ders saati ve sınav günü; kurumsalda ekibin eklediği görev ve ödemeler. Her cihazda ayrı açılır.')}
            </span>
          </span>
          <input
            type="checkbox"
            className="mt-1 w-4 h-4 accent-[var(--color-brand)]"
            checked={on}
            disabled={busy || permission === 'unsupported' || permission === 'denied' || permission === 'ios-install'}
            onChange={async (e) => {
              if (e.target.checked && permission === 'default') return setExplain(true);
              if (e.target.checked) return turnOn();
              setBusy(true);
              const result = await enableDesktopNotifications(false);
              setPermission(result === 'unsupported' ? readPermission() : result);
              setBusy(false);
            }}
          />
        </label>
        <NotificationSoundSettings />
        {student && (
          <label className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm text-body">{t('Ders hatırlatması')}</span>
            <select
              className={`${fieldCls} sm:max-w-[16rem]`}
              value={preferences.classReminderMinutes === null ? 'off' : String(preferences.classReminderMinutes)}
              onChange={(e) => setPreference('classReminderMinutes', e.target.value === 'off' ? null : Number(e.target.value))}
              aria-label={t('Ders hatırlatması')}
            >
              {CLASS_REMINDER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{tx(o.label)}</option>
              ))}
            </select>
          </label>
        )}
        {permission && <PermissionHelp state={permission} />}
      </div>
      <Modal isOpen={explain} onClose={() => setExplain(false)} title={t('Neden bildirim izni istiyoruz?')} maxWidth="max-w-md">
        <NotificationReasons />
        <p className="text-xs text-muted mt-3">{t('“İzin ver”e bastığınızda tarayıcınız bir kez daha soracak; orada da “İzin ver”i seçin.')}</p>
        <div className="modal-actions flex justify-end gap-2">
          <button type="button" onClick={() => setExplain(false)} className="h-10 px-4 rounded-lg border border-line text-sm text-body hover:bg-surface-2">
            {t('Şimdi değil')}
          </button>
          <button type="button" onClick={turnOn} className={primaryBtn}>
            <BellRing className="w-4 h-4" />{' '}{t('İzin ver')}
          </button>
        </div>
      </Modal>
    </Panel>
  );
}

/** Ayarlar › Tercihler › Uygulama: install as a Windows / Android / macOS app (PWA). */
export function InstallAppPanel() {
  const { preferences, setPreference } = useAppStore();
  const [prompt, setPrompt] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => {
      setInstalled(isStandalone());
      setPrompt(canPromptInstall());
    };
    queueMicrotask(sync);
    return subscribeInstall(sync);
  }, []);

  return (
    <Panel title={t('Uygulama')} description={t('LrDocument’i bilgisayarınıza (Windows) ya da telefonunuza uygulama olarak yükleyin: kendi penceresinde açılır, başlat menüsünde ve görev çubuğunda yer alır.')}>
      <div className="space-y-3 max-w-xl text-sm">
        {installed ? (
          <p className="text-emerald-300 flex items-center gap-2">
            <MonitorSmartphone className="w-4 h-4" />{' '}{t('Uygulama olarak açıksınız.')}
          </p>
        ) : prompt ? (
          <button
            type="button"
            className={primaryBtn}
            onClick={async () => {
              const accepted = await promptInstall();
              setMsg(accepted ? t('Yükleniyor… Başlat menüsünden ya da ana ekrandan açabilirsiniz.') : t('Yükleme iptal edildi.'));
            }}
          >
            <Download className="w-4 h-4" />{' '}{t('Uygulamayı yükle')}
          </button>
        ) : (
          <ul className="text-xs text-subtle space-y-1.5 list-disc pl-4">
            <li>
              <span className="text-body">{t('Windows (Edge / Chrome):')}</span>{' '}{t('adres çubuğunun sağındaki “Uygulamayı yükle” simgesine ya da menü › Uygulamalar › “LrDocument’i yükle” seçeneğine tıklayın.')}
            </li>
            <li>
              <span className="text-body">{t('Android:')}</span>{' '}{t('Chrome menüsü › “Ana ekrana ekle / Uygulamayı yükle”.')}
            </li>
            <li>
              <span className="text-body">{t('iPhone / iPad:')}</span>{' '}{t('Safari’de Paylaş › “Ana Ekrana Ekle”.')}
            </li>
          </ul>
        )}
        {msg && <p className="text-xs text-muted">{tx(msg)}</p>}
        {!installed && (
          <label className="flex items-start justify-between gap-4 cursor-pointer pt-1">
            <span>
              <span className="block text-sm text-body">{t('Açılışta “Ana ekrana ekle” hatırlatması')}</span>
              <span className="block text-xs text-muted mt-0.5">{t('Uygulama yüklü değilken her açılışta kısa bir hatırlatma gösterir.')}</span>
            </span>
            <input
              type="checkbox"
              className="mt-1 w-4 h-4 accent-[var(--color-brand)]"
              checked={!preferences.installPromptOff}
              onChange={(e) => setPreference('installPromptOff', !e.target.checked)}
            />
          </label>
        )}
      </div>
    </Panel>
  );
}

/** Ayarlar › Tercihler › Kısayollar: keyboard shortcuts and touch gestures on / off, and the list. */
export function ShortcutsPanel() {
  const { preferences, setPreference } = useAppStore();
  const rows: [keyof Pick<typeof preferences, 'keyboardShortcuts' | 'touchGestures'>, string, string][] = [
    ['keyboardShortcuts', t('Klavye kısayolları'), t('N yeni not, T yeni görev, G sonra harf ile bölümler arası geçiş…')],
    ['touchGestures', t('Dokunmatik hareketler'), t('Kenardan kaydırarak menü, not listesine dönüş, takvimde ay değiştirme.')],
  ];
  return (
    <Panel title={t('Kısayollar')} description={t('Klavye ve dokunmatik kısayollar işleri hızlandırır. Yazı yazarken tek harfli kısayollar çalışmaz.')}>
      <div className="space-y-3 max-w-xl">
        {rows.map(([key, label, hint]) => (
          <label key={key} className="flex items-start justify-between gap-4 cursor-pointer">
            <span>
              <span className="text-sm text-body flex items-center gap-2">
                <Keyboard className="w-4 h-4 text-subtle" /> {tx(label)}
              </span>
              <span className="block text-xs text-muted mt-0.5">{tx(hint)}</span>
            </span>
            <input
              type="checkbox"
              className="mt-1 w-4 h-4 accent-[var(--color-brand)]"
              checked={preferences[key]}
              onChange={(e) => setPreference(key, e.target.checked)}
            />
          </label>
        ))}
        <button type="button" onClick={openShortcutsHelp} className={primaryBtn}>
          {t('Kısayol listesini göster')}
        </button>
      </div>
    </Panel>
  );
}

const SOUND_ACCEPT = '.mp3,.wav,.ogg,.m4a,audio/mpeg,audio/wav,audio/ogg,audio/mp4,audio/x-m4a';
const SOUND_MIME: Record<string, string> = { mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', m4a: 'audio/mp4' };

/** Bildirim sesi: off, the built-in chime, or an uploaded sound (MP3 / WAV / OGG / M4A, max 1 MB). */
function NotificationSoundSettings() {
  const { preferences, setPreference } = useAppStore();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const choice = preferences.notificationSound;
  const hasCustom = !!preferences.notificationSoundFileId;

  const upload = async (file: File | undefined) => {
    if (fileRef.current) fileRef.current.value = '';
    if (!file) return;
    setMsg(null);
    if (file.size > 1024 * 1024) return setMsg({ kind: 'error', text: t('Ses dosyası en fazla 1 MB olabilir.') });
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    const type = SOUND_MIME[ext] ?? file.type;
    setBusy(true);
    try {
      const res = await fetch('/api/files?purpose=sound', {
        method: 'POST',
        headers: { 'Content-Type': type, 'X-File-Name': encodeURIComponent(file.name) },
        body: file,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(responseError(res, data, t('Ses yüklenemedi.')));
      resetNotificationSound();
      setPreference('notificationSoundFileId', data.id);
      setPreference('notificationSound', 'custom');
      setMsg({ kind: 'ok', text: `“${file.name}” bildirim sesi oldu.` });
      void playNotificationSound('custom', data.id, preferences.notificationVolume, true);
    } catch (err) {
      setMsg({ kind: 'error', text: thrownError(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 border-t border-line pt-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm text-body flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-subtle" />{' '}{t('Bildirim sesi')}
        </span>
        <div className="flex items-center gap-2">
          <select
            className={`${fieldCls} w-auto`}
            value={choice}
            onChange={(e) => {
              const next = e.target.value as typeof choice;
              if (next === 'custom' && !hasCustom) return fileRef.current?.click();
              setPreference('notificationSound', next);
            }}
            aria-label={t('Bildirim sesi')}
          >
            <option value="off">{t('Kapalı')}</option>
            <option value="default">{t('Varsayılan (zil)')}</option>
            <option value="custom">{t('Kendi sesim')}{hasCustom ? '' : t(' (yükle…)')}</option>
          </select>
          <button
            type="button"
            onClick={() => void playNotificationSound(choice === 'off' ? 'default' : choice, preferences.notificationSoundFileId, preferences.notificationVolume, true)}
            className="h-10 px-3 rounded-md border border-line text-sm text-body hover:bg-surface-2 inline-flex items-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5" />{' '}{t('Dene')}
          </button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-xs text-muted flex items-center gap-2 flex-1 min-w-[12rem]">
          {t('Ses düzeyi')}
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(preferences.notificationVolume * 100)}
            onChange={(e) => setPreference('notificationVolume', Number(e.target.value) / 100)}
            className="flex-1 accent-[var(--color-brand)]"
            aria-label={t('Ses düzeyi')}
          />
          <span className="tabular-nums w-9 text-right">%{Math.round(preferences.notificationVolume * 100)}</span>
        </label>
        <input ref={fileRef} type="file" accept={SOUND_ACCEPT} className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => upload(e.target.files?.[0])} />
        <button
          type="button"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className="h-9 px-3 rounded-md border border-line text-xs text-body hover:bg-surface-2 inline-flex items-center gap-1.5 disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          {hasCustom ? t('Başka ses yükle') : t('Ses yükle')}
        </button>
      </div>
      <p className="text-[11px] text-muted">
        {t('MP3, WAV, OGG veya M4A, en fazla 1 MB. Uygulama açıkken (arka planda da) gelen bildirimlerde çalar. Uygulama kapalıyken telefon ve bilgisayar kendi bildirim sesini kullanır; tarayıcılar bu sesin değiştirilmesine izin vermez.')}
      </p>
      {msg && <Message {...msg} />}
    </div>
  );
}

/** Ayarlar › Tercihler › Notlar: the folder Notlar opens in, and the PDF reader's book view. */
export function NotesPanel() {
  const { preferences, setPreference, folders } = useAppStore();
  const mode = preferences.notesStartFolder;
  const chosen = preferences.notesStartFolderId;
  const exists = chosen === 'favorites' || folders.some((f) => f.id === chosen);
  return (
    <Panel title={t('Notlar')} description={t('Notlar sayfası açıldığında hangi klasörün seçili geleceğini belirleyin.')}>
      <div className="space-y-3">
        <label className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm text-body">{t('Açılış klasörü')}</span>
          <select
            className={`${fieldCls} sm:max-w-[16rem]`}
            value={mode}
            onChange={(e) => setPreference('notesStartFolder', e.target.value as typeof mode)}
            aria-label={t('Notların açılacağı klasör')}
          >
            <option value="all">{t('Tüm Notlar (varsayılan)')}</option>
            <option value="last">{t('Son bıraktığım klasör')}</option>
            <option value="custom">{t('Seçtiğim klasör')}</option>
          </select>
        </label>
        {mode === 'custom' && (
          <label className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm text-body">{t('Klasör')}</span>
            <select
              className={`${fieldCls} sm:max-w-[16rem]`}
              value={exists ? chosen! : ''}
              onChange={(e) => setPreference('notesStartFolderId', e.target.value || null)}
              aria-label={t('Açılış klasörü seçimi')}
            >
              <option value="">{t('Tüm Notlar')}</option>
              <option value="favorites">{t('Favoriler')}</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>{tx(f.name)}</option>
              ))}
            </select>
          </label>
        )}
        {mode === 'custom' && chosen && !exists && <p className="text-xs text-amber-300">{t('Seçilen klasör silinmiş; Tüm Notlar açılacak.')}</p>}
        <label className="flex items-start justify-between gap-4 pt-1 cursor-pointer">
          <span>
            <span className="block text-sm text-body">{t('Kitap görünümü (çift sayfa)')}</span>
            <span className="block text-xs text-muted mt-0.5">{t('PDF’ler ve not önizlemesi kitap gibi iki sayfa yan yana açılır. Yalnızca tablet ve bilgisayarda; telefonda tek sayfa gösterilir. Okuyucudaki “Kitap” düğmesiyle de açılıp kapanır.')}</span>
          </span>
          <input type="checkbox" className="mt-1 w-4 h-4 accent-[var(--color-brand)]" checked={preferences.pdfSpread} onChange={(e) => setPreference('pdfSpread', e.target.checked)} />
        </label>
      </div>
    </Panel>
  );
}
