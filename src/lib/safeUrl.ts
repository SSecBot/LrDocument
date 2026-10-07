/**
 * Media URLs are rendered as <img src> / links, so only allow schemes that cannot execute script.
 */
export function isSafeMediaUrl(url: string): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (/^data:image\/(png|jpe?g|gif|webp|avif|bmp);base64,[a-z0-9+/=\s]+$/i.test(trimmed)) return true;
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

/** Returns the URL when safe to render, otherwise undefined (renders nothing). */
export function safeMediaSrc(url: string | null | undefined): string | undefined {
  return url && isSafeMediaUrl(url) ? url.trim() : undefined;
}
