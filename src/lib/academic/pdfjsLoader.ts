'use client';

let pdfjsPromise: Promise<unknown> | null = null;

/**
 * Loads pdf.js on demand; PDFs are parsed in the browser and never uploaded.
 * The legacy build ships polyfills (Map.getOrInsertComputed, Promise.withResolvers, iterator
 * helpers…) that the modern build expects natively and that iOS/iPadOS Safari lacks.
 */
export function loadPdfJs<T>(): Promise<T> {
  pdfjsPromise ??= import('pdfjs-dist/legacy/build/pdf.mjs').then((mod) => {
    mod.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/legacy/build/pdf.worker.min.mjs', import.meta.url).toString();
    return mod;
  });
  return pdfjsPromise as Promise<T>;
}
