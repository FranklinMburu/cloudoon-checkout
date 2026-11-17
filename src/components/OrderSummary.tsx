// The persistent order summary: a sticky sidebar on desktop, a bottom bar + sheet on mobile.
// It reads straight from the pricing engine, so it is always in sync.

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { checkPromo } from '../lib/pricing';
import { money } from '../lib/format';
import { useStore } from '../state/store';
import type { LineItem } from '../types';
import { ChevronUp, Lock, Tag, X } from './icons';
import { Badge, Button, FlashValue, TextButton, cx, focusRing, inputClass } from './ui';

export function OrderSummary({ cta, onEditHosting }: { cta?: ReactNode; onEditHosting?: () => void }) {
  const { quote, cart } = useStore();
  const cur = cart.currency;
  const saved = quote.savings + (quote.promo?.amount ?? 0);

  return (
    <div className="flex flex-col">
      <h2 className="text-base font-semibold text-gray-950">Order summary</h2>

      <ul className="mt-3 divide-y divide-gray-100 border-y border-gray-100">
        {quote.lines.map((line) => (
          <SummaryLine key={line.id} line={line} onEditHosting={onEditHosting} />
        ))}
      </ul>

      <div className="py-3">
        <PromoCode />
      </div>

      <dl className="space-y-1.5 border-t border-gray-100 pt-3 text-[13px]">
        <Row label="Subtotal" value={money(quote.subtotal, cur)} />
        {quote.promo && <Row label={`Promo (${quote.promo.code})`} value={`−${money(quote.promo.amount, cur)}`} valueClass="text-green-700" />}
        <Row label={`Tax · ${quote.taxLabel}`} value={money(quote.tax, cur)} />
      </dl>

      <div className="mt-3 flex items-baseline justify-between gap-2 border-t border-gray-200 pt-3">
        <span className="text-sm font-medium text-gray-950">Due today</span>
        <span aria-live="polite" className="text-xl font-semibold tracking-tight text-gray-950 tabular-nums">
          <FlashValue value={`${quote.total}-${cur}`}>{money(quote.total, cur)}</FlashValue>
        </span>
      </div>
      {saved > 0 && <p className="text-right text-[13px] text-green-700 tabular-nums">You save {money(saved, cur)}</p>}

      {cta && <div className="mt-4">{cta}</div>}

      <p className="mt-3 flex items-start gap-1.5 text-xs text-gray-500">
        <Lock size={13} className="mt-px shrink-0" />
        <span>Prices in {cur}. No setup fees. Renewal prices are shown for each item, and auto-renew can be turned off anytime.</span>
      </p>
    </div>
  );
}

function Row({ label, value, valueClass }: { label: ReactNode; value: string; valueClass?: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-gray-600">{label}</dt>
      <dd className={cx('text-gray-950 tabular-nums', valueClass)}>{value}</dd>
    </div>
  );
}

function SummaryLine({ line, onEditHosting }: { line: LineItem; onEditHosting?: () => void }) {
  const { cart, removeLine } = useStore();
  const cur = cart.currency;
  const discounted = line.regularPrice > line.dueToday;

  return (
    <li className="py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium break-words text-gray-950">{line.title}</p>
          <p className="text-xs text-gray-500">
            {line.details[0]}
            {line.termLabel !== '—' && <> · {line.termLabel}</>}
          </p>
        </div>
        <div className="shrink-0 text-right tabular-nums">
          <p className="text-sm font-medium text-gray-950">{line.dueToday === 0 ? 'Free' : money(line.dueToday, cur)}</p>
          {discounted && <p className="text-xs text-gray-400 line-through">{money(line.regularPrice, cur)}</p>}
        </div>
      </div>

      <div className="mt-1 flex items-center justify-between gap-2">
        <p className="flex flex-wrap items-center gap-1.5 text-xs text-gray-500 tabular-nums">
          {line.badge && <Badge tone={line.kind === 'hosting' ? 'accent' : 'success'}>{line.badge}</Badge>}
          {line.renewal
            ? line.autoRenew === false
              ? <>Auto-renew off</>
              : <>Renews at {money(line.renewal.amount, cur)} {line.renewal.label}</>
            : 'No recurring charge'}
        </p>
        {line.kind === 'hosting' && onEditHosting && <TextButton onClick={onEditHosting}>Change</TextButton>}
        {line.removable && (
          <TextButton tone="muted" onClick={() => removeLine(line.id)} aria-label={`Remove ${line.title}`}>Remove</TextButton>
        )}
      </div>
    </li>
  );
}

