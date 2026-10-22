'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDownAZ,
  ArrowUpZA,
  Bold,
  Columns3,
  Italic,
  PaintBucket,
  Plus,
  Redo2,
  Rows3,
  Sigma,
  Trash2,
  Type,
  Underline,
  Undo2,
  X,
} from 'lucide-react';
import {
  Evaluator,
  FUNCTION_LIST,
  MAX_COLS,
  MAX_ROWS,
  addr,
  colName,
  formatValue,
  newSheet,
  parseAddr,
  shiftFormula,
  type Cell,
  type CellStyle,
  type NumberFormat,
  type SheetDoc,
  parseDoc,
} from '@/lib/sheet/engine';
import { shiftAxis, sortRows, usedBounds } from '@/lib/sheet/ops';
import { confirmDelete } from '@/components/ui/ConfirmDialog';

const ROW_H = 30;
const HEAD_W = 46;
const DEFAULT_W = 104;
const OVERSCAN = 8;

interface Sel {
  r: number;
  c: number;
  r2: number;
  c2: number;
}
const norm = (s: Sel) => ({ r1: Math.min(s.r, s.r2), r2: Math.max(s.r, s.r2), c1: Math.min(s.c, s.c2), c2: Math.max(s.c, s.c2) });

const NF_LABEL: Record<NumberFormat, string> = {
  genel: 'Genel',
  sayi: 'Sayı (0,00)',
  tamsayi: 'Tam sayı',
  para: 'Para (₺)',
  yuzde: 'Yüzde (%)',
  tarih: 'Tarih',
  metin: 'Metin',
};

/**
 * Tablo notu: a spreadsheet with sheets, formulas (Excel syntax, Turkish function names too),
 * formatting, sorting, row / column editing, copy & paste (also from Excel), undo and keyboard use.
 */
