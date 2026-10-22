'use client';

import React, { useMemo } from 'react';
import katex from 'katex';

interface KatexPreviewProps {
  content: string;
  className?: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderMath(math: string, displayMode: boolean): string {
  // trust:false (the default) keeps \href, \htmlId etc. disabled, so KaTeX output is safe to inject.
  return katex.renderToString(math.trim(), {
    displayMode,
    throwOnError: false,
    strict: false,
    trust: false,
  });
}

/**
 * Renders a small Markdown subset plus LaTeX. All user text is HTML-escaped first; only HTML
 * generated here (or by KaTeX) reaches dangerouslySetInnerHTML.
 */
export function renderNoteHtml(content: string): string {
  if (!content) return '';

  // Rendered fragments are swapped out for placeholders so Markdown rules cannot touch them.
  // Block fragments use \u0001 markers (they must not be wrapped in <p>), inline ones use \u0000.
  const fragments: string[] = [];
  const block = (html: string) => `\u0001${fragments.push(html) - 1}\u0001`;
  const inline = (html: string) => `\u0000${fragments.push(html) - 1}\u0000`;

  let text = content.replace(/[\u0000\u0001]/g, '');

  // 1. Fenced code blocks: ```lang ... ```
  text = text.replace(/```[a-zA-Z0-9_-]*\n([\s\S]*?)```/g, (_, code: string) =>
    block(
      `<pre class="bg-surface p-4 rounded-lg border border-line text-body text-sm overflow-x-auto my-3 font-mono"><code>${escapeHtml(code)}</code></pre>`
    )
  );

  // 2. Inline code: `code`
  text = text.replace(/`([^`\n]+)`/g, (_, code: string) =>
    inline(
      `<code class="bg-surface-2 px-1.5 py-0.5 rounded text-body text-xs font-mono border border-line-strong break-words">${escapeHtml(code)}</code>`
    )
  );

  // 3. Block math: $$ ... $$
  text = text.replace(/\$\$([\s\S]*?)\$\$/g, (_, math: string) => {
    try {
      return block(`<div class="katex-display-wrapper my-4 overflow-x-auto">${renderMath(math, true)}</div>`);
    } catch (err) {
      return block(
        `<div class="p-3 bg-red-950/40 border border-red-800/50 rounded-lg text-rose-300 text-sm">LaTeX Hatası: ${escapeHtml((err as Error).message)}</div>`
      );
    }
  });

  // 4. Inline math: $ ... $
  text = text.replace(/\$([^$\n]+?)\$/g, (_, math: string) => {
    try {
      return inline(`<span class="katex-inline">${renderMath(math, false)}</span>`);
    } catch {
      return inline(`<code class="text-rose-400">$${escapeHtml(math)}$</code>`);
    }
  });

  // 5. Everything left is plain user text — escape it before applying Markdown.
  text = escapeHtml(text);
  // Sahne ayracı (* * *) before italics and lists, which would read it as emphasis / a bullet.
  text = text.replace(/^\s*\*\s*\*\s*\*\s*$/gm, () => block('<div class="text-center text-muted tracking-[0.6em] my-6" role="separator">* * *</div>'));

  text = text.replace(/^#{4,6} (.*$)/gim, '<h4 class="text-base font-semibold text-fg mt-4 mb-1.5">$1</h4>');
  text = text.replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold text-fg mt-5 mb-2">$1</h3>');
  text = text.replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold text-fg mt-6 mb-3 border-b border-line pb-1.5">$1</h2>');
  text = text.replace(/^# (.*$)/gim, '<h1 class="text-2xl font-semibold mt-3 mb-4 text-fg">$1</h1>');
  text = text.replace(
    /^&gt; (.*$)/gim,
    '<blockquote class="border-l-2 border-line-strong pl-4 py-1 my-3 text-subtle text-sm">$1</blockquote>'
  );
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-fg">$1</strong>');
  text = text.replace(/\*(.+?)\*/g, '<em class="italic text-body">$1</em>');
  // Links: only http(s) targets (the text is already HTML-escaped, so no quotes can break out).
  text = text.replace(
    /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer nofollow" class="text-brand-light underline underline-offset-2">$1</a>'
  );
  text = text.replace(/^\s*[-*]\s+(.*$)/gim, '<li data-list="ul" class="ml-5 list-disc text-body my-1">$1</li>');
  text = text.replace(/^\s*\d+[.)]\s+(.*$)/gim, '<li data-list="ol" class="ml-5 list-decimal text-body my-1">$1</li>');
  text = text.replace(/^---$/gim, '<hr class="border-t border-line my-6" />');

  // Dipnotlar: [^1] in the text, "[^1]: açıklama" lines collected at the end (numbered in order of use).
  const notes = new Map<string, string>();
  text = text.replace(/^\[\^([\w-]{1,20})\]:[ \t]*(.*)$/gm, (_, id: string, body: string) => {
    notes.set(id, body);
    return '';
  });
  const order: string[] = [];
  text = text.replace(/\[\^([\w-]{1,20})\]/g, (_, id: string) => {
    if (!order.includes(id)) order.push(id);
    return `<sup class="text-[0.7em] text-brand-light font-medium">${order.indexOf(id) + 1}</sup>`;
  });

  // 6. Paragraphs, list grouping and pipe tables
  const lines = text.split('\n');
  const out: string[] = [];
  let list: 'ul' | 'ol' | null = null;
  const closeList = () => {
    if (list) out.push(`</${list}>`);
    list = null;
  };
  const cells = (row: string) =>
    row
      .trim()
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split(/(?<!\\)\|/)
      .map((c) => c.trim().replace(/\\\|/g, '|'));

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const kind = line.startsWith('<li data-list="ol"') ? 'ol' : line.startsWith('<li data-list="ul"') ? 'ul' : null;
    if (kind) {
      if (list !== kind) {
        closeList();
        out.push(kind === 'ol' ? '<ol class="my-2 space-y-1">' : '<ul class="my-2 space-y-1">');
        list = kind;
      }
      out.push(line);
      continue;
    }
    closeList();

    // | a | b |  followed by  | --- | --- |
    if (line.trim().startsWith('|') && /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/.test(lines[i + 1] ?? '')) {
      const head = cells(line);
      const body: string[][] = [];
      i += 2;
      while (i < lines.length && lines[i].trim().startsWith('|')) body.push(cells(lines[i++]));
      i--;
      out.push(
        '<div class="overflow-x-auto my-3"><table class="w-full text-sm border-collapse">' +
          `<thead><tr>${head.map((c) => `<th class="border border-line px-3 py-1.5 text-left font-medium text-fg bg-surface-2">${c}</th>`).join('')}</tr></thead>` +
          `<tbody>${body
            .map((r) => `<tr>${head.map((_, j) => `<td class="border border-line px-3 py-1.5 text-body">${r[j] ?? ''}</td>`).join('')}</tr>`)
            .join('')}</tbody></table></div>`
      );
      continue;
    }

    const isBlock =
      /^<(h1|h2|h3|h4|blockquote|hr|div)/.test(line) || /^\u0001\d+\u0001$/.test(line.trim()) || line.trim() === '';
    out.push(isBlock ? line : `<p class="text-body my-2 leading-relaxed break-words">${line}</p>`);
  }
  closeList();
  const used = order.filter((id) => notes.has(id));
  if (used.length) {
    out.push(
      '<div class="mt-8 pt-3 border-t border-line text-xs text-subtle"><ol class="space-y-1 list-decimal ml-5">' +
        used.map((id) => `<li>${notes.get(id)}</li>`).join('') +
        '</ol></div>'
    );
  }

  // 7. Restore rendered fragments.
  return out
    .join('\n')
    .replace(/[\u0000\u0001](\d+)[\u0000\u0001]/g, (_, index: string) => fragments[Number(index)] ?? '');
}

export const KatexPreview: React.FC<KatexPreviewProps> = ({ content, className = '' }) => {
  const htmlContent = useMemo(() => renderNoteHtml(content), [content]);

  return (
    <div
      className={`prose prose-invert max-w-none min-w-0 text-body selection:bg-brand selection:text-white ${className}`}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
};