function PromoCode() {
  const { quote, update } = useStore();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (quote.promo) {
    return (
      <div className="flex items-center justify-between gap-2 text-[13px]">
        <span className="flex min-w-0 items-center gap-1.5 text-green-700">
          <Tag size={14} className="shrink-0" /> <span className="truncate"><span className="font-medium">{quote.promo.code}</span> · {quote.promo.label}</span>
        </span>
        <TextButton tone="muted" onClick={() => update({ promoCode: null })}>Remove</TextButton>
      </div>
    );
  }

  if (!open) {
    return <TextButton onClick={() => setOpen(true)}>Add promo code</TextButton>;
  }

  const apply = () => {
    setLoading(true);
    setError('');
    setTimeout(() => {
      const res = checkPromo(code);
      setLoading(false);
      if (res.ok) {
        update({ promoCode: res.promo.code });
        setCode('');
      } else setError(res.error);
    }, 500);
  };

  return (
    <div>
      <label htmlFor="promo" className="sr-only">Promo code</label>
      <div className="flex gap-2">
        <input
          id="promo"
          value={code}
          autoFocus
          onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(''); }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); apply(); } }}
          placeholder="Promo code"
          aria-invalid={!!error || undefined}
          aria-describedby={error ? 'promo-error' : 'promo-hint'}
          className={inputClass(!!error, 'uppercase')}
        />
        <Button variant="secondary" onClick={apply} loading={loading} disabled={!code.trim()}>Apply</Button>
      </div>
      {error ? (
        <p id="promo-error" role="alert" className="mt-1.5 text-[13px] text-red-700">{error}</p>
      ) : (
        <p id="promo-hint" className="mt-1.5 text-xs text-gray-500">Try WELCOME10 or HOSTING25</p>
      )}
    </div>
  );
}

/* ------------------------------ Mobile bar ----------------------------- */

export function MobileSummaryBar({ cta, onEditHosting }: { cta?: ReactNode; onEditHosting?: () => void }) {
  const { quote, cart } = useStore();
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white px-4 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] lg:hidden">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-haspopup="dialog"
            className={cx('-ml-1 flex min-h-11 min-w-0 flex-1 flex-col items-start justify-center rounded-md px-1 text-left', focusRing)}
          >
            <span className="flex items-center gap-1 text-xs text-gray-500">
              Due today · <span className="font-medium text-brand-700">Details</span> <ChevronUp size={12} className="text-brand-700" />
            </span>
            <span className="text-lg leading-6 font-semibold text-gray-950 tabular-nums">
              <FlashValue value={`${quote.total}-${cart.currency}`}>{money(quote.total, cart.currency)}</FlashValue>
            </span>
          </button>
          {cta && <div className="w-40 shrink-0">{cta}</div>}
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Order summary">
          <div className="absolute inset-0 bg-gray-950/40" onClick={() => setOpen(false)} />
          <div className="sheet absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-2xl bg-white px-4 pt-2 pb-8">
            <div className="mx-auto mb-1 h-1 w-10 rounded-full bg-gray-300" aria-hidden="true" />
            <div className="flex justify-end">
              <Button ref={closeRef} variant="ghost" size="sm" onClick={() => setOpen(false)}>
                <X size={16} /> Close
              </Button>
            </div>
            <OrderSummary onEditHosting={onEditHosting ? () => { setOpen(false); onEditHosting(); } : undefined} />
          </div>
        </div>
      )}
    </>
  );
}
