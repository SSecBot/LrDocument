import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { SigmaLogo } from '@/components/ui/SigmaLogo';
import type { LandingContent } from '@/lib/landingContent';

type Block = { kind: 'h'; text: string } | { kind: 'p'; text: string } | { kind: 'ul'; items: string[] };

/** Plain-text legal document: "## " headings, "- " list items, blank lines between paragraphs. */
function parse(source: string): Block[] {
  const blocks: Block[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) blocks.push({ kind: 'p', text: para.join(' ') });
    para = [];
  };
  for (const raw of source.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) {
      flush();
    } else if (line.startsWith('## ')) {
      flush();
      blocks.push({ kind: 'h', text: line.slice(3) });
    } else if (line.startsWith('- ')) {
      flush();
      const last = blocks[blocks.length - 1];
      if (last?.kind === 'ul') last.items.push(line.slice(2));
      else blocks.push({ kind: 'ul', items: [line.slice(2)] });
    } else {
      para.push(line);
    }
  }
  flush();
  return blocks;
}

/** Renders a legal text (escaped by React; admins cannot inject markup). */
export function LegalDocument({ title, body, legal }: { title: string; body: string; legal: LandingContent['legal'] }) {
  const filled = body
    .replaceAll('{veriSorumlusu}', legal.controller || 'LrDocument')
    .replaceAll('{iletisim}', legal.contact || 'yöneticinin belirttiği iletişim')
    .replaceAll('{saticiBilgileri}', legal.seller.trim() ? legal.seller.trim().replace(/\s*\n\s*/g, ', ') : legal.controller || 'LrDocument');
  return (
    <div className="min-h-dvh bg-app text-fg">
      <header className="border-b border-line/70">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 text-sm font-medium text-body hover:text-fg">
            <SigmaLogo size="xs" /> LrDocument
          </Link>
          <Link href="/" className="text-xs text-subtle hover:text-fg inline-flex items-center gap-1.5">
            <ArrowLeft className="w-3.5 h-3.5" /> Ana sayfa
          </Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{title}</h1>
        {legal.updated && <p className="text-xs text-muted mt-2">Son güncelleme: {legal.updated}</p>}
        <div className="mt-8 space-y-4 text-[15px] leading-relaxed text-body">
          {parse(filled).map((b, i) =>
            b.kind === 'h' ? (
              <h2 key={i} className="pt-4 text-base font-semibold text-fg">
                {b.text}
              </h2>
            ) : b.kind === 'ul' ? (
              <ul key={i} className="list-disc pl-5 space-y-1.5">
                {b.items.map((item, j) => (
                  <li key={j}>{item}</li>
                ))}
              </ul>
            ) : (
              <p key={i}>{b.text}</p>
            )
          )}
        </div>
        <nav className="mt-12 pt-6 border-t border-line flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted" aria-label="Yasal metinler">
          <Link href="/kvkk" className="hover:text-fg">
            KVKK Aydınlatma Metni
          </Link>
          <Link href="/gizlilik" className="hover:text-fg">
            Gizlilik Politikası
          </Link>
          <Link href="/mesafeli-satis" className="hover:text-fg">
            Mesafeli Satış ve İade
          </Link>
          <Link href="/kullanim-sartlari" className="hover:text-fg">
            Kullanım Şartları
          </Link>
        </nav>
      </main>
    </div>
  );
}
