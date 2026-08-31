import { CalendarEvent, EventStatus, CalendarEventType, Platform } from '@/types';
import { generateId } from '@/lib/utils';

export interface ParsedICSEvent {
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  durationMinutes: number;
  eventType: CalendarEventType;
  platform?: Platform;
  status: EventStatus;
  location?: string;
  categories?: string[];
}

/**
 * Parse an iCalendar (.ics) file string and return an array of CalendarEvent objects.
 */
export function parseICS(icsString: string): Omit<CalendarEvent, 'id' | 'createdAt'>[] {
  const events: Omit<CalendarEvent, 'id' | 'createdAt'>[] = [];
  if (!icsString || typeof icsString !== 'string') return events;

  // Unfold multi-line folded values (RFC 5545: lines starting with space or tab continue previous line)
  const unfolded = icsString.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
  const lines = unfolded.split(/\r\n|\n|\r/);

  let inEvent = false;
  let currentEvent: Record<string, string> = {};

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line === 'BEGIN:VEVENT') {
      inEvent = true;
      currentEvent = {};
      continue;
    }

    if (line === 'END:VEVENT') {
      inEvent = false;
      const parsed = transformVEvent(currentEvent);
      if (parsed) {
        events.push(parsed);
      }
      currentEvent = {};
      continue;
    }

    if (inEvent) {
      const colonIdx = line.indexOf(':');
      if (colonIdx > 0) {
        const fullKey = line.slice(0, colonIdx);
        const value = line.slice(colonIdx + 1);

        // Remove params like ;VALUE=DATE
        const mainKey = fullKey.split(';')[0].toUpperCase();
        currentEvent[mainKey] = unescapeICS(value);
      }
    }
  }

  return events;
}

function unescapeICS(str: string): string {
  if (!str) return '';
  return str
    .replace(/\\n/g, '\n')
    .replace(/\\N/g, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}

function parseICSDateTime(dtStr?: string): { date: string; time?: string; dateObj?: Date } {
  if (!dtStr) {
    const today = new Date();
    const dStr = today.toISOString().split('T')[0];
    return { date: dStr, time: '09:00', dateObj: today };
  }

  // Format can be:
  // 1. 20260815 (Date only)
  // 2. 20260815T093000Z (UTC Datetime)
  // 3. 20260815T093000 (Local Datetime)
  const cleaned = dtStr.replace(/[^0-9T]/g, '');

  if (cleaned.includes('T')) {
    const [dPart, tPart] = cleaned.split('T');
    const year = dPart.slice(0, 4);
    const month = dPart.slice(4, 6);
    const day = dPart.slice(6, 8);
    const date = `${year}-${month}-${day}`;

    const hours = tPart.slice(0, 2);
    const minutes = tPart.slice(2, 4);
    const time = `${hours}:${minutes}`;

    const dateObj = new Date(Number(year), Number(month) - 1, Number(day), Number(hours), Number(minutes));
    return { date, time, dateObj };
  } else if (cleaned.length >= 8) {
    const year = cleaned.slice(0, 4);
    const month = cleaned.slice(4, 6);
    const day = cleaned.slice(6, 8);
    const date = `${year}-${month}-${day}`;
    const dateObj = new Date(Number(year), Number(month) - 1, Number(day));
    return { date, time: '09:00', dateObj };
  }

  const today = new Date();
  return { date: today.toISOString().split('T')[0], time: '09:00', dateObj: today };
}

function transformVEvent(raw: Record<string, string>): Omit<CalendarEvent, 'id' | 'createdAt'> | null {
  const summary = raw['SUMMARY'] || 'İsimsiz Etkinlik';
  const description = raw['DESCRIPTION'] || '';
  const dtStartRaw = raw['DTSTART'];
  const dtEndRaw = raw['DTEND'];
  const categoriesRaw = raw['CATEGORIES'] || '';

  const { date, time, dateObj: startObj } = parseICSDateTime(dtStartRaw);
  let durationMinutes = 45;

  if (dtEndRaw && startObj) {
    const { dateObj: endObj } = parseICSDateTime(dtEndRaw);
    if (endObj && !isNaN(endObj.getTime()) && !isNaN(startObj.getTime())) {
      const diffMs = endObj.getTime() - startObj.getTime();
      if (diffMs > 0) {
        durationMinutes = Math.min(1440, Math.max(15, Math.round(diffMs / (60 * 1000))));
      }
    }
  }

  // Detect platform & event type
  let eventType: CalendarEventType = 'yayin';
  let platform: Platform | undefined = 'YouTube';

  const combinedText = `${summary} ${description} ${categoriesRaw}`.toLowerCase();

  if (combinedText.includes('görev') || combinedText.includes('task') || combinedText.includes('teslim')) {
    eventType = 'gorev';
    platform = undefined;
  } else if (combinedText.includes('özel gün') || combinedText.includes('tatil') || combinedText.includes('holiday')) {
    eventType = 'ozel_gun';
    platform = undefined;
  } else if (combinedText.includes('tiktok')) {
    platform = 'TikTok';
    eventType = 'yayin';
  } else if (combinedText.includes('instagram')) {
    platform = 'Instagram';
    eventType = 'yayin';
  } else if (combinedText.includes('podcast')) {
    platform = 'Podcast';
    eventType = 'yayin';
  } else if (combinedText.includes('web')) {
    platform = 'Web';
    eventType = 'yayin';
  } else {
    platform = 'YouTube';
    eventType = 'yayin';
  }

  // Extract checklist items from description if present
  const checklist: { id: string; text: string; done: boolean }[] = [];
  const lines = description.split('\n');
  for (const line of lines) {
    const match = line.match(/^[-*]\s*\[([ xX])\]\s*(.*)$/);
    if (match) {
      checklist.push({
        id: generateId(),
        text: match[2].trim(),
        done: match[1].toLowerCase() === 'x',
      });
    }
  }

  return {
    title: summary.replace(/^\[.*?\]\s*/, ''), // remove leading tag like [YouTube] if any
    description: description.replace(/\\n\\nKontrol Listesi:[\s\S]*$/, '').trim() || undefined,
    date,
    time: time || '10:00',
    durationMinutes,
    eventType,
    platform,
    status: 'planlandi',
    checklist,
  };
}
