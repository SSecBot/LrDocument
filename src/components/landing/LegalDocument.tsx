import { t, tx } from '@/lib/i18n';
import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { SigmaLogo } from '@/components/ui/SigmaLogo';
import type { LandingContent } from '@/lib/landingContent';
import { PaymentLogos } from './PaymentLogos';

/** The legal pages, linked in the footer and below each document. */
export const LEGAL_LINKS = [
  { href: '/kvkk', label: 'KVKK Aydınlatma Metni' },
  { href: '/gizlilik', label: 'Gizlilik Politikası' },
  { href: '/mesafeli-satis', label: 'Mesafeli Satış Sözleşmesi' },
  { href: '/teslimat-ve-iade', label: 'Teslimat ve İade Şartları' },
  { href: '/kullanim-sartlari', label: 'Kullanım Şartları' },
];

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
    .replaceAll('{iletisim}', legal.contact || t('yöneticinin belirttiği iletişim'))
    .replaceAll('{saticiBilgileri}', legal.seller.trim() ? legal.seller.trim().replace(/\s*\n\s*/g, ', ') : legal.controller || 'LrDocument');
  return (
    <div className="min-h-dvh bg-app text-fg">
      <header className="border-b border-line/70">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 text-sm font-medium text-body hover:text-fg">
            <SigmaLogo size="xs" /> LrDocument
          </Link>
          <Link href="/" className="text-xs text-subtle hover:text-fg inline-flex items-center gap-1.5">
            <ArrowLeft className="w-3.5 h-3.5" />{' '}{t('Ana sayfa')}
          </Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{tx(title)}</h1>
        {legal.updated && <p className="text-xs text-muted mt-2">{t('Son güncelleme:')}{' '}{tx(legal.updated)}</p>}
        <div className="mt-8 space-y-4 text-[15px] leading-relaxed text-body">
          {parse(filled).map((b, i) =>
            b.kind === 'h' ? (
              <h2 key={i} className="pt-4 text-base font-semibold text-fg">
                {tx(b.text)}
              </h2>
            ) : b.kind === 'ul' ? (
              <ul key={i} className="list-disc pl-5 space-y-1.5">
                {b.items.map((item, j) => (
                  <li key={j}>{tx(item)}</li>
                ))}
              </ul>
            ) : (
              <p key={i}>{tx(b.text)}</p>
            )
          )}
        </div>
        <nav className="mt-12 pt-6 border-t border-line flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted" aria-label={t('Yasal metinler')}>
          {LEGAL_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-fg">
              {tx(l.label)}
            </Link>
          ))}
        </nav>
        <PaymentLogos className="mt-6" />
      </main>
    </div>
  );
}
