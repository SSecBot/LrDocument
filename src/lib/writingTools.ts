// ---------------------------------------------------------------------------
// Yazım araçları: shortcuts for writing a novel (roman) or a thesis / paper (tez) in a text note.
// Each tool turns the note text and the selection into a new text and selection; numbering (bölüm,
// dipnot, şekil, tablo, denklem) continues from what is already in the note.
// ---------------------------------------------------------------------------

export interface Edit {
  text: string;
  /** New selection (caret when start === end). */
  start: number;
  end: number;
}

export interface WritingTool {
  id: string;
  name: string;
  group: 'Roman' | 'Tez / Akademik';
  hint: string;
  /** Ctrl / ⌘ + Shift + key (shown in the help). */
  key?: string;
  apply: (text: string, start: number, end: number) => Edit;
}

/** Replaces the selection with `insert`; the caret lands at `caret` inside it (default: its end). */
function put(text: string, start: number, end: number, insert: string, caret = insert.length, caretEnd = caret): Edit {
  return { text: text.slice(0, start) + insert + text.slice(end), start: start + caret, end: start + caretEnd };
}

/**
 * Puts a block on its own lines (blank line before and after). The caret goes to `caretInBody`, or
 * with 'after' to the start of the next paragraph (separators).
 */
function block(text: string, start: number, end: number, body: string, caretInBody: number | 'after' = body.length): Edit {
  const before = text.slice(0, start);
  const lead = before === '' ? '' : before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n';
  const after = text.slice(end);
  const tail = after.startsWith('\n\n') ? '' : after.startsWith('\n') ? '\n' : '\n\n';
  const insert = lead + body + tail;
  if (caretInBody === 'after') {
    // Past the blank line that follows (part of it may already be in the text).
    const existing = Math.min(2 - (tail.length), after.match(/^\n*/)![0].length);
    return put(text, start, end, insert, insert.length + existing);
  }
  return put(text, start, end, insert, lead.length + caretInBody);
}

/** Wraps the selection (or a placeholder, which is then selected). */
function wrap(text: string, start: number, end: number, open: string, close: string, placeholder: string): Edit {
  const inner = text.slice(start, end) || placeholder;
  return put(text, start, end, open + inner + close, open.length, open.length + inner.length);
}

const count = (text: string, re: RegExp) => (text.match(re) ?? []).length;

function nextNumber(text: string, re: RegExp): number {
  let max = 0;
  for (const m of text.matchAll(re)) max = Math.max(max, Number(m[1]) || 0);
  return max + 1;
}

/** Start of the line the caret is on. */
const lineStart = (text: string, at: number) => text.lastIndexOf('\n', at - 1) + 1;

export const ROMAN_TEMPLATE = `# Roman Adı

> **Tür:**
> **Hedef uzunluk:** 80.000 kelime
> **Tek cümlelik özet:**

## Karakterler

- **Ana karakter:** ad — ne istiyor, neden korkuyor, nasıl değişecek
- **Karşıt güç:**
- **Yardımcı karakterler:**

## Olay Örgüsü

1. Başlangıç —
2. Kırılma noktası —
3. Yükselen gerilim —
4. Doruk —
5. Çözüm —

## Bölüm 1:

`;

export const TEZ_TEMPLATE = `# Tez Başlığı

**Yazar:**
**Danışman:**
**Bölüm / Program:**
**Tarih:**

## Özet

(150–300 kelime: amaç, yöntem, bulgular ve sonuç)

**Anahtar kelimeler:**

## Abstract

**Keywords:**

## 1. Giriş

### 1.1 Problem Durumu

### 1.2 Araştırmanın Amacı

### 1.3 Araştırmanın Önemi

### 1.4 Sınırlılıklar

## 2. Kuramsal Çerçeve ve Literatür

## 3. Yöntem

### 3.1 Araştırma Modeli

### 3.2 Evren ve Örneklem

### 3.3 Veri Toplama Araçları

### 3.4 Verilerin Analizi

## 4. Bulgular

## 5. Tartışma

## 6. Sonuç ve Öneriler

## Kaynakça

## Ekler
`;

