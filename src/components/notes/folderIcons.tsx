'use client';

import { t, tx } from '@/lib/i18n';
import React from 'react';
import {
  Archive,
  Binary,
  BookOpen,
  Briefcase,
  Calculator,
  Camera,
  Code,
  FlaskConical,
  Folder,
  Globe,
  GraduationCap,
  Heart,
  Home,
  Lightbulb,
  Music,
  Palette,
  Plane,
  Sigma,
  Star,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

/** Icons a folder can have (stored by name in Folder.iconName). */
export const FOLDER_ICONS: Record<string, { icon: LucideIcon; label: string }> = {
  Folder: { icon: Folder, label: 'Klasör' },
  BookOpen: { icon: BookOpen, label: 'Kitap' },
  GraduationCap: { icon: GraduationCap, label: 'Okul' },
  Sigma: { icon: Sigma, label: 'Matematik' },
  Calculator: { icon: Calculator, label: 'Hesap' },
  FlaskConical: { icon: FlaskConical, label: 'Bilim' },
  Binary: { icon: Binary, label: 'Bilgisayar' },
  Code: { icon: Code, label: 'Kod' },
  Briefcase: { icon: Briefcase, label: 'İş' },
  Wallet: { icon: Wallet, label: 'Para' },
  Lightbulb: { icon: Lightbulb, label: 'Fikir' },
  Star: { icon: Star, label: 'Önemli' },
  Heart: { icon: Heart, label: 'Kişisel' },
  Home: { icon: Home, label: 'Ev' },
  Plane: { icon: Plane, label: 'Seyahat' },
  Globe: { icon: Globe, label: 'Dünya' },
  Music: { icon: Music, label: 'Müzik' },
  Camera: { icon: Camera, label: 'Fotoğraf' },
  Palette: { icon: Palette, label: 'Tasarım' },
  Archive: { icon: Archive, label: 'Arşiv' },
};

export function FolderIcon({ name, className }: { name?: string; className?: string }) {
  const Icon = (name && FOLDER_ICONS[name]?.icon) || Folder;
  return <Icon className={className} />;
}

/** Grid of icons to choose from (folder create / edit dialogs). */
export function FolderIconPicker({ value, onChange }: { value: string; onChange: (name: string) => void }) {
  return (
    <div role="radiogroup" aria-label={t('Klasör simgesi')} className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
      {Object.entries(FOLDER_ICONS).map(([name, { icon: Icon, label }]) => (
        <button
          key={name}
          type="button"
          role="radio"
          aria-checked={value === name}
          aria-label={tx(label)}
          title={tx(label)}
          onClick={() => onChange(name)}
          className={`h-10 rounded-lg border flex items-center justify-center transition-colors ${
            value === name ? 'border-brand bg-brand/15 text-emerald-300' : 'border-line text-subtle hover:text-fg hover:bg-surface-2'
          }`}
        >
          <Icon className="w-4 h-4" />
        </button>
      ))}
    </div>
  );
}
