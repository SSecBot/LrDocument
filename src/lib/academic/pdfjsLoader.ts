'use client';

let pdfjsPromise: Promise<unknown> | null = null;

/**
 * Safari (every browser on iPhone/iPad) cannot iterate a ReadableStream with `for await`, which
 * pdf.js uses in `page.getTextContent()`. The result was "undefined is not a function" on phones
 * and tablets while desktop Chrome worked. Adds the standard `values()` / `Symbol.asyncIterator`
 * only when they are missing.
 */
function polyfillReadableStreamIteration() {
  const proto = (globalThis as unknown as { ReadableStream?: { prototype: Record<PropertyKey, unknown> } }).ReadableStream?.prototype;
  if (!proto || typeof proto[Symbol.asyncIterator] === 'function') return;

  function values(this: ReadableStream, options?: { preventCancel?: boolean }) {
    const reader = this.getReader();
    const preventCancel = !!options?.preventCancel;
    const iterator: AsyncIterableIterator<unknown> = {
      async next() {
        try {
          const result = await reader.read();
          if (result.done) reader.releaseLock();
          return result as IteratorResult<unknown>;
        } catch (err) {
          reader.releaseLock();
          throw err;
        }
      },
      async return(value?: unknown) {
        if (!preventCancel) {
          const cancelled = reader.cancel(value);
          reader.releaseLock();
          await cancelled;
        } else {
          reader.releaseLock();
        }
        return { done: true, value } as IteratorResult<unknown>;
      },
      [Symbol.asyncIterator]() {
        return iterator;
      },
    };
    return iterator;
  }

  Object.defineProperty(proto, 'values', { value: values, writable: true, configurable: true });
  Object.defineProperty(proto, Symbol.asyncIterator, { value: values, writable: true, configurable: true });
}

/**
 * Loads pdf.js on demand; PDFs are parsed in the browser and never uploaded.
 * The legacy build ships polyfills (Map.getOrInsertComputed, Promise.withResolvers, iterator
 * helpers…) that the modern build expects natively and that iOS/iPadOS Safari lacks.
 */
export function loadPdfJs<T>(): Promise<T> {
  polyfillReadableStreamIteration();
  pdfjsPromise ??= import('pdfjs-dist/legacy/build/pdf.mjs').then((mod) => {
    mod.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/legacy/build/pdf.worker.min.mjs', import.meta.url).toString();
    return mod;
  });
  return pdfjsPromise as Promise<T>;
}

/**
 * Options for `getDocument`: where pdf.js finds its helper data (served by this app from
 * /ocr/pdfjs, copied by scripts/copy-ocr-assets.mjs). Absolute URLs because the worker resolves them.
 */
export function pdfDocumentOptions() {
  const base = `${window.location.origin}/ocr/pdfjs`;
  return {
    standardFontDataUrl: `${base}/standard_fonts/`,
    cMapUrl: `${base}/cmaps/`,
    cMapPacked: true,
    wasmUrl: `${base}/wasm/`,
    isEvalSupported: false,
  };
}
