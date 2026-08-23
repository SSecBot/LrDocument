export interface ScriptTimingStats {
  wordCount: number;
  characterCount: number;
  paragraphCount: number;
  estimatedSeconds: number;
  formattedDuration: string;
  formattedMinutesSeconds: string;
}

export const WPM_PRESETS = [
  { label: 'Sakin / Eğitici (110 WPM)', value: 110 },
  { label: 'Doğal Anlatım (130 WPM)', value: 130 },
  { label: 'Dinamik / YouTube (150 WPM)', value: 150 },
  { label: 'Hızlı / Shorts & TikTok (170 WPM)', value: 170 },
];

export function calculateWordCount(text: string): number {
  if (!text) return 0;
  // HTML / Markdown etiketlerini ve fazla boşlukları temizle
  const clean = text
    .replace(/<[^>]*>/g, ' ')
    .replace(/\[.*?\]\(.*?\)/g, ' ')
    .replace(/[#*_~`$]/g, ' ')
    .trim();
  
  if (!clean) return 0;
  const words = clean.split(/\s+/).filter(w => w.length > 0);
  return words.length;
}

export function calculateTiming(text: string, wpm: number = 130): ScriptTimingStats {
  const wordCount = calculateWordCount(text);
  const characterCount = text ? text.length : 0;
  const paragraphCount = text ? text.split(/\n\s*\n/).filter(p => p.trim().length > 0).length : 0;

  const totalMinutes = wordCount / Math.max(wpm, 50);
  const estimatedSeconds = Math.round(totalMinutes * 60);

  const mins = Math.floor(estimatedSeconds / 60);
  const secs = estimatedSeconds % 60;

  const formattedMinutesSeconds = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  
  let formattedDuration = '';
  if (mins === 0) {
    formattedDuration = `${secs} sn`;
  } else if (secs === 0) {
    formattedDuration = `${mins} dk`;
  } else {
    formattedDuration = `${mins} dk ${secs} sn`;
  }

  return {
    wordCount,
    characterCount,
    paragraphCount,
    estimatedSeconds,
    formattedDuration,
    formattedMinutesSeconds,
  };
}
