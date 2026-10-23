'use client';

import { t } from '@/lib/i18n';
// ---------------------------------------------------------------------------
// Notu indir: a text note as Markdown, PDF or Word; a table note as Excel, CSV or PDF; a PDF note as
// the original file. Everything is produced in the browser and handed over as a download.
// ---------------------------------------------------------------------------

import type { Note } from '@/types';
import { renderNoteHtml } from '@/components/notes/KatexPreview';
import { slugifyFilename } from '@/lib/utils';
import { ALIASES, Evaluator, addr, colName, formatValue, newDoc, parseDoc, type Cell, type NumberFormat, type SheetDoc } from '@/lib/sheet/engine';

export type ExportFormat = 'md' | 'pdf' | 'docx' | 'xlsx' | 'csv' | 'original';

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

const base = (note: Note) => slugifyFilename(note.title, note.kind === 'table' ? 'tablo' : 'not');

export async function exportNote(note: Note, format: ExportFormat): Promise<void> {
  if (note.kind === 'table') {
    const doc = parseDoc(note.content);
    if (format === 'xlsx') return downloadBlob(await sheetToXlsx(doc), `${base(note)}.xlsx`);
    if (format === 'csv') return downloadBlob(sheetToCsv(doc), `${base(note)}.csv`);
    return htmlToPdf(tableHtml(note.title, doc), `${base(note)}.pdf`, wideTable(doc));
  }
  if (note.kind === 'pdf') {
    if (!note.fileId) throw new Error(t('PDF dosyası bulunamadı.'));
    const res = await fetch(`/api/files/${encodeURIComponent(note.fileId)}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(t('PDF indirilemedi.'));
    return downloadBlob(await res.blob(), `${base(note)}.pdf`);
  }
  if (format === 'md') return downloadBlob(new Blob([note.content], { type: 'text/markdown;charset=utf-8' }), `${base(note)}.md`);
  if (format === 'docx') return downloadBlob(await markdownToDocx(note.title, note.content), `${base(note)}.docx`);
  return htmlToPdf(`<h1 class="text-2xl font-semibold mb-4">${escapeHtml(note.title || 'Not')}</h1>${renderNoteHtml(note.content)}`, `${base(note)}.pdf`);
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

// ---------------------------------------------------------------------------
// PDF: the note is laid out on a white page, drawn to a canvas and cut into A4 pages between blocks
// (a line of text is never split across two pages).
// ---------------------------------------------------------------------------

const PRINT_VARS: Record<string, string> = {
  '--color-app': '#ffffff',
  '--color-surface': '#ffffff',
  '--color-surface-2': '#f3f4f6',
  '--color-surface-3': '#e5e7eb',
  '--color-surface-4': '#d1d5db',
  '--color-line': '#d1d5db',
  '--color-line-strong': '#9ca3af',
  '--color-fg': '#111827',
  '--color-body': '#1f2937',
  '--color-subtle': '#4b5563',
  '--color-muted': '#6b7280',
  '--color-brand-light': '#b45309',
};

async function htmlToPdf(html: string, fileName: string, landscape = false) {
  const [{ jsPDF }, { default: html2canvas }] = await Promise.all([import('jspdf'), import('html2canvas-pro')]);
  const widthPx = landscape ? 1040 : 760;
  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  Object.assign(host.style, { position: 'fixed', left: '-10000px', top: '0', width: `${widthPx}px`, padding: '0', background: '#fff', color: '#111827' });
  for (const [k, v] of Object.entries(PRINT_VARS)) host.style.setProperty(k, v);
  host.innerHTML = `<div class="prose max-w-none text-body" style="font-size:14px;line-height:1.6">${html}</div>`;
  document.body.appendChild(host);
  try {
    await document.fonts?.ready;
    const scale = 2;
    const canvas = await html2canvas(host, { scale, backgroundColor: '#ffffff', logging: false });
    const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: landscape ? 'landscape' : 'portrait' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 36;
    const ptPerPx = (pageW - margin * 2) / widthPx;
    const pagePx = (pageH - margin * 2) / ptPerPx;
    // Allowed cut positions: the bottom of every block element.
    const hostTop = host.getBoundingClientRect().top;
    const cuts = Array.from(host.querySelectorAll('p, h1, h2, h3, h4, li, pre, blockquote, hr, tr, .katex-display-wrapper, table, div'))
      .map((el) => el.getBoundingClientRect().bottom - hostTop)
      .filter((y) => y > 0)
      .sort((a, b) => a - b);
    const total = host.scrollHeight;
    let start = 0;
    let first = true;
    while (start < total - 1) {
      let end = Math.min(total, start + pagePx);
      if (end < total) {
        const fit = cuts.filter((y) => y > start + pagePx * 0.4 && y <= end);
        if (fit.length) end = fit[fit.length - 1];
      }
      const slice = document.createElement('canvas');
      slice.width = canvas.width;
      slice.height = Math.max(1, Math.round((end - start) * scale));
      slice.getContext('2d')!.drawImage(canvas, 0, Math.round(start * scale), canvas.width, slice.height, 0, 0, canvas.width, slice.height);
      if (!first) pdf.addPage();
      pdf.addImage(slice.toDataURL('image/jpeg', 0.92), 'JPEG', margin, margin, pageW - margin * 2, (end - start) * ptPerPx);
      first = false;
      start = end;
    }
    downloadBlob(pdf.output('blob'), fileName);
  } finally {
    host.remove();
  }
}

// ---------------------------------------------------------------------------
// Word (.docx) from the note's Markdown
// ---------------------------------------------------------------------------

async function markdownToDocx(title: string, md: string): Promise<Blob> {
  const d = await import('docx');
  type Run = InstanceType<typeof d.TextRun> | InstanceType<typeof d.ExternalHyperlink>;
  const runs = (text: string, extra: { bold?: boolean; italics?: boolean } = {}): Run[] => {
    const out: Run[] = [];
    const re = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`|\$([^$\n]+)\$|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\))/g;
    let last = 0;
    for (let m = re.exec(text); m; m = re.exec(text)) {
      if (m.index > last) out.push(new d.TextRun({ text: text.slice(last, m.index), ...extra }));
      if (m[2]) out.push(new d.TextRun({ text: m[2], bold: true, italics: extra.italics }));
      else if (m[3]) out.push(new d.TextRun({ text: m[3], italics: true, bold: extra.bold }));
      else if (m[4]) out.push(new d.TextRun({ text: m[4], font: 'Consolas' }));
      else if (m[5]) out.push(new d.TextRun({ text: m[5], italics: true, font: 'Cambria Math' }));
      else if (m[6]) out.push(new d.ExternalHyperlink({ link: m[7], children: [new d.TextRun({ text: m[6], style: t('Hyperlink') })] }));
      last = m.index + m[0].length;
    }
    if (last < text.length) out.push(new d.TextRun({ text: text.slice(last), ...extra }));
    return out;
  };
  const children: (InstanceType<typeof d.Paragraph> | InstanceType<typeof d.Table>)[] = [
    new d.Paragraph({ heading: d.HeadingLevel.TITLE, children: [new d.TextRun(title || t('Not'))] }),
  ];
  const lines = md.replace(/\r\n?/g, '\n').split('\n');
  const cells = (row: string) => row.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('```')) {
      const code: string[] = [];
      for (i++; i < lines.length && !lines[i].startsWith('```'); i++) code.push(lines[i]);
      for (const c of code) children.push(new d.Paragraph({ children: [new d.TextRun({ text: c || ' ', font: 'Consolas', size: 20 })], shading: { type: d.ShadingType.CLEAR, fill: 'F3F4F6', color: 'auto' } }));
      continue;
    }
    if (line.trim().startsWith('|') && /^\s*\|?\s*:?-{3,}/.test(lines[i + 1] ?? '')) {
      const head = cells(line);
      const body: string[][] = [];
      for (i += 2; i < lines.length && lines[i].trim().startsWith('|'); i++) body.push(cells(lines[i]));
      i--;
      children.push(
        new d.Table({
          width: { size: 100, type: d.WidthType.PERCENTAGE },
          rows: [head, ...body].map(
            (r, ri) => new d.TableRow({ children: head.map((_, j) => new d.TableCell({ children: [new d.Paragraph({ children: runs(r[j] ?? '', ri === 0 ? { bold: true } : {}) })] })) })
          ),
        })
      );
      continue;
    }
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      const levels = [d.HeadingLevel.HEADING_1, d.HeadingLevel.HEADING_2, d.HeadingLevel.HEADING_3, d.HeadingLevel.HEADING_4, d.HeadingLevel.HEADING_5, d.HeadingLevel.HEADING_6];
      children.push(new d.Paragraph({ heading: levels[h[1].length - 1], children: runs(h[2]) }));
      continue;
    }
    const ul = /^\s*[-*]\s+(.*)$/.exec(line);
    if (ul) {
      children.push(new d.Paragraph({ bullet: { level: 0 }, children: runs(ul[1]) }));
      continue;
    }
    const ol = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (ol) {
      children.push(new d.Paragraph({ numbering: { reference: 'num', level: 0 }, children: runs(ol[1]) }));
      continue;
    }
    if (/^>\s?/.test(line)) {
      children.push(new d.Paragraph({ indent: { left: 400 }, children: runs(line.replace(/^>\s?/, ''), { italics: true }) }));
      continue;
    }
    if (/^---+$/.test(line.trim())) {
      children.push(new d.Paragraph({ border: { bottom: { style: d.BorderStyle.SINGLE, size: 6, color: 'BBBBBB', space: 1 } }, children: [] }));
      continue;
    }
    const block = /^\$\$(.*)\$\$$/.exec(line.trim());
    if (block) {
      children.push(new d.Paragraph({ alignment: d.AlignmentType.CENTER, children: [new d.TextRun({ text: block[1], italics: true, font: 'Cambria Math' })] }));
      continue;
    }
    children.push(new d.Paragraph({ children: runs(line) }));
  }
  const file = new d.Document({
    creator: 'LrDocument',
    title,
    numbering: { config: [{ reference: 'num', levels: [{ level: 0, format: d.LevelFormat.DECIMAL, text: '%1.', alignment: d.AlignmentType.START }] }] },
    sections: [{ children }],
  });
  return d.Packer.toBlob(file);
}

