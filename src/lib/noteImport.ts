'use client';

// Turns an uploaded file into note content (Markdown). Everything runs in the browser:
// PDF via pdf.js (OCR when the PDF has no text layer), Word .docx via mammoth, .md/.txt as-is.

import { loadPdfJs } from '@/lib/academic/pdfjsLoader';
import { readCalendarRows, type OcrProgress, type PdfJsRenderLike } from '@/lib/academic/calendarOcr';

export const NOTE_IMPORT_ACCEPT = '.pdf,.docx,.md,.markdown,.txt,application/pdf,text/markdown,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
export const MAX_IMPORT_BYTES = 20 * 1024 * 1024;
const MAX_PDF_PAGES = 60;
/** Notes are capped server-side at 200 000 characters. */
export const MAX_NOTE_CHARS = 200_000;

export interface ImportedNote {
  title: string;
  content: string;
  /** Shown to the user, e.g. "OCR ile okundu" or "ilk 60 sayfa alındı". */
  notes: string[];
}

export type ImportKind = 'pdf' | 'docx' | 'md' | 'txt';

export function importKindOf(file: File): ImportKind | null {
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf') || file.type === 'application/pdf') return 'pdf';
  if (name.endsWith('.docx')) return 'docx';
  if (name.endsWith('.md') || name.endsWith('.markdown')) return 'md';
  if (name.endsWith('.txt') || file.type === 'text/plain') return 'txt';
  return null;
}

const titleOf = (file: File) => file.name.replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ').trim().slice(0, 200) || 'İçe aktarılan not';

export async function importNoteFile(file: File, onProgress?: (p: OcrProgress) => void): Promise<ImportedNote> {
  const kind = importKindOf(file);
  if (!kind) throw new ImportError('Desteklenmeyen dosya türü. PDF, Word (.docx), Markdown (.md) veya metin (.txt) seçin.');
  if (file.size > MAX_IMPORT_BYTES) throw new ImportError('Dosya en fazla 20 MB olabilir.');

  const notes: string[] = [];
  let content: string;
  if (kind === 'md' || kind === 'txt') {
    content = await file.text();
  } else if (kind === 'docx') {
    content = await docxToMarkdown(await file.arrayBuffer());
  } else {
    const pdfjs = await loadPdfJs<PdfJsRenderLike>();
    const result = await readCalendarRows(pdfjs, new Uint8Array(await file.arrayBuffer()), onProgress ?? (() => {}), MAX_PDF_PAGES);
    if (result.usedOcr) notes.push('Taranmış sayfalar metin tanıma (OCR) ile okundu; metni kontrol edin.');
    if (result.pages > MAX_PDF_PAGES) notes.push(`PDF ${result.pages} sayfa; ilk ${MAX_PDF_PAGES} sayfa alındı.`);
    content = rowsToParagraphs(result.rows);
  }

  content = content.replace(/\r\n?/g, '\n').replace(/\u0000/g, '').trim();
  if (!content) throw new ImportError('Dosyada okunabilir metin bulunamadı.');
  if (content.length > MAX_NOTE_CHARS) {
    content = content.slice(0, MAX_NOTE_CHARS);
    notes.push('Metin çok uzundu; ilk 200.000 karakter alındı.');
  }
  return { title: titleOf(file), content, notes };
}

export class ImportError extends Error {}

/** PDF lines → paragraphs: a line ending a sentence or followed by an empty row closes a paragraph. */
function rowsToParagraphs(rows: string[]): string {
  const out: string[] = [];
  let para = '';
  for (const raw of rows) {
    const line = raw.trim();
    if (!line) {
      if (para) out.push(para);
      para = '';
      continue;
    }
    // Re-join words hyphenated across lines ("hesap-\nlama").
    para = para.endsWith('-') ? para.slice(0, -1) + line : para ? `${para} ${line}` : line;
    if (/[.!?:]$/.test(line) && line.length < 70) {
      out.push(para);
      para = '';
    }
  }
  if (para) out.push(para);
  return out.join('\n\n');
}

async function docxToMarkdown(buffer: ArrayBuffer): Promise<string> {
  const mammoth = await import('mammoth');
  const { value: html } = await mammoth.convertToHtml({ arrayBuffer: buffer });
  return htmlToMarkdown(html);
}

/** Small HTML → Markdown converter for mammoth's output (headings, emphasis, lists, links, tables). */
export function htmlToMarkdown(html: string): string {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  const inline = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return (node.textContent ?? '').replace(/\s+/g, ' ');
    if (!(node instanceof HTMLElement)) return '';
    const inner = Array.from(node.childNodes).map(inline).join('');
    switch (node.tagName) {
      case 'STRONG':
      case 'B':
        return inner.trim() ? `**${inner.trim()}**` : '';
      case 'EM':
      case 'I':
        return inner.trim() ? `*${inner.trim()}*` : '';
      case 'A': {
        const href = node.getAttribute('href') ?? '';
        return /^https?:\/\//i.test(href) ? `[${inner.trim() || href}](${href})` : inner;
      }
      case 'BR':
        return '\n';
      case 'IMG':
        return '';
      case 'SUP':
        return `^${inner}`;
      case 'SUB':
        return `_${inner}`;
      default:
        return inner;
    }
  };
  const block = (el: Element, depth = 0): string => {
    switch (el.tagName) {
      case 'H1':
      case 'H2':
      case 'H3':
      case 'H4':
      case 'H5':
      case 'H6':
        return `${'#'.repeat(Number(el.tagName[1]))} ${inline(el).trim()}`;
      case 'P':
        return inline(el).trim();
      case 'UL':
      case 'OL':
        return Array.from(el.children)
          .map((li, i) => {
            const bullet = el.tagName === 'OL' ? `${i + 1}.` : '-';
            const nested = Array.from(li.children).filter((c) => c.tagName === 'UL' || c.tagName === 'OL');
            const text = Array.from(li.childNodes)
              .filter((c) => !(c instanceof Element && (c.tagName === 'UL' || c.tagName === 'OL')))
              .map(inline)
              .join('')
              .trim();
            return [`${'  '.repeat(depth)}${bullet} ${text}`, ...nested.map((n) => block(n, depth + 1))].join('\n');
          })
          .join('\n');
      case 'TABLE': {
        const rows = Array.from(el.querySelectorAll('tr')).map((tr) =>
          Array.from(tr.children).map((td) => inline(td).trim().replace(/\|/g, '\\|'))
        );
        if (rows.length === 0) return '';
        const width = Math.max(...rows.map((r) => r.length));
        const line = (r: string[]) => `| ${Array.from({ length: width }, (_, i) => r[i] ?? '').join(' | ')} |`;
        return [line(rows[0]), `| ${Array(width).fill('---').join(' | ')} |`, ...rows.slice(1).map(line)].join('\n');
      }
      default:
        return inline(el).trim();
    }
  };
  return Array.from(doc.body.children)
    .map((el) => block(el))
    .filter(Boolean)
    .join('\n\n');
}
