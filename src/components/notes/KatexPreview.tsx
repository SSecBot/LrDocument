'use client';

import React, { useMemo } from 'react';
import katex from 'katex';

interface KatexPreviewProps {
  content: string;
  className?: string;
}

export const KatexPreview: React.FC<KatexPreviewProps> = ({ content, className = '' }) => {
  // Parse markdown + LaTeX blocks safely
  const htmlContent = useMemo(() => {
    if (!content) return '';

    let text = content;

    // 1. Process Block Math: $$ ... $$
    text = text.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => {
      try {
        const rendered = katex.renderToString(math.trim(), {
          displayMode: true,
          throwOnError: false,
          strict: false,
        });
        return `<div class="katex-display-wrapper my-4">${rendered}</div>`;
      } catch (err) {
        return `<div class="p-3 bg-red-950/40 border border-red-800/50 rounded-lg text-rose-300 text-sm">LaTeX Hatası: ${(err as Error).message}</div>`;
      }
    });

    // 2. Process Inline Math: $ ... $
    text = text.replace(/\$([^\$\n]+?)\$/g, (_, math) => {
      try {
        const rendered = katex.renderToString(math.trim(), {
          displayMode: false,
          throwOnError: false,
          strict: false,
        });
        return `<span class="katex-inline">${rendered}</span>`;
      } catch {
        return `<code class="text-rose-400">$${math}$</code>`;
      }
    });

    // 3. Process Code Blocks: ```lang ... ```
    text = text.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (_, lang, code) => {
      return `<pre class="bg-[#161616] p-4 rounded-xl border border-[#2e2e2e] text-emerald-300 text-sm overflow-x-auto my-3 font-mono"><code>${code
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')}</code></pre>`;
    });

    // 4. Process Inline Code: `code`
    text = text.replace(/`([^`\n]+)`/g, '<code class="bg-[#242424] px-1.5 py-0.5 rounded text-emerald-400 text-xs font-mono border border-[#333]">$1</code>');

    // 5. Process Markdown Headings
    text = text.replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold text-white mt-5 mb-2">$1</h3>');
    text = text.replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold text-white mt-6 mb-3 border-b border-[#2e2e2e] pb-1.5">$1</h2>');
    text = text.replace(/^# (.*$)/gim, '<h1 class="text-2xl font-extrabold text-white mt-3 mb-4 text-[#f5f5f0]">$1</h1>');

    // 6. Process Blockquotes
    text = text.replace(/^> (.*$)/gim, '<blockquote class="border-l-4 border-[#2d5a27] bg-[#1a2419]/50 pl-4 py-2 my-3 rounded-r-lg text-emerald-100 text-sm">$1</blockquote>');

    // 7. Process Bold & Italic
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-white">$1</strong>');
    text = text.replace(/\*(.*?)\*/g, '<em class="italic text-[#d4d4d8]">$1</em>');

    // 8. Process Unordered Lists
    text = text.replace(/^\s*-\s+(.*$)/gim, '<li class="ml-5 list-disc text-[#d1d5db] my-1">$1</li>');

    // 9. Process Horizontal Rules
    text = text.replace(/^---$/gim, '<hr class="border-t border-[#2e2e2e] my-6" />');

    // 10. Process Paragraph breaks (newlines)
    const lines = text.split('\n');
    const formattedLines: string[] = [];
    let inList = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('<li')) {
        if (!inList) {
          formattedLines.push('<ul class="my-2 space-y-1">');
          inList = true;
        }
        formattedLines.push(line);
      } else {
        if (inList) {
          formattedLines.push('</ul>');
          inList = false;
        }
        if (
          line.startsWith('<h1') ||
          line.startsWith('<h2') ||
          line.startsWith('<h3') ||
          line.startsWith('<blockquote') ||
          line.startsWith('<pre') ||
          line.startsWith('<div class="katex-display') ||
          line.startsWith('<hr') ||
          line.trim() === ''
        ) {
          formattedLines.push(line);
        } else {
          formattedLines.push(`<p class="text-[#d1d5db] my-2 leading-relaxed">${line}</p>`);
        }
      }
    }
    if (inList) formattedLines.push('</ul>');

    return formattedLines.join('\n');
  }, [content]);

  return (
    <div
      className={`prose prose-invert max-w-none text-[#d1d5db] selection:bg-[#2d5a27] selection:text-white ${className}`}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
};
