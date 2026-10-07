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
      `<pre class="bg-surface p-4 rounded-lg border border-line text-emerald-300 text-sm overflow-x-auto my-3 font-mono"><code>${escapeHtml(code)}</code></pre>`
    )
  );

  // 2. Inline code: `code`
  text = text.replace(/`([^`\n]+)`/g, (_, code: string) =>
    inline(
      `<code class="bg-surface-2 px-1.5 py-0.5 rounded text-emerald-400 text-xs font-mono border border-line-strong break-words">${escapeHtml(code)}</code>`
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

  text = text.replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold text-white mt-5 mb-2">$1</h3>');
  text = text.replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold text-white mt-6 mb-3 border-b border-line pb-1.5">$1</h2>');
  text = text.replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-3 mb-4 text-fg">$1</h1>');
  text = text.replace(
    /^&gt; (.*$)/gim,
    '<blockquote class="border-l-4 border-brand bg-surface-2/50 pl-4 py-2 my-3 rounded-r-lg text-emerald-100 text-sm">$1</blockquote>'
  );
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-white">$1</strong>');
  text = text.replace(/\*(.+?)\*/g, '<em class="italic text-body">$1</em>');
  text = text.replace(/^\s*-\s+(.*$)/gim, '<li class="ml-5 list-disc text-body my-1">$1</li>');
  text = text.replace(/^---$/gim, '<hr class="border-t border-line my-6" />');

  // 6. Paragraphs and list grouping
  const lines = text.split('\n');
  const out: string[] = [];
  let inList = false;

  for (const line of lines) {
    if (line.startsWith('<li')) {
      if (!inList) {
        out.push('<ul class="my-2 space-y-1">');
        inList = true;
      }
      out.push(line);
      continue;
    }
    if (inList) {
      out.push('</ul>');
      inList = false;
    }
    const isBlock =
      /^<(h1|h2|h3|blockquote|hr)/.test(line) || /^\u0001\d+\u0001$/.test(line.trim()) || line.trim() === '';
    out.push(isBlock ? line : `<p class="text-body my-2 leading-relaxed break-words">${line}</p>`);
  }
  if (inList) out.push('</ul>');

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
