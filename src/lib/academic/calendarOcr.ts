'use client';

// Reads an academic-calendar PDF in the browser: uses the text layer when there is one,
// otherwise renders each page and runs OCR (tesseract.js, Turkish model served from /ocr).
// Nothing is uploaded to the server.

import type { Worker as TesseractWorker } from 'tesseract.js';
import { groupLines, type PdfTextItem } from './scheduleParser';
import { OcrError } from './pdfErrors';
import { pdfDocumentOptions } from './pdfjsLoader';

export const MAX_CALENDAR_PAGES = 10;

export interface OcrProgress {
  page: number;
  pages: number;
  /** "metin" = text layer, "ocr" = recognising an image, "hazirlik" = loading the OCR engine */
  stage: 'metin' | 'hazirlik' | 'ocr';
  /** 0–1 within the current stage */
  progress: number;
}

// Minimal structural types for the browser pdf.js build.
interface RenderablePage {
  getViewport(opts: { scale: number }): { width: number; height: number; convertToViewportPoint(x: number, y: number): number[] };
  getTextContent(): Promise<{ items: unknown[] }>;
  render(opts: { canvasContext: CanvasRenderingContext2D; viewport: unknown; canvas: HTMLCanvasElement; intent?: string }): {
    promise: Promise<void>;
  };
  cleanup(): void;
}
export interface PdfJsRenderLike {
  getDocument(src: { data: Uint8Array } & Record<string, unknown>): {
    promise: Promise<{ numPages: number; getPage(n: number): Promise<RenderablePage> }>;
    /** Since pdf.js 6 the loading task, not the document, releases the worker-side resources. */
    destroy(): Promise<void>;
  };
}

async function createOcrWorker(onProgress: (p: number) => void, handwriting = false): Promise<TesseractWorker> {
  const { createWorker, OEM, PSM } = await import('tesseract.js');
  // The worker runs from a blob URL, so every path must be absolute.
  const base = `${window.location.origin}/ocr`;
  const worker = await createWorker('tur', OEM.LSTM_ONLY, {
    workerPath: `${base}/worker.min.js`,
    corePath: `${base}/core`,
    langPath: `${base}/lang`,
    gzip: true,
    logger: (m: { status: string; progress: number }) => {
      if (m.status === 'recognizing text') onProgress(m.progress);
    },
  });
  // Table rows read best as a single column of variable-size text; handwritten pages are laid out
  // freely, so the page layout is detected automatically there.
  await worker.setParameters({
    tessedit_pageseg_mode: handwriting ? PSM.AUTO : PSM.SINGLE_COLUMN,
    preserve_interword_spaces: '1',
  });
  return worker;
}

/**
 * Prepares a handwritten page for OCR: grey scale, contrast stretch and a global (Otsu) threshold,
 * so pen strokes become solid black on white paper (ruled lines and shadows mostly disappear).
 */
function binarize(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  const grey = new Uint8ClampedArray(d.length / 4);
  let lo = 255;
  let hi = 0;
  for (let i = 0, j = 0; i < d.length; i += 4, j++) {
    const g = (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000;
    grey[j] = g;
    if (g < lo) lo = g;
    if (g > hi) hi = g;
  }
  const span = Math.max(1, hi - lo);
  const hist = new Array(256).fill(0);
  for (let j = 0; j < grey.length; j++) {
    grey[j] = ((grey[j] - lo) * 255) / span;
    hist[grey[j]]++;
  }
  // Otsu's threshold
  let sum = 0;
  for (let t = 0; t < 256; t++) sum += t * hist[t];
  let sumB = 0;
  let wB = 0;
  let best = 0;
  let threshold = 160;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (!wB) continue;
    const wF = grey.length - wB;
    if (!wF) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) ** 2;
    if (between > best) {
      best = between;
      threshold = t;
    }
  }
  for (let i = 0, j = 0; i < d.length; i += 4, j++) {
    const v = grey[j] > threshold ? 255 : 0;
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(img, 0, 0);
}

/**
 * One string per text line, in reading order (an empty string separates pages).
 * Also used by the note importer, which allows more pages.
 */
export async function readCalendarRows(
  pdfjs: PdfJsRenderLike,
  data: Uint8Array,
  onProgress: (p: OcrProgress) => void,
  maxPages = MAX_CALENDAR_PAGES,
  /** El yazısı: OCR every page without a text layer with handwriting preprocessing. */
  options: { handwriting?: boolean } = {}
): Promise<{ rows: string[]; usedOcr: boolean; pages: number }> {
  const handwriting = !!options.handwriting;
  const task = pdfjs.getDocument({ data, ...pdfDocumentOptions() });
  const doc = await task.promise.catch(async (err) => {
    await task.destroy();
    throw err;
  });
  const rows: string[] = [];
  let worker: TesseractWorker | null = null;
  const pages = Math.min(doc.numPages, maxPages);
  // The OCR worker is created once; its progress callback reads the page being recognised now.
  let currentPage = 1;
  try {
    for (let n = 1; n <= pages; n++) {
      currentPage = n;
      const page = await doc.getPage(n);
      onProgress({ page: n, pages, stage: 'metin', progress: 0 });
      const viewport = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();
      const items: PdfTextItem[] = [];
      for (const raw of content.items as { str?: string; transform?: number[]; width?: number; height?: number }[]) {
        if (!raw.str?.trim() || !raw.transform) continue;
        const [x, y] = viewport.convertToViewportPoint(raw.transform[4], raw.transform[5]);
        items.push({ str: raw.str, x, y, w: raw.width ?? 0, h: raw.height || 10, page: n });
      }
      if (items.length >= 10) {
        rows.push(...groupLines(items).map((l) => l.text));
      } else {
        // No text layer (scanned or image-based PDF): OCR the rendered page.
        if (!worker) {
          onProgress({ page: n, pages, stage: 'hazirlik', progress: 0 });
          try {
            worker = await createOcrWorker((p) => onProgress({ page: currentPage, pages, stage: 'ocr', progress: p }), handwriting);
          } catch (err) {
            throw new OcrError('OCR başlatılamadı', err);
          }
        }
        const scaled = page.getViewport({ scale: handwriting ? 3 : 2 });
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(scaled.width);
        canvas.height = Math.ceil(scaled.height);
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // 'print' renders without requestAnimationFrame, so it also finishes in a background tab.
        await page.render({ canvasContext: ctx, viewport: scaled, canvas, intent: 'print' }).promise;
        if (handwriting) binarize(canvas);
        onProgress({ page: n, pages, stage: 'ocr', progress: 0 });
        const { data: result } = await worker.recognize(canvas, {}, { blocks: true, text: false }).catch((err: unknown) => {
          throw new OcrError('OCR çalıştırılamadı', err);
        });
        for (const block of result.blocks ?? []) {
          for (const para of block.paragraphs) for (const line of para.lines) if (line.text.trim()) rows.push(line.text.trim());
        }
        canvas.width = canvas.height = 0;
      }
      page.cleanup();
      rows.push('');
    }
  } finally {
    await worker?.terminate();
    await task.destroy();
  }
  return { rows, usedOcr: worker !== null, pages: doc.numPages };
}
