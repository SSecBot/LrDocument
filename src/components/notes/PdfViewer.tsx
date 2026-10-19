'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Minus, Plus, ScanText } from 'lucide-react';
import { loadPdfJs, pdfDocumentOptions } from '@/lib/academic/pdfjsLoader';
import { useAppStore } from '@/store/useAppStore';

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 4;
/** Smaller steps below %100, so %10 … %90 can all be reached. */
const zoomStep = (z: number, dir: 1 | -1) => {
  const step = z < 1 || (z === 1 && dir < 0) ? 0.1 : 0.25;
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round((z + dir * step) * 100) / 100));
};
const isPhone = () => typeof window !== 'undefined' && window.innerWidth < 768;

interface PdfPage {
  getViewport(opts: { scale: number }): { width: number; height: number };
  render(opts: { canvasContext: CanvasRenderingContext2D; viewport: unknown; canvas: HTMLCanvasElement }): { promise: Promise<void>; cancel(): void };
  cleanup(): void;
}
interface PdfDoc {
  numPages: number;
  getPage(n: number): Promise<PdfPage>;
}
interface PdfJs {
  getDocument(src: { data: Uint8Array } & Record<string, unknown>): { promise: Promise<PdfDoc>; destroy(): Promise<void> };
}

/** Loads a stored PDF (decrypted by the server for this session only); nothing is cached in the browser. */
export async function fetchStoredFile(fileId: string): Promise<Uint8Array> {
  const res = await fetch(`/api/files/${encodeURIComponent(fileId)}`, { cache: 'no-store' });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'PDF açılamadı.');
  return new Uint8Array(await res.arrayBuffer());
}

/**
 * The in-app PDF reader of a PDF note: pages render as they scroll into view, fit the width,
 * and can be zoomed. The file is never converted; "Metne dönüştür" creates a separate text note.
 */