/** "İçindekiler": a list of the note's headings (## and ###), indented by level. */
export function tableOfContents(text: string): string {
  const items: string[] = [];
  for (const line of text.split('\n')) {
    const m = /^(#{1,3}) (.+)$/.exec(line.trim());
    if (!m || /^i̇?çindekiler$/i.test(m[2].trim())) continue;
    const level = m[1].length;
    if (level === 1) continue; // the title of the work
    items.push(`${level === 3 ? '  ' : ''}- ${m[2].trim()}`);
  }
  return items.length ? `## İçindekiler\n\n${items.join('\n')}` : '## İçindekiler\n\n- (Henüz başlık yok: ## ile bölüm başlıkları ekleyin.)';
}

export const WRITING_TOOLS: WritingTool[] = [
  // ---------------- Roman ----------------
  {
    id: 'chapter',
    name: 'Yeni bölüm',
    group: 'Roman',
    hint: 'Sıradaki bölüm numarasıyla başlık ekler',
    key: 'B',
    apply: (t, s, e) => {
      const n = nextNumber(t, /^#{1,2} Bölüm (\d+)/gim);
      const head = `## Bölüm ${n}: `;
      return block(t, s, e, head, head.length);
    },
  },
  {
    id: 'scene',
    name: 'Sahne ayracı',
    group: 'Roman',
    hint: 'Sahneyi ayıran * * * satırı',
    key: 'H',
    apply: (t, s, e) => block(t, s, e, '* * *', 'after'),
  },
  {
    id: 'dialogue',
    name: 'Diyalog çizgisi',
    group: 'Roman',
    hint: 'Satır başına konuşma çizgisi (—) koyar',
    key: 'D',
    apply: (t, s, e) => {
      const ls = lineStart(t, s);
      if (t.startsWith('— ', ls)) return { text: t, start: s, end: e };
      // An empty line: the dash goes at the caret; otherwise at the start of the line.
      return ls === s ? put(t, s, e, '— ') : { text: t.slice(0, ls) + '— ' + t.slice(ls), start: s + 2, end: e + 2 };
    },
  },
  {
    id: 'thought',
    name: 'İç ses / düşünce',
    group: 'Roman',
    hint: 'Seçili metni italik yapar',
    apply: (t, s, e) => wrap(t, s, e, '*', '*', 'düşünce'),
  },
  {
    id: 'quote-marks',
    name: '“Tırnak”',
    group: 'Roman',
    hint: 'Seçili metni çift tırnağa alır',
    apply: (t, s, e) => wrap(t, s, e, '“', '”', 'söz'),
  },
  { id: 'ellipsis', name: 'Üç nokta (…)', group: 'Roman', hint: 'Tek karakterlik üç nokta', apply: (t, s, e) => put(t, s, e, '…') },
  {
    id: 'character',
    name: 'Karakter kartı',
    group: 'Roman',
    hint: 'Karakter bilgileri için alıntı bloğu',
    apply: (t, s, e) => {
      const body = '> **Karakter:** \n> **Görünüş:** \n> **İstediği:** \n> **Sırrı:** ';
      return block(t, s, e, body, '> **Karakter:** '.length);
    },
  },
  {
    id: 'author-note',
    name: 'Yazar notu',
    group: 'Roman',
    hint: 'Kendinize hatırlatma (önizlemede kutu olarak görünür)',
    apply: (t, s, e) => block(t, s, e, '> **Yazar notu:** ', '> **Yazar notu:** '.length),
  },
  {
    id: 'roman-template',
    name: 'Roman iskeleti',
    group: 'Roman',
    hint: 'Karakterler, olay örgüsü ve ilk bölüm',
    apply: (t, s, e) => block(t, s, e, ROMAN_TEMPLATE.trimEnd()),
  },

  // ---------------- Tez / Akademik ----------------
  {
    id: 'section',
    name: 'Numaralı bölüm',
    group: 'Tez / Akademik',
    hint: '## 1. Giriş gibi; numara kendiliğinden artar',
    apply: (t, s, e) => {
      const head = `## ${nextNumber(t, /^## (\d+)\./gm)}. `;
      return block(t, s, e, head, head.length);
    },
  },
  {
    id: 'subsection',
    name: 'Numaralı alt başlık',
    group: 'Tez / Akademik',
    hint: 'İmlecin üstündeki bölüme göre 2.1, 2.2…',
    apply: (t, s, e) => {
      const before = t.slice(0, s);
      const chapters = [...before.matchAll(/^## (\d+)\./gm)];
      const chapter = chapters.length ? chapters[chapters.length - 1][1] : '1';
      const sub = nextNumber(t, new RegExp(`^### ${chapter}\\.(\\d+)`, 'gm'));
      const head = `### ${chapter}.${sub} `;
      return block(t, s, e, head, head.length);
    },
  },
  {
    id: 'footnote',
    name: 'Dipnot',
    group: 'Tez / Akademik',
    hint: 'İmlece [^1] koyar, açıklamasını notun sonuna ekler',
    key: 'F',
    apply: (t, s, e) => {
      const n = nextNumber(t, /\[\^(\d+)\]/g);
      const ref = `[^${n}]`;
      const withRef = t.slice(0, e) + ref + t.slice(e);
      const sep = withRef.endsWith('\n\n') ? '' : withRef.endsWith('\n') ? '\n' : '\n\n';
      const def = `[^${n}]: `;
      const text = withRef + sep + def;
      return { text, start: text.length, end: text.length };
    },
  },
  {
    id: 'citation',
    name: 'Atıf (Yazar, Yıl)',
    group: 'Tez / Akademik',
    hint: 'APA metin içi atıf',
    apply: (t, s, e) => put(t, s, e, '(Soyad, Yıl, s. 00)', 1, 6),
  },
  {
    id: 'blockquote',
    name: 'Doğrudan alıntı',
    group: 'Tez / Akademik',
    hint: 'Seçili metni kaynaklı alıntı bloğu yapar',
    key: 'Q',
    apply: (t, s, e) => {
      const inner = t.slice(s, e) || 'Alıntı metni';
      const body = `> “${inner}” (Soyad, Yıl, s. 00)`;
      return block(t, s, e, body, 3 + inner.length);
    },
  },
  {
    id: 'ref-book',
    name: 'Kaynak: kitap',
    group: 'Tez / Akademik',
    hint: 'APA 7 kitap künyesi',
    apply: (t, s, e) => block(t, s, e, '- Soyad, A. A. (Yıl). *Kitabın adı* (2. bs.). Yayınevi.', 2),
  },
  {
    id: 'ref-article',
    name: 'Kaynak: makale',
    group: 'Tez / Akademik',
    hint: 'APA 7 dergi makalesi künyesi',
    apply: (t, s, e) => block(t, s, e, '- Soyad, A. A. (Yıl). Makalenin başlığı. *Derginin Adı, Cilt*(Sayı), 1–20. https://doi.org/', 2),
  },
  {
    id: 'figure',
    name: 'Şekil başlığı',
    group: 'Tez / Akademik',
    hint: 'Şekil 1, Şekil 2… numaralı',
    apply: (t, s, e) => {
      const head = `**Şekil ${count(t, /\*\*Şekil \d+\.\*\*/g) + 1}.** `;
      return block(t, s, e, head + 'Açıklama', head.length);
    },
  },
  {
    id: 'table',
    name: 'Tablo (numaralı)',
    group: 'Tez / Akademik',
    hint: 'Başlıklı, numaralı boş tablo',
    apply: (t, s, e) => {
      const head = `**Tablo ${count(t, /\*\*Tablo \d+\.\*\*/g) + 1}.** `;
      return block(t, s, e, `${head}Açıklama\n\n| Değişken | n | % |\n| --- | --- | --- |\n|  |  |  |`, head.length);
    },
  },
  {
    id: 'equation',
    name: 'Numaralı denklem',
    group: 'Tez / Akademik',
    hint: 'Sağda (1), (2)… numarası olan formül',
    apply: (t, s, e) => {
      const n = nextNumber(t, /\\tag\{(\d+)\}/g);
      return block(t, s, e, `$$ y = ax + b \\tag{${n}} $$`, 3);
    },
  },
  {
    id: 'toc',
    name: 'İçindekiler',
    group: 'Tez / Akademik',
    hint: 'Nottaki başlıklardan içindekiler listesi oluşturur',
    apply: (t, s, e) => block(t, s, e, tableOfContents(t)),
  },
  {
    id: 'tez-template',
    name: 'Tez iskeleti',
    group: 'Tez / Akademik',
    hint: 'Özet, Giriş, Yöntem, Bulgular, Kaynakça…',
    apply: (t, s, e) => block(t, s, e, TEZ_TEMPLATE.trimEnd()),
  },
];

/** Ctrl / ⌘ + Shift + key → tool (keys are single letters). */
export const WRITING_KEYS: Record<string, WritingTool> = Object.fromEntries(
  WRITING_TOOLS.filter((t) => t.key).map((t) => [t.key!.toLowerCase(), t])
);

/** Kelime, sayfa (≈250 kelime) and reading time (≈200 kelime / dakika). */
export function writingStats(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return { words, pages: Math.max(words ? 1 : 0, Math.round(words / 250)), minutes: Math.max(words ? 1 : 0, Math.round(words / 200)) };
}
