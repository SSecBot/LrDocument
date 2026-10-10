import type { PdfTextItem } from './scheduleParser';

// Minimal structural types so this works with both the browser and the legacy (Node) pdf.js builds.
interface PdfJsTextItem {
  str?: string;
  transform?: number[];
  width?: number;
  height?: number;
}
interface PdfJsViewport {
  height: number;
  convertToViewportPoint(x: number, y: number): number[];
}
interface PdfJsPage {
  getViewport(opts: { scale: number }): PdfJsViewport;
  getTextContent(): Promise<{ items: unknown[] }>;
  cleanup(): void;
}
interface PdfJsDocument {
  numPages: number;
  getPage(n: number): Promise<PdfJsPage>;
}
export interface PdfJsLike {
  getDocument(src: { data: Uint8Array; isEvalSupported?: boolean; disableFontFace?: boolean }): { promise: Promise<PdfJsDocument>; destroy(): Promise<void> };
}

export const MAX_SCHEDULE_PDF_PAGES = 10;

/** Extracts positioned text items (top-down coordinates) from the first pages of a PDF. */
export async function extractPdfItems(pdfjs: PdfJsLike, data: Uint8Array): Promise<PdfTextItem[]> {
  const task = pdfjs.getDocument({ data, isEvalSupported: false, disableFontFace: true });
  const doc = await task.promise.catch(async (err) => {
    await task.destroy();
    throw err;
  });
  const items: PdfTextItem[] = [];
  try {
    const pages = Math.min(doc.numPages, MAX_SCHEDULE_PDF_PAGES);
    for (let p = 1; p <= pages; p++) {
      const page = await doc.getPage(p);
      const viewport = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();
      for (const raw of content.items as PdfJsTextItem[]) {
        if (!raw.str || !raw.transform) continue;
        const [a, b, c, d, e, f] = raw.transform;
        const [x, y] = viewport.convertToViewportPoint(e, f);
        const fontSize = Math.hypot(c, d) || Math.hypot(a, b) || raw.height || 10;
        const rotated = Math.abs(b) > Math.abs(a);
        items.push({
          str: raw.str,
          x,
          y,
          w: rotated ? fontSize : raw.width ?? 0,
          h: rotated ? raw.width ?? fontSize : raw.height || fontSize,
          page: p,
        });
      }
      page.cleanup();
    }
  } finally {
    await task.destroy();
  }
  return items;
}
