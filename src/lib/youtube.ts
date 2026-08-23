/**
 * YouTube URL Helper to extract Video ID and generate HQ Thumbnails
 */

export function extractYouTubeId(url: string): string | null {
  if (!url) return null;

  // Patterns supported:
  // 1. https://www.youtube.com/watch?v=VIDEO_ID
  // 2. https://youtu.be/VIDEO_ID
  // 3. https://www.youtube.com/shorts/VIDEO_ID
  // 4. https://www.youtube.com/embed/VIDEO_ID

  const cleanUrl = url.trim();

  // youtu.be/xxxx
  const shortMatch = cleanUrl.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch && shortMatch[1]) return shortMatch[1];

  // youtube.com/watch?v=xxxx
  const watchMatch = cleanUrl.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (watchMatch && watchMatch[1]) return watchMatch[1];

  // youtube.com/shorts/xxxx
  const shortsMatch = cleanUrl.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
  if (shortsMatch && shortsMatch[1]) return shortsMatch[1];

  // youtube.com/embed/xxxx
  const embedMatch = cleanUrl.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch && embedMatch[1]) return embedMatch[1];

  return null;
}

export function getYouTubeThumbnailUrl(urlOrId: string, quality: 'hq' | 'maxres' = 'hq'): string | null {
  const videoId = extractYouTubeId(urlOrId) || (urlOrId.length === 11 ? urlOrId : null);
  if (!videoId) return null;

  if (quality === 'maxres') {
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  }
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

export function isYouTubeUrl(url: string): boolean {
  return !!extractYouTubeId(url);
}
