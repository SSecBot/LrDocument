import { addr, colIndex, colName, parseAddr, type Cell, type Sheet, type SheetDoc } from './engine';

// Structural edits of a sheet (insert / delete rows and columns, sort) that keep formulas pointing
// at the same cells, like Excel does.

type Axis = 'row' | 'col';

/** Moves the references of `raw` that point into `sheetName` (or into the current sheet when `own`). */
function adjustRefs(raw: string, sheetName: string, own: boolean, axis: Axis, at: number, delta: number): string {
  if (!raw.startsWith('=')) return raw;
  const re = /((?:'[^']+'|[A-Za-zÇĞİÖŞÜçğıöşü_][\wÇĞİÖŞÜçğıöşü.]*)!)?(\$?)([A-Z]{1,2})(\$?)(\d{1,5})(?![\w(])/g;
  return raw.replace(re, (m, prefix: string | undefined, ca: string, col: string, ra: string, row: string, offset: number, all: string) => {
    if (((all.slice(0, offset).match(/"/g)?.length ?? 0) % 2) === 1) return m;
    const target = prefix ? prefix.slice(0, -1).replace(/^'|'$/g, '') : null;
    const pointsHere = target ? target.toLocaleLowerCase('tr') === sheetName.toLocaleLowerCase('tr') : own;
    if (!pointsHere) return m;
    let c = colIndex(col);
    let r = Number(row) - 1;
    if (axis === 'row' && r >= at) {
      if (delta < 0 && r < at - delta) return `${prefix ?? ''}#REF!`;
      r += delta;
    }
    if (axis === 'col' && c >= at) {
      if (delta < 0 && c < at - delta) return `${prefix ?? ''}#REF!`;
      c += delta;
    }
    return `${prefix ?? ''}${ca}${colName(c)}${ra}${r + 1}`;
  });
}

/** Inserts (`count` > 0) or deletes (`count` < 0) rows / columns at `at` in sheet `si`. */
export function shiftAxis(doc: SheetDoc, si: number, axis: Axis, at: number, count: number): SheetDoc {
  const target = doc.sheets[si];
  const sheets = doc.sheets.map((sh, i) => {
    const cells: Record<string, Cell> = {};
    for (const [k, cell] of Object.entries(sh.cells)) {
      const v = adjustRefs(cell.v, target.name, i === si, axis, at, count);
      let key = k;
      if (i === si) {
        const p = parseAddr(k)!;
        const idx = axis === 'row' ? p.r : p.c;
        if (idx >= at) {
          if (count < 0 && idx < at - count) continue; // deleted
          key = axis === 'row' ? addr(p.r + count, p.c) : addr(p.r, p.c + count);
        }
      }
      cells[key] = v === cell.v ? cell : { ...cell, v };
    }
    if (i !== si) return { ...sh, cells };
    const widths: Record<number, number> = {};
    for (const [k, w] of Object.entries(sh.widths ?? {})) {
      const n = Number(k);
      if (axis === 'col' && n >= at) {
        if (count < 0 && n < at - count) continue;
        widths[n + count] = w;
      } else widths[n] = w;
    }
    const next: Sheet = { ...sh, cells, widths };
    if (axis === 'row') next.rows = Math.max(1, sh.rows + count);
    else next.cols = Math.max(1, sh.cols + count);
    return next;
  });
  return { ...doc, sheets };
}

/** Sorts rows r1…r2 by column `col` (numbers before text, blanks last). */
export function sortRows(sheet: Sheet, r1: number, r2: number, col: number, desc: boolean, valueOf: (r: number, c: number) => unknown): Sheet {
  const rows: { cells: Record<number, Cell>; key: unknown }[] = [];
  for (let r = r1; r <= r2; r++) {
    const cells: Record<number, Cell> = {};
    for (let c = 0; c < sheet.cols; c++) {
      const cell = sheet.cells[addr(r, c)];
      if (cell) cells[c] = cell;
    }
    rows.push({ cells, key: valueOf(r, col) });
  }
  const rank = (v: unknown) => (v === null || v === '' ? 2 : typeof v === 'number' ? 0 : 1);
  rows.sort((a, b) => {
    const ra = rank(a.key);
    const rb = rank(b.key);
    if (ra !== rb) return ra - rb; // blanks stay last either way
    let d = 0;
    if (ra === 0) d = (a.key as number) - (b.key as number);
    else if (ra === 1) d = String(a.key).localeCompare(String(b.key), 'tr', { numeric: true, sensitivity: 'base' });
    return desc ? -d : d;
  });
  const cells = { ...sheet.cells };
  for (let r = r1; r <= r2; r++) for (let c = 0; c < sheet.cols; c++) delete cells[addr(r, c)];
  rows.forEach((row, i) => {
    for (const [c, cell] of Object.entries(row.cells)) cells[addr(r1 + i, Number(c))] = cell;
  });
  return { ...sheet, cells };
}

/** Last row / column that holds something (−1 when empty). */
export function usedBounds(sheet: Sheet): { rows: number; cols: number } {
  let rows = -1;
  let cols = -1;
  for (const k of Object.keys(sheet.cells)) {
    if (!sheet.cells[k].v && !sheet.cells[k].s) continue;
    const p = parseAddr(k)!;
    rows = Math.max(rows, p.r);
    cols = Math.max(cols, p.c);
  }
  return { rows, cols };
}