export function SpreadsheetEditor({ value, onChange, readOnly }: { value: string; onChange: (json: string) => void; readOnly?: boolean }) {
  const [doc, setDoc] = useState<SheetDoc>(() => parseDoc(value));
  // The stored content can change from elsewhere (a teammate, another tab). Take it over unless it is
  // what this editor itself just saved, so nobody's changes are overwritten with an old copy.
  const [seen, setSeen] = useState(value);
  const [emitted, setEmitted] = useState(value);
  if (value !== seen) {
    setSeen(value);
    if (value !== emitted) setDoc(parseDoc(value));
  }
  const emit = (next: SheetDoc) => {
    const json = JSON.stringify(next);
    setEmitted(json);
    onChange(json);
  };
  const [sel, setSel] = useState<Sel>({ r: 0, c: 0, r2: 0, c2: 0 });
  const [editing, setEditing] = useState<{ text: string; inCell: boolean } | null>(null);
  const [renaming, setRenaming] = useState<number | null>(null);
  const [scroll, setScroll] = useState({ top: 0, height: 600 });
  const [fnOpen, setFnOpen] = useState(false);
  const [history, setHistory] = useState<{ past: SheetDoc[]; future: SheetDoc[] }>({ past: [], future: [] });
  const gridRef = useRef<HTMLDivElement>(null);
  const cellInput = useRef<HTMLInputElement>(null);
  const clip = useRef<{ text: string; r: number; c: number } | null>(null);
  const drag = useRef(false);

  const si = doc.active;
  const sheet = doc.sheets[si];
  const evaluator = useMemo(() => new Evaluator(doc), [doc]);
  const range = norm(sel);
  const current = sheet.cells[addr(sel.r, sel.c)];

  // Keep the grid's visible window for row virtualization.
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const update = () => setScroll({ top: el.scrollTop, height: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    el.addEventListener('scroll', update, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener('scroll', update);
    };
  }, []);

  const commit = (next: SheetDoc) => {
    setHistory((h) => ({ past: [...h.past.slice(-99), doc], future: [] }));
    setDoc(next);
    emit(next);
  };
  const undo = () => {
    const prev = history.past[history.past.length - 1];
    if (!prev) return;
    setHistory((h) => ({ past: h.past.slice(0, -1), future: [...h.future, doc] }));
    setDoc(prev);
    emit(prev);
  };
  const redo = () => {
    const next = history.future[history.future.length - 1];
    if (!next) return;
    setHistory((h) => ({ past: [...h.past, doc], future: h.future.slice(0, -1) }));
    setDoc(next);
    emit(next);
  };

  const updateSheet = (fn: (cells: Record<string, Cell>) => void, extra?: Partial<typeof sheet>) => {
    const cells = { ...sheet.cells };
    fn(cells);
    const sheets = doc.sheets.map((s, i) => (i === si ? { ...s, ...extra, cells } : s));
    commit({ ...doc, sheets });
  };

  const setCell = (cells: Record<string, Cell>, r: number, c: number, patch: Partial<Cell>) => {
    const k = addr(r, c);
    const prev = cells[k] ?? { v: '' };
    const next: Cell = { ...prev, ...patch };
    if (!next.v && (!next.s || !Object.keys(next.s).length)) delete cells[k];
    else cells[k] = next;
  };

  const writeValue = (r: number, c: number, text: string) => {
    if (readOnly) return;
    const grow = { rows: Math.max(sheet.rows, Math.min(MAX_ROWS, r + 1)), cols: Math.max(sheet.cols, Math.min(MAX_COLS, c + 1)) };
    updateSheet((cells) => setCell(cells, r, c, { v: text.slice(0, 5000) }), grow);
  };

  const move = (dr: number, dc: number, extend = false) => {
    setSel((s) => {
      const r = Math.min(sheet.rows - 1, Math.max(0, (extend ? s.r2 : s.r) + dr));
      const c = Math.min(sheet.cols - 1, Math.max(0, (extend ? s.c2 : s.c) + dc));
      return extend ? { ...s, r2: r, c2: c } : { r, c, r2: r, c2: c };
    });
  };

  // Scroll the active cell into view.
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const top = (sel.r2 + 1) * ROW_H;
    if (top - ROW_H < el.scrollTop + ROW_H) el.scrollTop = Math.max(0, top - 2 * ROW_H);
    else if (top > el.scrollTop + el.clientHeight) el.scrollTop = top - el.clientHeight + ROW_H;
  }, [sel.r2]);

  const startEdit = (text?: string) => {
    if (readOnly) return;
    // Render the cell input now and move the focus there at once, so the next keys of fast typing
    // land in the input instead of starting the edit again.
    flushSync(() => setEditing({ text: text ?? current?.v ?? '', inCell: true }));
    const input = cellInput.current;
    if (input) {
      input.focus({ preventScroll: true });
      input.setSelectionRange(input.value.length, input.value.length);
    }
  };
  const finishEdit = (save: boolean, dr = 0, dc = 0) => {
    if (editing && save) writeValue(sel.r, sel.c, editing.text);
    setEditing(null);
    if (dr || dc) move(dr, dc);
    requestAnimationFrame(() => gridRef.current?.focus({ preventScroll: true }));
  };

  const styleRange = (patch: (s: CellStyle) => CellStyle) => {
    if (readOnly) return;
    updateSheet((cells) => {
      for (let r = range.r1; r <= range.r2; r++)
        for (let c = range.c1; c <= range.c2; c++) {
          const prev = cells[addr(r, c)];
          const s = patch({ ...(prev?.s ?? {}) });
          for (const k of Object.keys(s) as (keyof CellStyle)[]) if (s[k] === undefined || s[k] === false) delete s[k];
          setCell(cells, r, c, { v: prev?.v ?? '', s });
        }
    });
  };
  const toggle = (key: 'b' | 'i' | 'u') => {
    const on = !current?.s?.[key];
    styleRange((s) => ({ ...s, [key]: on || undefined }));
  };

  const clearRange = () => {
    if (readOnly) return;
    updateSheet((cells) => {
      for (let r = range.r1; r <= range.r2; r++) for (let c = range.c1; c <= range.c2; c++) setCell(cells, r, c, { v: '' });
    });
  };

  // ---- clipboard (TSV, compatible with Excel / Google Sheets) ----
  const copyText = () => {
    const lines: string[] = [];
    for (let r = range.r1; r <= range.r2; r++) {
      const row: string[] = [];
      for (let c = range.c1; c <= range.c2; c++) row.push((sheet.cells[addr(r, c)]?.v ?? '').replace(/[\t\n]/g, ' '));
      lines.push(row.join('\t'));
    }
    const text = lines.join('\n');
    clip.current = { text, r: range.r1, c: range.c1 };
    return text;
  };
  const pasteText = (text: string) => {
    if (readOnly || !text) return;
    const rows = text.replace(/\r\n?/g, '\n').replace(/\n$/, '').split('\n').map((l) => l.split('\t'));
    const internal = clip.current && clip.current.text === text ? clip.current : null;
    const maxR = Math.min(MAX_ROWS, range.r1 + rows.length);
    const maxC = Math.min(MAX_COLS, range.c1 + Math.max(...rows.map((r) => r.length)));
    updateSheet(
      (cells) => {
        rows.forEach((row, i) =>
          row.forEach((v, j) => {
            const r = range.r1 + i;
            const c = range.c1 + j;
            if (r >= MAX_ROWS || c >= MAX_COLS) return;
            // Copied inside the table: relative references move with the cells (like Excel).
            setCell(cells, r, c, { v: internal ? shiftFormula(v, range.r1 - internal.r, range.c1 - internal.c) : v });
          })
        );
      },
      { rows: Math.max(sheet.rows, maxR), cols: Math.max(sheet.cols, maxC) }
    );
    setSel({ r: range.r1, c: range.c1, r2: Math.min(maxR - 1, range.r1 + rows.length - 1), c2: maxC - 1 });
  };

  const fillDown = () => {
    if (readOnly || range.r2 === range.r1) return;
    updateSheet((cells) => {
      for (let c = range.c1; c <= range.c2; c++) {
        const src = cells[addr(range.r1, c)];
        for (let r = range.r1 + 1; r <= range.r2; r++) setCell(cells, r, c, { v: src ? shiftFormula(src.v, r - range.r1, 0) : '', s: src?.s });
      }
    });
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (editing) return;
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
      return;
    }
    if (mod && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      redo();
      return;
    }
    if (mod && ['b', 'i', 'u'].includes(e.key.toLowerCase())) {
      e.preventDefault();
      toggle(e.key.toLowerCase() as 'b' | 'i' | 'u');
      return;
    }
    if (mod && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      fillDown();
      return;
    }
    if (mod && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      setSel({ r: 0, c: 0, r2: sheet.rows - 1, c2: sheet.cols - 1 });
      return;
    }
    if (mod) return; // copy / paste go through the native events
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        return move(-1, 0, e.shiftKey);
      case 'ArrowDown':
        e.preventDefault();
        return move(1, 0, e.shiftKey);
      case 'ArrowLeft':
        e.preventDefault();
        return move(0, -1, e.shiftKey);
      case 'ArrowRight':
        e.preventDefault();
        return move(0, 1, e.shiftKey);
      case 'Tab':
        e.preventDefault();
        return move(0, e.shiftKey ? -1 : 1);
      case 'Enter':
        e.preventDefault();
        return e.shiftKey ? move(-1, 0) : startEdit();
      case 'F2':
        e.preventDefault();
        return startEdit();
      case 'Delete':
      case 'Backspace':
        e.preventDefault();
        return clearRange();
      default:
        if (e.key.length === 1 && !e.altKey) {
          e.preventDefault();
          startEdit(e.key);
        }
    }
  };

  // ---- rows / columns / sheets ----
  const insertRow = () => !readOnly && sheet.rows < MAX_ROWS && commit(shiftAxis(doc, si, 'row', range.r1, 1));
  const deleteRows = () => !readOnly && sheet.rows > 1 && commit(shiftAxis(doc, si, 'row', range.r1, -(range.r2 - range.r1 + 1)));
  const insertCol = () => !readOnly && sheet.cols < MAX_COLS && commit(shiftAxis(doc, si, 'col', range.c1, 1));
  const deleteCols = () => !readOnly && sheet.cols > 1 && commit(shiftAxis(doc, si, 'col', range.c1, -(range.c2 - range.c1 + 1)));
  const sort = (desc: boolean) => {
    if (readOnly) return;
    const used = usedBounds(sheet);
    if (used.rows < 0) return;
    // A single cell selected: sort the whole table below the header row.
    const [r1, r2] = range.r1 === range.r2 ? [1, used.rows] : [range.r1, range.r2];
    if (r2 <= r1) return;
    const sorted = sortRows(sheet, r1, r2, sel.c, desc, (r, c) => evaluator.value(si, r, c));
    commit({ ...doc, sheets: doc.sheets.map((s, i) => (i === si ? sorted : s)) });
  };
  const addSheet = () => {
    if (readOnly || doc.sheets.length >= 50) return;
    let n = doc.sheets.length + 1;
    while (doc.sheets.some((s) => s.name === `Sayfa${n}`)) n++;
    commit({ ...doc, sheets: [...doc.sheets, newSheet(`Sayfa${n}`)], active: doc.sheets.length });
    setSel({ r: 0, c: 0, r2: 0, c2: 0 });
  };
  const removeSheet = async (i: number) => {
    if (readOnly || doc.sheets.length < 2) return;
    if (!(await confirmDelete(`"${doc.sheets[i].name}" sayfası`, 'Geri Al (Ctrl+Z) ile geri getirebilirsiniz.'))) return;
    const sheets = doc.sheets.filter((_, j) => j !== i);
    commit({ ...doc, sheets, active: Math.min(doc.active, sheets.length - 1) });
  };
  const renameSheet = (i: number, name: string) => {
    const clean = name.replace(/[\\/?*[\]:!']/g, '').trim().slice(0, 31);
    setRenaming(null);
    if (!clean || doc.sheets.some((s, j) => j !== i && s.name.toLocaleLowerCase('tr') === clean.toLocaleLowerCase('tr'))) return;
    commit({ ...doc, sheets: doc.sheets.map((s, j) => (j === i ? { ...s, name: clean } : s)) });
  };
  const setWidth = (c: number, w: number) => {
    const sheets = doc.sheets.map((s, i) => (i === si ? { ...s, widths: { ...(s.widths ?? {}), [c]: Math.min(600, Math.max(40, Math.round(w))) } } : s));
    setDoc({ ...doc, sheets });
  };

  const widthOf = (c: number) => sheet.widths?.[c] ?? DEFAULT_W;
  const lefts: number[] = [];
  let x = HEAD_W;
  for (let c = 0; c < sheet.cols; c++) {
    lefts.push(x);
    x += widthOf(c);
  }
  const totalW = x;
  const first = Math.max(0, Math.floor(scroll.top / ROW_H) - 1 - OVERSCAN);
  const last = Math.min(sheet.rows - 1, Math.ceil((scroll.top + scroll.height) / ROW_H) + OVERSCAN);

  const display = (r: number, c: number) => {
    const cell = sheet.cells[addr(r, c)];
    const v = evaluator.value(si, r, c);
    return { text: formatValue(v, cell?.s?.nf), v, cell };
  };

  const btn = 'h-8 min-w-8 px-1.5 rounded-md inline-flex items-center justify-center text-subtle hover:text-fg hover:bg-surface-2 disabled:opacity-30 shrink-0';
  const on = (b?: boolean) => (b ? 'bg-surface-3 text-fg' : '');

  return (
    <div className="flex flex-col h-full min-h-0 bg-app">
      {/* Toolbar */}
      {!readOnly && (
        <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-line bg-surface overflow-x-auto no-scrollbar" role="toolbar" aria-label="Tablo araçları">
          <button className={btn} onClick={undo} title="Geri al (Ctrl+Z)" aria-label="Geri al" disabled={!history.past.length}>
            <Undo2 className="w-4 h-4" />
          </button>
          <button className={btn} onClick={redo} title="Yinele (Ctrl+Y)" aria-label="Yinele" disabled={!history.future.length}>
            <Redo2 className="w-4 h-4" />
          </button>
          <span className="w-px h-5 bg-line mx-1 shrink-0" />
          <button className={`${btn} ${on(current?.s?.b)}`} onClick={() => toggle('b')} title="Kalın (Ctrl+B)" aria-label="Kalın" aria-pressed={!!current?.s?.b}>
            <Bold className="w-4 h-4" />
          </button>
          <button className={`${btn} ${on(current?.s?.i)}`} onClick={() => toggle('i')} title="İtalik (Ctrl+I)" aria-label="İtalik" aria-pressed={!!current?.s?.i}>
            <Italic className="w-4 h-4" />
          </button>
          <button className={`${btn} ${on(current?.s?.u)}`} onClick={() => toggle('u')} title="Altı çizili (Ctrl+U)" aria-label="Altı çizili" aria-pressed={!!current?.s?.u}>
            <Underline className="w-4 h-4" />
          </button>
          {(['l', 'c', 'r'] as const).map((al) => {
            const Icon = al === 'l' ? AlignLeft : al === 'c' ? AlignCenter : AlignRight;
            return (
              <button
                key={al}
                className={`${btn} ${on(current?.s?.al === al)}`}
                onClick={() => styleRange((s) => ({ ...s, al: s.al === al ? undefined : al }))}
                aria-label={al === 'l' ? 'Sola hizala' : al === 'c' ? 'Ortala' : 'Sağa hizala'}
                title={al === 'l' ? 'Sola hizala' : al === 'c' ? 'Ortala' : 'Sağa hizala'}
              >
                <Icon className="w-4 h-4" />
              </button>
            );
          })}
          <select
            value={current?.s?.nf ?? 'genel'}
            onChange={(e) => styleRange((s) => ({ ...s, nf: e.target.value === 'genel' ? undefined : (e.target.value as NumberFormat) }))}
            className="h-8 bg-surface-2 border border-line rounded-md px-1.5 text-xs text-body shrink-0"
            aria-label="Sayı biçimi"
          >
            {Object.entries(NF_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <label className={`${btn} relative cursor-pointer`} title="Yazı rengi">
            <Type className="w-4 h-4" style={{ color: current?.s?.fg }} />
            <input type="color" className="absolute inset-0 opacity-0 cursor-pointer" value={current?.s?.fg ?? '#e5e7eb'} onChange={(e) => styleRange((s) => ({ ...s, fg: e.target.value }))} aria-label="Yazı rengi" />
          </label>
          <label className={`${btn} relative cursor-pointer`} title="Dolgu rengi">
            <PaintBucket className="w-4 h-4" style={{ color: current?.s?.bg }} />
            <input type="color" className="absolute inset-0 opacity-0 cursor-pointer" value={current?.s?.bg ?? '#1f2937'} onChange={(e) => styleRange((s) => ({ ...s, bg: e.target.value }))} aria-label="Dolgu rengi" />
          </label>
          <button className={btn} onClick={() => styleRange((s) => ({ ...s, fg: undefined, bg: undefined }))} title="Renkleri temizle" aria-label="Renkleri temizle">
            <X className="w-4 h-4" />
          </button>
          <span className="w-px h-5 bg-line mx-1 shrink-0" />
          <button className={btn} onClick={insertRow} title="Üste satır ekle" aria-label="Satır ekle">
            <Rows3 className="w-4 h-4" />
            <Plus className="w-3 h-3 -ml-0.5" />
          </button>
          <button className={btn} onClick={async () => (await confirmDelete('Seçili satırlar', 'Geri Al (Ctrl+Z) ile geri getirebilirsiniz.')) && deleteRows()} title="Seçili satırları sil" aria-label="Satır sil">
            <Rows3 className="w-4 h-4" />
            <Trash2 className="w-3 h-3 -ml-0.5" />
          </button>
          <button className={btn} onClick={insertCol} title="Sola sütun ekle" aria-label="Sütun ekle">
            <Columns3 className="w-4 h-4" />
            <Plus className="w-3 h-3 -ml-0.5" />
          </button>
          <button className={btn} onClick={async () => (await confirmDelete('Seçili sütunlar', 'Geri Al (Ctrl+Z) ile geri getirebilirsiniz.')) && deleteCols()} title="Seçili sütunları sil" aria-label="Sütun sil">
            <Columns3 className="w-4 h-4" />
            <Trash2 className="w-3 h-3 -ml-0.5" />
          </button>
          <button className={btn} onClick={() => sort(false)} title="Seçili sütuna göre A→Z sırala" aria-label="Artan sırala">
            <ArrowDownAZ className="w-4 h-4" />
          </button>
          <button className={btn} onClick={() => sort(true)} title="Seçili sütuna göre Z→A sırala" aria-label="Azalan sırala">
            <ArrowUpZA className="w-4 h-4" />
          </button>
          <div className="relative shrink-0">
            <button className={btn} onClick={() => setFnOpen((v) => !v)} title="Formül ekle" aria-label="Formül ekle" aria-expanded={fnOpen}>
              <Sigma className="w-4 h-4" />
            </button>
            {fnOpen && (
              <ul className="fixed z-40 mt-1 w-64 max-h-72 overflow-y-auto rounded-lg border border-line bg-surface shadow-xl text-xs">
                {FUNCTION_LIST.map(([en, tr, label]) => (
                  <li key={en}>
                    <button
                      className="w-full text-left px-3 py-2 hover:bg-surface-2"
                      onClick={() => {
                        setFnOpen(false);
                        const ref = range.r2 > range.r1 || range.c2 > range.c1 ? `${addr(range.r1, range.c1)}:${addr(range.r2, range.c2)}` : '';
                        // Put the formula below / right of a selected range, otherwise in the active cell.
                        const target = ref ? (range.r2 > range.r1 ? { r: range.r2 + 1, c: range.c1 } : { r: range.r1, c: range.c2 + 1 }) : { r: sel.r, c: sel.c };
                        setSel({ ...target, r2: target.r, c2: target.c });
                        setEditing({ text: `=${tr}(${ref})`, inCell: true });
                        requestAnimationFrame(() => cellInput.current?.focus());
                      }}
                    >
                      <span className="font-mono text-fg">{tr}</span> <span className="text-muted">({en})</span> — {label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Formula bar */}
      <div className="flex items-center gap-2 px-2 py-1.5 border-b border-line bg-surface">
        <span className="w-16 shrink-0 text-center text-xs font-mono text-muted bg-surface-2 border border-line rounded px-1 py-1">
          {range.r1 === range.r2 && range.c1 === range.c2 ? addr(sel.r, sel.c) : `${addr(range.r1, range.c1)}:${addr(range.r2, range.c2)}`}
        </span>
        <span className="text-muted text-xs italic shrink-0">fx</span>
        <input
          value={editing ? editing.text : (current?.v ?? '')}
          readOnly={readOnly}
          onFocus={() => !editing && !readOnly && setEditing({ text: current?.v ?? '', inCell: false })}
          onChange={(e) => setEditing({ text: e.target.value, inCell: false })}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              finishEdit(true, 1, 0);
            } else if (e.key === 'Escape') finishEdit(false);
          }}
          onBlur={() => editing && !editing.inCell && finishEdit(true)}
          className="flex-1 min-w-0 h-8 bg-app border border-line rounded px-2 text-sm font-mono text-fg focus:outline-none focus:border-brand"
          aria-label="Hücre içeriği / formül"
          placeholder={readOnly ? '' : 'Değer veya =TOPLA(A1:A5) gibi formül'}
        />
      </div>

      {/* Grid */}
      <div
        ref={gridRef}
        tabIndex={0}
        onKeyDown={onKey}
        onCopy={(e) => {
          if (editing) return;
          e.preventDefault();
          e.clipboardData.setData('text/plain', copyText());
        }}
        onCut={(e) => {
          if (editing || readOnly) return;
          e.preventDefault();
          e.clipboardData.setData('text/plain', copyText());
          clip.current = null;
          clearRange();
        }}
        onPaste={(e) => {
          if (editing) return;
          e.preventDefault();
          pasteText(e.clipboardData.getData('text/plain'));
        }}
        className="flex-1 min-h-0 overflow-auto relative outline-none select-none"
        aria-label={`${sheet.name} tablosu`}
        role="grid"
        aria-rowcount={sheet.rows}
        aria-colcount={sheet.cols}
      >
        <div style={{ width: totalW, height: (sheet.rows + 1) * ROW_H }} className="relative">
          {/* Column headers */}
          <div className="sticky top-0 z-20 flex" style={{ height: ROW_H, width: totalW }}>
            <div className="sticky left-0 z-30 bg-surface-2 border-r border-b border-line" style={{ width: HEAD_W }} />
            {Array.from({ length: sheet.cols }, (_, c) => (
              <div
                key={c}
                role="columnheader"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setSel(e.shiftKey ? { ...sel, r2: sheet.rows - 1, c2: c } : { r: 0, c, r2: sheet.rows - 1, c2: c });
                  gridRef.current?.focus();
                }}
                className={`relative flex items-center justify-center text-[11px] border-r border-b border-line cursor-pointer ${
                  c >= range.c1 && c <= range.c2 ? 'bg-brand/25 text-fg' : 'bg-surface-2 text-muted'
                }`}
                style={{ width: widthOf(c) }}
              >
                {colName(c)}
                <span
                  className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-brand/60"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    const startX = e.clientX;
                    const startW = widthOf(c);
                    const moveFn = (ev: MouseEvent) => setWidth(c, startW + ev.clientX - startX);
                    const up = () => {
                      window.removeEventListener('mousemove', moveFn);
                      window.removeEventListener('mouseup', up);
                      emit({ ...doc, sheets: doc.sheets.map((s, i) => (i === si ? { ...s, widths: { ...(s.widths ?? {}), [c]: widthOf(c) } } : s)) });
                    };
                    window.addEventListener('mousemove', moveFn);
                    window.addEventListener('mouseup', up);
                  }}
                />
              </div>
            ))}
          </div>

          {/* Rows */}
          {Array.from({ length: last - first + 1 }, (_, i) => {
            const r = first + i;
            return (
              <div key={r} className="absolute left-0 flex" style={{ top: (r + 1) * ROW_H, height: ROW_H, width: totalW }} role="row">
                <div
                  className={`sticky left-0 z-10 flex items-center justify-center text-[11px] border-r border-b border-line cursor-pointer ${
                    r >= range.r1 && r <= range.r2 ? 'bg-brand/25 text-fg' : 'bg-surface-2 text-muted'
                  }`}
                  style={{ width: HEAD_W }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setSel(e.shiftKey ? { ...sel, r2: r, c2: sheet.cols - 1 } : { r, c: 0, r2: r, c2: sheet.cols - 1 });
                    gridRef.current?.focus();
                  }}
                  role="rowheader"
                >
                  {r + 1}
                </div>
                {Array.from({ length: sheet.cols }, (_, c) => {
                  const { text, v, cell } = display(r, c);
                  const inRange = r >= range.r1 && r <= range.r2 && c >= range.c1 && c <= range.c2;
                  const active = r === sel.r && c === sel.c;
                  const s = cell?.s;
                  const numeric = typeof v === 'number';
                  const align = s?.al === 'c' ? 'center' : s?.al === 'r' ? 'right' : s?.al === 'l' ? 'left' : numeric ? 'right' : 'left';
                  const isError = typeof text === 'string' && text.startsWith('#') && v !== null && typeof v === 'object';
                  return (
                    <div
                      key={c}
                      role="gridcell"
                      aria-selected={inRange}
                      onMouseDown={(e) => {
                        if (editing) finishEdit(true);
                        drag.current = true;
                        setSel(e.shiftKey ? { ...sel, r2: r, c2: c } : { r, c, r2: r, c2: c });
                        gridRef.current?.focus({ preventScroll: true });
                      }}
                      onMouseEnter={() => drag.current && setSel((p) => ({ ...p, r2: r, c2: c }))}
                      onMouseUp={() => (drag.current = false)}
                      onDoubleClick={() => startEdit()}
                      className={`relative border-r border-b border-line/70 px-1.5 text-[13px] leading-[29px] whitespace-nowrap overflow-hidden ${
                        inRange && !active ? 'bg-brand/10' : ''
                      } ${active ? 'outline outline-2 -outline-offset-2 outline-brand z-[1]' : ''} ${isError ? 'text-rose-400' : 'text-body'}`}
                      style={{
                        width: widthOf(c),
                        textAlign: align,
                        fontWeight: s?.b ? 600 : undefined,
                        fontStyle: s?.i ? 'italic' : undefined,
                        textDecoration: s?.u ? 'underline' : undefined,
                        color: s?.fg,
                        background: s?.bg ?? undefined,
                      }}
                    >
                      {active && editing?.inCell ? (
                        <input
                          ref={cellInput}
                          value={editing.text}
                          onChange={(e) => setEditing({ text: e.target.value, inCell: true })}
                          onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              finishEdit(true, e.shiftKey ? -1 : 1, 0);
                            } else if (e.key === 'Tab') {
                              e.preventDefault();
                              finishEdit(true, 0, e.shiftKey ? -1 : 1);
                            } else if (e.key === 'Escape') finishEdit(false);
                          }}
                          onBlur={() => editing && finishEdit(true)}
                          className="absolute inset-0 w-full h-full px-1.5 bg-surface text-fg text-[13px] font-mono outline-none border-2 border-brand"
                          aria-label={`${addr(r, c)} hücresi`}
                        />
                      ) : (
                        text
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Sheet tabs */}
      <div className="flex items-center gap-1 px-2 py-1 border-t border-line bg-surface overflow-x-auto no-scrollbar shrink-0">
        {doc.sheets.map((s, i) =>
          renaming === i ? (
            <input
              key={i}
              autoFocus
              defaultValue={s.name}
              onBlur={(e) => renameSheet(i, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') renameSheet(i, (e.target as HTMLInputElement).value);
                if (e.key === 'Escape') setRenaming(null);
              }}
              className="h-8 w-28 bg-app border border-brand rounded px-2 text-xs text-fg"
              aria-label="Sayfa adı"
            />
          ) : (
            <div key={i} className={`flex items-center rounded-md shrink-0 ${i === si ? 'bg-surface-3' : 'hover:bg-surface-2'}`}>
              <button
                onClick={() => {
                  // The open sheet is remembered with the note.
                  const next = { ...doc, active: i };
                  setDoc(next);
                  if (!readOnly) emit(next);
                  setSel({ r: 0, c: 0, r2: 0, c2: 0 });
                  setEditing(null);
                }}
                onDoubleClick={() => !readOnly && setRenaming(i)}
                className={`h-8 px-3 text-xs ${i === si ? 'text-fg font-medium' : 'text-subtle'}`}
                title={readOnly ? s.name : 'Yeniden adlandırmak için çift tıklayın'}
              >
                {s.name}
              </button>
              {i === si && !readOnly && doc.sheets.length > 1 && (
                <button onClick={() => removeSheet(i)} className="h-8 w-7 inline-flex items-center justify-center text-muted hover:text-rose-400" aria-label={`${s.name} sayfasını sil`}>
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )
        )}
        {!readOnly && (
          <button onClick={addSheet} className="h-8 w-8 rounded-md inline-flex items-center justify-center text-subtle hover:text-fg hover:bg-surface-2 shrink-0" aria-label="Sayfa ekle" title="Sayfa ekle">
            <Plus className="w-4 h-4" />
          </button>
        )}
        <span className="ml-auto text-[11px] text-muted shrink-0 pl-2 hidden sm:inline">{selectionSummary(range, (r, c) => evaluator.value(si, r, c))}</span>
      </div>
    </div>
  );
}

/** "Toplam · Ortalama · Sayı" of the selected numbers, like Excel's status bar. */
function selectionSummary(range: { r1: number; r2: number; c1: number; c2: number }, value: (r: number, c: number) => unknown): string {
  if (range.r1 === range.r2 && range.c1 === range.c2) return '';
  if ((range.r2 - range.r1 + 1) * (range.c2 - range.c1 + 1) > 20000) return '';
  const nums: number[] = [];
  for (let r = range.r1; r <= range.r2; r++) for (let c = range.c1; c <= range.c2; c++) {
    const v = value(r, c);
    if (typeof v === 'number') nums.push(v);
  }
  if (!nums.length) return '';
  const sum = nums.reduce((a, b) => a + b, 0);
  const f = (n: number) => n.toLocaleString('tr-TR', { maximumFractionDigits: 2 });
  return `Toplam: ${f(sum)} · Ortalama: ${f(sum / nums.length)} · Sayı: ${nums.length}`;
}

export { parseAddr };
