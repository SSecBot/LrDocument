// İstek, öneri ve hata bildirimleri (Ayarlar › Destek) and requests that need an admin decision.
// Shared by the API routes and the UI.

export const USER_FEEDBACK_KINDS = ['istek', 'oneri', 'hata'] as const;
export type UserFeedbackKind = (typeof USER_FEEDBACK_KINDS)[number];
export type FeedbackKind = UserFeedbackKind | 'hesap-gecis' | 'takvim';
export type FeedbackStatus = 'yeni' | 'inceleniyor' | 'cozuldu' | 'reddedildi';

export const FEEDBACK_KIND_LABEL: Record<FeedbackKind, string> = {
  istek: 'İstek',
  oneri: 'Öneri',
  hata: 'Hata bildirimi',
  'hesap-gecis': 'Bireysel hesaba geçiş',
  takvim: 'Akademik takvim önerisi',
};

export const FEEDBACK_STATUS_LABEL: Record<FeedbackStatus, string> = {
  yeni: 'Yeni',
  inceleniyor: 'İnceleniyor',
  cozuldu: 'Tamamlandı',
  reddedildi: 'Reddedildi',
};

/** Kinds the admin answers with Onayla / Reddet; the rest only get a status and a reply. */
export const DECISION_KINDS: FeedbackKind[] = ['hesap-gecis', 'takvim'];

export const isOpenStatus = (s: FeedbackStatus) => s === 'yeni' || s === 'inceleniyor';

export interface FeedbackItem {
  id: string;
  kind: FeedbackKind;
  subject: string;
  message: string;
  status: FeedbackStatus;
  adminNote: string | null;
  authorName: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

export interface AdminFeedbackItem extends FeedbackItem {
  user: { id: string; name: string; email: string; accountType: string } | null;
  /** Request details: the proposed calendar (takvim) */
  payload: { universityId?: string; universityName?: string; terms?: { name: string; start?: string; end?: string; holidays: { name: string; start: string; end: string }[] }[]; sourceUrl?: string | null } | null;
  context: string | null;
}
