'use client';

import React, { useId, useState } from 'react';
import { Check, MapPin, Search } from 'lucide-react';
import { searchUniversities, universityByEmail, universityById, UNIVERSITY_TYPE_LABEL } from '@/lib/universities';

interface Props {
  /** Catalog id, or null for a school typed by hand */
  universityId: string | null;
  /** Shown / typed name */
  university: string;
  onChange: (value: { universityId: string | null; university: string }) => void;
  /** Student e-mail: its domain suggests the school (…@ogr.ktu.edu.tr → KTÜ) */
  email?: string;
  inputClassName: string;
  required?: boolean;
  id?: string;
}

/** Searchable list of the universities in Türkiye; a school that is not listed can be typed freely. */
export function UniversityPicker({ universityId, university, onChange, email, inputClassName, required, id }: Props) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const selected = universityById(universityId);
  const results = open ? searchUniversities(university, 8) : [];
  const suggestion = !selected ? universityByEmail(email) : null;

  const pick = (u: { id: string; name: string }) => {
    onChange({ universityId: u.id, university: u.name });
    setOpen(false);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          id={id}
          className={`${inputClassName} pl-9 ${selected ? 'pr-9' : ''}`}
          required={required}
          value={university}
          role="combobox"
          aria-expanded={open && results.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          placeholder="Üniversitenizi arayın (ad, şehir)"
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onChange={(e) => {
            onChange({ universityId: null, university: e.target.value });
            setActive(0);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (!results.length) return;
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, results.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === 'Enter' && open) {
              e.preventDefault();
              pick(results[active] ?? results[0]);
            } else if (e.key === 'Escape') {
              setOpen(false);
            }
          }}
        />
        {selected && <Check className="w-4 h-4 text-emerald-400 absolute right-3 top-1/2 -translate-y-1/2" aria-label="Listeden seçildi" />}
      </div>

      {open && results.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 left-0 right-0 mt-1 max-h-64 overflow-y-auto rounded-lg border border-line-strong bg-surface-2 shadow-xl shadow-black/40 py-1"
        >
          {results.map((u, i) => (
            <li key={u.id} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(u)}
                onMouseEnter={() => setActive(i)}
                className={`w-full text-left px-3 py-2 flex items-start gap-2 ${i === active ? 'bg-surface-3' : ''}`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-fg truncate">{u.name}</span>
                  <span className="flex items-center gap-1 text-[11px] text-muted">
                    <MapPin className="w-3 h-3" /> {u.city} · {UNIVERSITY_TYPE_LABEL[u.type]}
                    {u.domain ? ` · ${u.domain}` : ''}
                  </span>
                </span>
                {u.id === universityId && <Check className="w-4 h-4 text-emerald-400 mt-0.5" />}
              </button>
            </li>
          ))}
        </ul>
      )}

      {suggestion && suggestion.name !== university && (
        <button
          type="button"
          onClick={() => pick(suggestion)}
          className="mt-1.5 text-[11px] text-sky-300 hover:underline text-left"
        >
          E-postanıza göre: {suggestion.name} — seç
        </button>
      )}
      {!selected && university.trim().length >= 3 && !suggestion && (
        <p className="mt-1.5 text-[11px] text-muted">
          Listeden seçerseniz okulunuzun akademik takvimi (yayınlandığında) otomatik gelir. Okulunuz listede yoksa yazdığınız ad kaydedilir.
        </p>
      )}
    </div>
  );
}
