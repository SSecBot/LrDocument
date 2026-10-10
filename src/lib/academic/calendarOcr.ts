'use client';

// Reads an academic-calendar PDF in the browser: uses the text layer when there is one,
// otherwise renders each page and runs OCR (tesseract.js, Turkish model served from /ocr).
// Nothing is uploaded to the server.

import type { Worker as TesseractWorker } from 'tesseract.js';
import { groupLines, type PdfTextItem } from './scheduleParser';

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
  getDocument(src: { data: Uint8Array; isEvalSupported?: boolean }): {
    promise: Promise<{ numPages: number; getPage(n: number): Promise<RenderablePage>; destroy(): Promise<void> }>;
  };
}

async function createOcrWorker(onProgress: (p: number) => void): Promise<TesseractWorker> {
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
  // Table rows read best as a single column of variable-size text.
  await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_COLUMN });
  return worker;
}

/** One string per table row, in reading order. */
export async function readCalendarRows(
  pdfjs: PdfJsRenderLike,
  data: Uint8Array,
  onProgress: (p: OcrProgress) => void
): Promise<{ rows: string[]; usedOcr: boolean }> {
  const doc = await pdfjs.getDocument({ data, isEvalSupported: false }).promise;
  const rows: string[] = [];
  let worker: TesseractWorker | null = null;
  const pages = Math.min(doc.numPages, MAX_CALENDAR_PAGES);
  try {
    for (let n = 1; n <= pages; n++) {
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
          worker = await createOcrWorker((p) => onProgress({ page: n, pages, stage: 'ocr', progress: p }));
        }
        const scaled = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(scaled.width);
        canvas.height = Math.ceil(scaled.height);
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // 'print' renders without requestAnimationFrame, so it also finishes in a background tab.
        await page.render({ canvasContext: ctx, viewport: scaled, canvas, intent: 'print' }).promise;
        onProgress({ page: n, pages, stage: 'ocr', progress: 0 });
        const { data: result } = await worker.recognize(canvas, {}, { blocks: true, text: false });
        for (const block of result.blocks ?? []) {
          for (const para of block.paragraphs) for (const line of para.lines) if (line.text.trim()) rows.push(line.text.trim());
        }
        canvas.width = canvas.height = 0;
      }
      page.cleanup();
    }
  } finally {
    await worker?.terminate();
    await doc.destroy();
  }
  return { rows, usedOcr: worker !== null };
}
