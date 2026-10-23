/**
 * User-facing error texts. Every message says what went wrong in plain words and what the person can
 * do next, instead of a bare "Bir sorun oluştu". Safe to import from client and server code.
 */

export const ERR = {
  offline: 'İnternet bağlantınız yok gibi görünüyor. Bağlantınızı kontrol edip tekrar deneyin.',
  network: 'Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edip birkaç saniye sonra tekrar deneyin.',
  session: 'Oturumunuz sona ermiş. Sayfayı yenileyip tekrar giriş yapın.',
  forbidden: 'Bu işlem için yetkiniz yok. Kurumsal hesaptaysanız yöneticinizden izin isteyebilirsiniz.',
  notFound: 'Kayıt bulunamadı; başka bir cihazda silinmiş olabilir. Sayfayı yenileyip tekrar bakın.',
  tooLarge: 'Gönderilen dosya ya da içerik çok büyük. Daha küçük bir dosya seçin ya da içeriği bölerek deneyin.',
  busy: 'Sunucu şu an yanıt vermiyor; büyük ihtimalle kısa bir bakım ya da güncelleme yapılıyor. Bir dakika sonra tekrar deneyin.',
  server: 'Sunucuda geçici bir sorun oluştu. Birkaç dakika sonra tekrar deneyin; sorun sürerse Ayarlar › Destek’ten bize yazın.',
} as const;

/** Appended to a route's own fallback ("Not kaydedilemedi.") when an unexpected server error happens. */
export const SERVER_HINT = 'Sunucuda geçici bir sorun oluştu; birkaç dakika sonra tekrar deneyin. Sorun sürerse Ayarlar › Destek’ten bize yazın.';

function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

/**
 * Message for a failed fetch response. Prefers the server's own text (always written for people);
 * otherwise explains the status. `action` names what failed, e.g. "Not kaydedilemedi."
 */
export function responseError(res: Response, data: unknown, action?: string): string {
  const server = data && typeof data === 'object' && typeof (data as { error?: unknown }).error === 'string'
    ? (data as { error: string }).error.trim()
    : '';
  if (server) return server;
  const lead = action ? `${action} ` : '';
  switch (res.status) {
    case 401:
      return lead + ERR.session;
    case 403:
      return lead + ERR.forbidden;
    case 404:
      return lead + ERR.notFound;
    case 413:
      return lead + ERR.tooLarge;
    case 429:
      return `${lead}Kısa sürede çok fazla deneme yapıldı. Birkaç dakika bekleyip tekrar deneyin.`;
    case 502:
    case 503:
    case 504:
      return lead + ERR.busy;
    default:
      return lead + (res.status >= 500 ? ERR.server : 'İstek işlenemedi. Bilgileri kontrol edip tekrar deneyin.');
  }
}

/** Message for a thrown error (fetch failure, Error with a message we wrote, or anything else). */
export function thrownError(err: unknown, action?: string): string {
  const lead = action ? `${action} ` : '';
  if (isOffline()) return lead + ERR.offline;
  // fetch() rejects with a TypeError ("Failed to fetch", "NetworkError…", "Load failed") when offline.
  if (err instanceof TypeError) return lead + ERR.network;
  if (err instanceof Error && err.message && !/^[A-Za-z]+Error\b|failed to fetch|load failed|networkerror|unexpected token/i.test(err.message)) {
    return err.message;
  }
  return lead + ERR.server;
}

/** `fetch` + JSON with friendly errors: resolves to the body, or throws an Error whose message is for people. */
export async function fetchJson<T = Record<string, unknown>>(input: RequestInfo | URL, init?: RequestInit, action?: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(input, init);
  } catch (err) {
    throw new Error(thrownError(err, action));
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(responseError(res, data, action));
  return data as T;
}
