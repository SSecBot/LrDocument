'use client';

let pdfjsPromise: Promise<unknown> | null = null;

/** Loads pdf.js on demand; PDFs are parsed in the browser and never uploaded. */
export function loadPdfJs<T>(): Promise<T> {
  pdfjsPromise ??= import('pdfjs-dist').then((mod) => {
    mod.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
    return mod;
  });
  return pdfjsPromise as Promise<T>;
}
