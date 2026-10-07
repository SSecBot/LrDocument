import { CalendarEvent } from '@/types';

function formatToICSDate(dateStr: string, timeStr?: string): string {
  // dateStr is YYYY-MM-DD, timeStr is HH:mm
  // Floating local time on both start and end (calculateEndDate also defaults to 09:00 local).
  const cleanDate = dateStr.replace(/-/g, '');
  if (!timeStr) {
    return `${cleanDate}T090000`;
  }
  const cleanTime = timeStr.replace(/:/g, '').slice(0, 4).padEnd(4, '0') + '00';
  return `${cleanDate}T${cleanTime}`;
}

function calculateEndDate(dateStr: string, timeStr?: string, durationMinutes: number = 60): string {
  const time = timeStr || '09:00';
  const [hours, minutes] = time.split(':').map(Number);
  const [year, month, day] = dateStr.split('-').map(Number);

  const start = new Date(year, month - 1, day, hours, minutes);
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

  const y = end.getFullYear();
  const m = String(end.getMonth() + 1).padStart(2, '0');
  const d = String(end.getDate()).padStart(2, '0');
  const h = String(end.getHours()).padStart(2, '0');
  const min = String(end.getMinutes()).padStart(2, '0');

  return `${y}${m}${d}T${h}${min}00`;
}

function escapeICS(str: string): string {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

export function generateICSContent(events: CalendarEvent[]): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//LrDocument//Yayin Takvimi//TR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:LrDocument Yayın Takvimi',
    'X-WR-TIMEZONE:Europe/Istanbul',
  ];

  for (const ev of events) {
    const dtStart = formatToICSDate(ev.date, ev.time);
    const dtEnd = calculateEndDate(ev.date, ev.time, ev.durationMinutes || 60);
    const nowStamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    const checklistText = ev.checklist && ev.checklist.length > 0
      ? `\\n\\nKontrol Listesi:\\n` + ev.checklist.map(c => `- [${c.done ? 'X' : ' '}] ${escapeICS(c.text)}`).join('\\n')
      : '';

    const category = ev.eventType === 'yayin' ? (ev.platform || 'Yayın') : ev.eventType === 'gorev' ? 'Görev Teslimi' : 'Özel Gün';
    const description = escapeICS((ev.description || '') + ` (Tür: ${category})`) + checklistText;

    lines.push(
      'BEGIN:VEVENT',
      `UID:lrdoc-${ev.id}@lrdocument.app`,
      `DTSTAMP:${nowStamp}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${escapeICS(`[${category}] ${ev.title}`)}`,
      `DESCRIPTION:${description}`,
      `STATUS:CONFIRMED`,
      `CATEGORIES:${category},LrDocument`,
      'BEGIN:VALARM',
      'TRIGGER:-PT30M',
      'ACTION:DISPLAY',
      `DESCRIPTION:Hatırlatıcı: ${escapeICS(ev.title)}`,
      'END:VALARM',
      'END:VEVENT'
    );
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function downloadICSFile(events: CalendarEvent[], filename: string = 'lrdocument-yayin-takvimi.ics'): void {
  const icsData = generateICSContent(events);
  const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => window.URL.revokeObjectURL(url), 1000);
}

export function createGoogleCalendarUrl(event: CalendarEvent): string {
  const category = event.eventType === 'yayin' ? (event.platform || 'Yayın') : event.eventType === 'gorev' ? 'Görev Teslimi' : 'Özel Gün';
  const title = encodeURIComponent(`[${category}] ${event.title}`);
  const dtStart = formatToICSDate(event.date, event.time);
  const dtEnd = calculateEndDate(event.date, event.time, event.durationMinutes || 60);

  const checklistText = event.checklist && event.checklist.length > 0
    ? '\n\nKontrol Listesi:\n' + event.checklist.map(c => `- [${c.done ? 'X' : ' '}] ${c.text}`).join('\n')
    : '';

  const details = encodeURIComponent((event.description || '') + `\n\nKategori: ${category}` + checklistText);

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dtStart}/${dtEnd}&details=${details}&location=${encodeURIComponent(category)}`;
}