// ---------------------------------------------------------------------------
// Tables: Excel / CSV / PDF out, Excel / CSV in
// ---------------------------------------------------------------------------

const EXCEL_FORMAT: Partial<Record<NumberFormat, string>> = {
  sayi: '#,##0.00',
  tamsayi: '#,##0',
  para: '#,##0.00 "₺"',
  yuzde: '0.00%',
  tarih: 'dd.mm.yyyy',
};

/** Formula for Excel files: English function names and "," between arguments. */
function toExcelFormula(raw: string): string {
  let out = '';
  let inStr = false;
  for (let i = 1; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === '"') inStr = !inStr;
    out += !inStr && ch === ';' ? ',' : ch;
  }
  return out.replace(/([A-Za-zÇĞİÖŞÜçğıöşü_.]+)\s*\(/g, (m, name: string) => {
    const up = name.toLocaleUpperCase('tr');
    const en = ALIASES[up] ?? ALIASES[up.replace(/İ/g, 'I')];
    return en ? `${en}(` : m;
  });
}

async function sheetToXlsx(doc: SheetDoc): Promise<Blob> {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  const ev = new Evaluator(doc);
  doc.sheets.forEach((sh, si) => {
    const ws: Record<string, unknown> = {};
    let maxR = 0;
    let maxC = 0;
    for (const [k, cell] of Object.entries(sh.cells)) {
      if (!cell.v) continue;
      const m = /^([A-Z]+)(\d+)$/.exec(k)!;
      const r = Number(m[2]) - 1;
      const c = colIndexOf(m[1]);
      maxR = Math.max(maxR, r);
      maxC = Math.max(maxC, c);
      const v = ev.value(si, r, c);
      const out: Record<string, unknown> = {};
      if (typeof v === 'number') Object.assign(out, { t: 'n', v });
      else if (typeof v === 'boolean') Object.assign(out, { t: 'b', v });
      else if (v && typeof v === 'object') Object.assign(out, { t: 'e', v: 0x0f, w: String(v) });
      else Object.assign(out, { t: 's', v: v ?? '' });
      if (cell.v.startsWith('=')) out.f = toExcelFormula(cell.v);
      const z = cell.s?.nf ? EXCEL_FORMAT[cell.s.nf] : undefined;
      if (z) out.z = z;
      ws[k] = out;
    }
    ws['!ref'] = t('A1:{v0}', { v0: addr(maxR, maxC) });
    ws['!cols'] = Array.from({ length: maxC + 1 }, (_, c) => ({ wpx: sh.widths?.[c] ?? 104 }));
    XLSX.utils.book_append_sheet(wb, ws as never, sh.name.slice(0, 31) || t('Sayfa{v0}', { v0: si + 1 }));
  });
  const data = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

function colIndexOf(name: string): number {
  let n = 0;
  for (const ch of name) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function sheetToCsv(doc: SheetDoc): Blob {
  const sh = doc.sheets[doc.active];
  const ev = new Evaluator(doc);
  let maxR = -1;
  let maxC = -1;
  for (const k of Object.keys(sh.cells)) {
    const m = /^([A-Z]+)(\d+)$/.exec(k)!;
    maxR = Math.max(maxR, Number(m[2]) - 1);
    maxC = Math.max(maxC, colIndexOf(m[1]));
  }
  const lines: string[] = [];
  for (let r = 0; r <= maxR; r++) {
    const row: string[] = [];
    for (let c = 0; c <= maxC; c++) {
      const text = formatValue(ev.value(doc.active, r, c), sh.cells[addr(r, c)]?.s?.nf === 'tarih' ? 'tarih' : 'genel');
      row.push(/[;"\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text);
    }
    lines.push(row.join(';'));
  }
  // BOM + ";" so Turkish Excel opens it with the right columns and characters.
  return new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
}

const wideTable = (doc: SheetDoc) => {
  const sh = doc.sheets[doc.active];
  let maxC = 0;
  for (const k of Object.keys(sh.cells)) maxC = Math.max(maxC, colIndexOf(/^([A-Z]+)/.exec(k)![1]));
  return maxC >= 6;
};

function tableHtml(title: string, doc: SheetDoc): string {
  const sh = doc.sheets[doc.active];
  const ev = new Evaluator(doc);
  let maxR = -1;
  let maxC = -1;
  for (const k of Object.keys(sh.cells)) {
    const m = /^([A-Z]+)(\d+)$/.exec(k)!;
    maxR = Math.max(maxR, Number(m[2]) - 1);
    maxC = Math.max(maxC, colIndexOf(m[1]));
  }
  const rows: string[] = [];
  for (let r = 0; r <= Math.min(maxR, 1999); r++) {
    const tds: string[] = [];
    for (let c = 0; c <= maxC; c++) {
      const cell = sh.cells[addr(r, c)];
      const v = ev.value(doc.active, r, c);
      const s = cell?.s;
      const style = [
        `text-align:${s?.al === 'c' ? 'center' : s?.al === 'r' || (typeof v === 'number' && !s?.al) ? 'right' : 'left'}`,
        s?.b ? 'font-weight:600' : '',
        s?.i ? 'font-style:italic' : '',
        s?.u ? 'text-decoration:underline' : '',
        s?.bg ? `background:${s.bg}` : '',
        s?.fg ? `color:${s.fg}` : '',
      ]
        .filter(Boolean)
        .join(';');
      tds.push(`<td style="border:1px solid #d1d5db;padding:4px 6px;${style}">${escapeHtml(formatValue(v, s?.nf))}</td>`);
    }
    rows.push(`<tr>${tds.join('')}</tr>`);
  }
  const head = `<tr><th style="border:1px solid #d1d5db;background:#f3f4f6"></th>${Array.from({ length: maxC + 1 }, (_, c) => `<th style="border:1px solid #d1d5db;background:#f3f4f6;padding:4px 6px">${colName(c)}</th>`).join('')}</tr>`;
  const numbered = rows.map((tr, r) => tr.replace('<tr>', `<tr><td style="border:1px solid #d1d5db;background:#f3f4f6;color:#6b7280;padding:4px 6px;text-align:center">${r + 1}</td>`));
  return `<h1 style="font-size:20px;font-weight:600;margin:0 0 4px">${escapeHtml(title || 'Tablo')}</h1><p style="color:#6b7280;margin:0 0 12px">${escapeHtml(sh.name)}</p><table style="border-collapse:collapse;font-size:12px;width:100%">${head}${numbered.join('')}</table>`;
}

export const TABLE_IMPORT_ACCEPT = '.xlsx,.xls,.xlsm,.ods,.csv,.tsv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv';

/** An Excel / LibreOffice / CSV file → table note content. */
export async function importTableFile(file: File): Promise<{ title: string; doc: SheetDoc; notes: string[] }> {
  if (file.size > 15 * 1024 * 1024) throw new Error(t('Dosya en fazla 15 MB olabilir.'));
  const name = file.name.toLowerCase();
  const title = file.name.replace(/\.[^.]+$/, '').slice(0, 200) || t('İçe aktarılan tablo');
  const notes: string[] = [];
  if (name.endsWith('.csv') || name.endsWith('.tsv') || file.type === 'text/csv') {
    return { title, doc: csvToDoc(await file.text()), notes };
  }
  const XLSX = await import('xlsx');
  const wb = XLSX.read(new Uint8Array(await file.arrayBuffer()), { type: 'array', cellFormula: true, cellDates: false, cellNF: true });
  const doc = newDoc();
  doc.sheets = [];
  for (const sheetName of wb.SheetNames.slice(0, 50)) {
    const ws = wb.Sheets[sheetName] as Record<string, { t?: string; v?: unknown; f?: string; z?: string; w?: string }>;
    const ref = (ws['!ref'] as unknown as string) || t('A1:A1');
    const range = XLSX.utils.decode_range(ref);
    const rows = Math.min(5000, range.e.r + 1);
    const cols = Math.min(104, range.e.c + 1);
    if (range.e.r + 1 > 5000 || range.e.c + 1 > 104) notes.push(`"${sheetName}" sayfasının ilk 5000 satırı ve 104 sütunu alındı.`);
    const cells: Record<string, Cell> = {};
    for (const [k, c] of Object.entries(ws)) {
      if (k.startsWith('!') || !c) continue;
      const pos = XLSX.utils.decode_cell(k);
      if (pos.r >= rows || pos.c >= cols) continue;
      let v = '';
      let nf: NumberFormat | undefined;
      if (c.f) v = `=${c.f}`;
      else if (c.t === 'n' && typeof c.v === 'number') {
        v = String(c.v).replace('.', ',');
        if (c.z && XLSX.SSF.is_date(c.z)) nf = 'tarih';
        else if (c.z && /%/.test(c.z)) nf = 'yuzde';
      } else if (c.t === 'b') v = c.v ? t('DOĞRU') : t('YANLIŞ');
      else if (c.v !== undefined && c.v !== null) v = String(c.v);
      if (!v) continue;
      cells[addr(pos.r, pos.c)] = nf ? { v: v.slice(0, 5000), s: { nf } } : { v: v.slice(0, 5000) };
    }
    const widths: Record<number, number> = {};
    ((ws['!cols'] as unknown as { wpx?: number }[] | undefined) ?? []).forEach((col, i) => {
      if (col?.wpx && i < 104) widths[i] = Math.min(600, Math.max(40, Math.round(col.wpx)));
    });
    doc.sheets.push({ name: sheetName.slice(0, 31), rows: Math.max(rows, 30), cols: Math.max(cols, 8), cells, widths });
  }
  if (!doc.sheets.length) return { title, doc: newDoc(), notes };
  notes.push('Formüller ve değerler aktarıldı; hücre renkleri ve kenarlıklar aktarılmaz.');
  return { title, doc: parseDoc(JSON.stringify(doc)), notes };
}

function csvToDoc(text: string): SheetDoc {
  const clean = text.replace(/^﻿/, '');
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? '';
  const delim = ['\t', ';', ','].map((d) => [d, firstLine.split(d).length] as const).sort((a, b) => b[1] - a[1])[0][0];
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (quoted) {
      if (ch === '"' && clean[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"' && field === '') quoted = true;
    else if (ch === delim) {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && clean[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      if (rows.length >= 5000) break;
    } else field += ch;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  const doc = newDoc();
  const sh = doc.sheets[0];
  rows.forEach((r, i) => r.slice(0, 104).forEach((v, j) => v && (sh.cells[addr(i, j)] = { v: v.slice(0, 5000) })));
  sh.rows = Math.max(30, rows.length + 10);
  sh.cols = Math.max(8, Math.min(104, Math.max(0, ...rows.map((r) => r.length)) + 2));
  return doc;
}
