import { useEffect, useId, useRef, useState } from 'react';
import { api } from '../../api/client';
import type { AddressSuggestion } from '../../api/types';
import { useStore } from '../../state/store';
import { MapPin, Spinner } from '../../components/icons';
import { FieldShell, cx, inputClass } from '../../components/ui';

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSelect: (s: AddressSuggestion) => void;
  onBlur: () => void;
  error?: string;
}

/** Accessible combobox: type 3+ characters, pick with mouse, touch or arrow keys. */
export function AddressAutocomplete({ value, onChange, onSelect, onBlur, error }: Props) {
  const id = useId();
  const listId = `${id}-list`;
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AddressSuggestion[]>([]);
  const [active, setActive] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const typed = useRef(false);

  const { catalog } = useStore();

  // Debounced lookup through the API (the backend proxies the address provider).
  useEffect(() => {
    if (!typed.current) return;
    const q = value.trim();
    if (q.length < 3) {
      setOpen(false);
      setResults([]);
      return;
    }
    setLoading(true);
    setOpen(true);
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      api
        .addresses(q, ctrl.signal)
        .then((r) => {
          setResults(r.results);
          setActive(-1);
          setLoading(false);
        })
        .catch((err) => {
          if (err.name === 'AbortError') return;
          setResults([]);
          setLoading(false);
        });
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [value]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const choose = (s: AddressSuggestion) => {
    typed.current = false;
    onSelect(s);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || loading) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(results.length - 1, i + 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
    if (e.key === 'Enter' && active >= 0) { e.preventDefault(); choose(results[active]); }
    if (e.key === 'Escape') setOpen(false);
  };

  return (
    <div ref={wrapRef} className="relative">
      <FieldShell id={id} label="Street address" error={error} hint="Start typing — e.g. “Westlands” or “Baker Street” — and pick your address.">
        <div className="relative">
          <MapPin size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-gray-500" />
          <input
            id={id}
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
            aria-invalid={!!error || undefined}
            aria-describedby={error ? `${id}-error` : `${id}-hint`}
            autoComplete="street-address"
            value={value}
            onChange={(e) => { typed.current = true; onChange(e.target.value); }}
            onKeyDown={onKeyDown}
            onBlur={onBlur}
            placeholder="Building, street"
            className={inputClass(!!error, 'pl-10 pr-10')}
          />
          {loading && <Spinner className="absolute top-1/2 right-3 -translate-y-1/2 text-brand-600" />}
        </div>
      </FieldShell>

      {open && (
        <ul id={listId} role="listbox" aria-label="Address suggestions" className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          {loading ? (
            <li className="px-4 py-3 text-sm text-gray-600" role="option" aria-selected="false" aria-disabled="true">Searching addresses…</li>
          ) : results.length === 0 ? (
            <li className="px-4 py-3 text-sm text-gray-600" role="option" aria-selected="false" aria-disabled="true">No matches — keep typing, or fill in the fields below yourself.</li>
          ) : (
            results.map((r, i) => (
              <li
                key={r.line}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => { e.preventDefault(); choose(r); }}
                onMouseEnter={() => setActive(i)}
                className={cx('flex min-h-11 cursor-pointer items-start gap-2 px-4 py-2.5 text-sm', i === active ? 'bg-brand-50' : 'hover:bg-gray-50')}
              >
                <MapPin size={16} className="mt-0.5 shrink-0 text-gray-500" />
                <span>
                  <span className="block font-medium text-gray-950">{r.line}</span>
                  <span className="block text-gray-600">{r.city} {r.postal_code} · {catalog.countries.find((c) => c.code === r.country)?.name ?? r.country}</span>
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