export function PdfViewer({ fileId, onConvert }: { fileId: string; onConvert?: (data: Uint8Array) => void }) {
  const [doc, setDoc] = useState<PdfDoc | null>(null);
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Opens at the zoom left last time on this kind of device (phone / larger screen);
  // the first time %75 on phones and %50 elsewhere.
  const { preferences, setPreference } = useAppStore();
  const [phone] = useState(isPhone);
  const zoom = (phone ? preferences.pdfZoomMobile : preferences.pdfZoomDesktop) ?? (phone ? 0.75 : 0.5);
  const setZoom = (next: number | ((z: number) => number)) => {
    const value = typeof next === 'function' ? next(zoom) : next;
    setPreference(phone ? 'pdfZoomMobile' : 'pdfZoomDesktop', Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value)));
  };
  const [width, setWidth] = useState(0);
  const [page, setPage] = useState(1);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let task: { destroy(): Promise<void> } | null = null;
    (async () => {
      try {
        const data = await fetchStoredFile(fileId);
        if (cancelled) return;
        setBytes(data.slice());
        const pdfjs = await loadPdfJs<PdfJs>();
        task = pdfjs.getDocument({ data, ...pdfDocumentOptions() });
        const d = await (task as unknown as { promise: Promise<PdfDoc> }).promise;
        if (!cancelled) setDoc(d);
      } catch (err) {
        if (!cancelled) setError((err as Error).message || 'PDF açılamadı.');
      }
    })();
    return () => {
      cancelled = true;
      void task?.destroy();
    };
  }, [fileId]);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (error) return <p className="p-6 text-sm text-rose-300">{error}</p>;
  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-line bg-surface text-xs text-subtle">
        <button onClick={() => setZoom((z) => zoomStep(z, -1))} disabled={zoom <= MIN_ZOOM} className="w-8 h-8 rounded-md inline-flex items-center justify-center hover:bg-surface-2 disabled:opacity-40" aria-label="Uzaklaştır">
          <Minus className="w-4 h-4" />
        </button>
        <button onClick={() => setZoom(1)} className="h-8 px-2 rounded-md hover:bg-surface-2 tabular-nums" title="Sayfa genişliğine sığdır">
          %{Math.round(zoom * 100)}
        </button>
        <button onClick={() => setZoom((z) => zoomStep(z, 1))} disabled={zoom >= MAX_ZOOM} className="w-8 h-8 rounded-md inline-flex items-center justify-center hover:bg-surface-2 disabled:opacity-40" aria-label="Yakınlaştır">
          <Plus className="w-4 h-4" />
        </button>
        {doc && (
          <span className="ml-1 tabular-nums" aria-live="polite">
            Sayfa {page} / {doc.numPages}
          </span>
        )}
        {onConvert && bytes && (
          <button onClick={() => onConvert(bytes)} className="ml-auto h-8 px-2.5 rounded-md border border-line hover:bg-surface-2 hover:text-fg inline-flex items-center gap-1.5" title="PDF'teki yazıyı (el yazısı dahil) okuyup yeni bir metin notu oluşturur">
            <ScanText className="w-3.5 h-3.5" /> Metne dönüştür
          </button>
        )}
      </div>
      <div ref={box} className="flex-1 min-h-0 overflow-auto bg-surface-2/60 p-2 sm:p-4" onScroll={(e) => {
        const el = e.currentTarget;
        const kids = Array.from(el.querySelectorAll<HTMLElement>('[data-page]'));
        const mid = el.scrollTop + el.clientHeight / 3;
        const current = kids.findLast((k) => k.offsetTop <= mid);
        if (current) setPage(Number(current.dataset.page));
      }}>
        {!doc ? (
          <div className="flex items-center justify-center h-40 text-muted gap-2 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> PDF açılıyor…
          </div>
        ) : (
          <div className="space-y-3 mx-auto" style={{ width: Math.max(40, (width - 16) * zoom) }}>
            {Array.from({ length: doc.numPages }, (_, i) => (
              <PageCanvas key={i} doc={doc} n={i + 1} width={Math.max(40, (width - 16) * zoom)} root={box} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PageCanvas({ doc, n, width, root }: { doc: PdfDoc; n: number; width: number; root: React.RefObject<HTMLDivElement | null> }) {
  const holder = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(n <= 2);
  const [ratio, setRatio] = useState(1.414);

  useEffect(() => {
    const el = holder.current;
    if (!el) return;
    // Pages far from the visible area release their canvas (phones and tablets limit canvas memory).
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { root: root.current, rootMargin: '1200px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [root]);

  useEffect(() => {
    const c = canvas.current;
    if (!visible && c) {
      c.width = 0;
      c.height = 0;
    }
    if (!visible || !width) return;
    let cancelled = false;
    let renderTask: { cancel(): void } | null = null;
    (async () => {
      const page = await doc.getPage(n);
      if (cancelled) return;
      const base = page.getViewport({ scale: 1 });
      setRatio(base.height / base.width);
      // Sharp on high-density screens, but at most ~5 megapixels per page.
      const fit = width / base.width;
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5, Math.sqrt(5_000_000 / (base.width * fit * base.height * fit)));
      const viewport = page.getViewport({ scale: fit * Math.max(1, dpr) });
      const target = canvas.current;
      if (!target) return;
      const c = target;
      c.width = Math.floor(viewport.width);
      c.height = Math.floor(viewport.height);
      const task = page.render({ canvasContext: c.getContext('2d')!, viewport, canvas: c });
      renderTask = task;
      await task.promise.catch(() => {});
      page.cleanup();
    })();
    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [doc, n, width, visible]);

  return (
    <div ref={holder} data-page={n} className="bg-white shadow-md rounded-sm overflow-hidden" style={{ width, height: width * ratio }}>
      <canvas ref={canvas} className="w-full h-full block" aria-label={`Sayfa ${n}`} />
    </div>
  );
}
