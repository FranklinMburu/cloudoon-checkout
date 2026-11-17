// The persistent order summary: a sticky sidebar on desktop, a bottom drawer on mobile.
// It is read straight from the pricing engine, so it is always in sync.

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { checkPromo } from '../lib/pricing';
import { money } from '../lib/format';
import { useStore } from '../state/store';
import type { LineItem } from '../types';
import { ChevronUp, Lock, Tag, Trash, X } from './icons';
import { Badge, Button, FlashValue, cx, inputClass } from './ui';

export function OrderSummary({ cta, onEditHosting }: { cta?: ReactNode; onEditHosting?: () => void }) {
  const { quote, cart } = useStore();
  const cur = cart.currency;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold text-gray-950">Order summary</h2>
        <span className="text-sm text-gray-600">{quote.lines.length} {quote.lines.length === 1 ? 'item' : 'items'}</span>
      </div>

      <ul className="divide-y divide-gray-100 border-y border-gray-100">
        {quote.lines.map((line) => (
          <SummaryLine key={line.id} line={line} onEditHosting={onEditHosting} />
        ))}
      </ul>

      <PromoCode />

      <dl className="space-y-2 text-sm">
        <Row label="Subtotal" value={money(quote.subtotal, cur)} />
        {quote.promo && <Row label={`Promo ${quote.promo.code}`} value={`−${money(quote.promo.amount, cur)}`} className="text-green-700" />}
        <Row label={<>Tax <span className="text-gray-500">({quote.taxLabel})</span></>} value={money(quote.tax, cur)} />
      </dl>

      <div className="rounded-xl bg-gray-50 p-4">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-semibold text-gray-950">Total due today</span>
          <span aria-live="polite">
            <FlashValue value={`${quote.total}-${cur}`} className="text-2xl font-bold tracking-tight text-gray-950">
              {money(quote.total, cur)}
            </FlashValue>
          </span>
        </div>
        {quote.savings + (quote.promo?.amount ?? 0) > 0 && (
          <p className="mt-1 text-right text-sm font-medium text-green-700">
            You save {money(quote.savings + (quote.promo?.amount ?? 0), cur)} on this order
          </p>
        )}
        <p className="mt-2 text-xs text-gray-600">
          Prices in {cur}{cart.currency !== 'USD' ? ', converted from USD' : ''}. Renewal prices are shown under each item — no setup fees, no hidden charges.
        </p>
      </div>

      {cta}

      <p className="flex items-center justify-center gap-1.5 text-xs text-gray-600">
        <Lock size={14} /> Secure, encrypted checkout · Turn off auto-renew anytime
      </p>
    </div>
  );
}

function Row({ label, value, className }: { label: ReactNode; value: string; className?: string }) {
  return (
    <div className={cx('flex justify-between gap-3 text-gray-700', className)}>
      <dt>{label}</dt>
      <dd className="font-medium tabular-nums text-gray-950">{value}</dd>
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
          <p className="flex flex-wrap items-center gap-1.5 font-medium text-gray-950">
            <span className="break-all">{line.title}</span>
            {line.badge && <Badge tone={line.kind === 'hosting' ? 'accent' : 'success'}>{line.badge}</Badge>}
          </p>
          {line.details.map((d) => (
            <p key={d} className="text-xs text-gray-600">{d}</p>
          ))}
        </div>
        <div className="shrink-0 text-right">
          {discounted && <p className="text-xs text-gray-500 line-through">{money(line.regularPrice, cur)}</p>}
          <p className="font-semibold tabular-nums text-gray-950">{line.dueToday === 0 ? 'Free' : money(line.dueToday, cur)}</p>
          {line.termLabel !== '—' && <p className="text-xs text-gray-600">{line.termLabel}</p>}
        </div>
      </div>

      <div className="mt-1 flex items-center justify-between gap-2">
        <p className="text-xs text-gray-700">
          {line.renewal
            ? line.autoRenew === false
              ? <>Auto-renew off · renewal would be {money(line.renewal.amount, cur)} {line.renewal.label}</>
              : <>Renews at <strong className="font-semibold">{money(line.renewal.amount, cur)}</strong> {line.renewal.label}</>
            : 'No recurring charge'}
        </p>
        {line.kind === 'hosting' && onEditHosting && (
          <button type="button" onClick={onEditHosting} className="-my-2 min-h-11 rounded-md px-2 text-sm font-semibold text-brand-700 hover:bg-brand-50 focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:outline-none">
            Change
          </button>
        )}
        {line.removable && (
          <button
            type="button"
            onClick={() => removeLine(line.id)}
            aria-label={`Remove ${line.title}`}
            className="-my-2 inline-flex min-h-11 shrink-0 items-center gap-1 rounded-md px-2 text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-700 focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:outline-none"
          >
            <Trash size={15} /> Remove
          </button>
        )}
      </div>
    </li>
  );
}

function PromoCode() {
  const { cart, quote, update } = useStore();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (quote.promo) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-1 text-sm">
        <span className="flex items-start gap-2 text-green-800">
          <Tag size={16} className="mt-0.5 shrink-0" />
          <span><strong>{quote.promo.code}</strong> applied · {quote.promo.label}</span>
        </span>
        <button type="button" onClick={() => update({ promoCode: null })} className="min-h-11 rounded-md px-2 font-medium text-gray-700 hover:text-red-700 focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:outline-none">
          Remove
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="-my-1 flex min-h-11 items-center gap-2 self-start rounded-md text-sm font-semibold text-brand-700 hover:underline focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:outline-none">
        <Tag size={16} /> Have a promo code?
      </button>
    );
  }

  const apply = () => {
    setLoading(true);
    setError('');
    // Simulated server check.
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
      <label htmlFor="promo" className="mb-1.5 block text-sm font-medium text-gray-900">Promo code</label>
      <div className="flex gap-2">
        <input
          id="promo"
          value={code}
          autoFocus
          onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(''); }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); apply(); } }}
          placeholder="e.g. WELCOME10"
          aria-invalid={!!error || undefined}
          aria-describedby={error ? 'promo-error' : 'promo-hint'}
          className={inputClass(!!error, 'uppercase')}
        />
        <Button variant="secondary" onClick={apply} loading={loading} disabled={!code.trim()}>Apply</Button>
      </div>
      {error ? (
        <p id="promo-error" role="alert" className="mt-1.5 text-sm text-red-700">{error}</p>
      ) : (
        <p id="promo-hint" className="mt-1.5 text-xs text-gray-600">Try WELCOME10 or HOSTING25.</p>
      )}
      <span className="sr-only" aria-live="polite">{cart.promoCode ? 'Promo applied' : ''}</span>
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
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur lg:hidden">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-haspopup="dialog"
            className="flex min-h-11 flex-1 flex-col items-start rounded-lg text-left focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:outline-none"
          >
            <span className="text-xs text-gray-600">Total due today</span>
            <span className="flex items-center gap-1 text-lg font-bold text-gray-950">
              <FlashValue value={`${quote.total}-${cart.currency}`}>{money(quote.total, cart.currency)}</FlashValue>
              <span className="flex items-center text-sm font-semibold text-brand-700">
                View order <ChevronUp size={16} />
              </span>
            </span>
          </button>
          {cta && <div className="shrink-0">{cta}</div>}
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Order summary">
          <div className="absolute inset-0 bg-gray-950/50" onClick={() => setOpen(false)} />
          <div className="sheet absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-2xl bg-white p-4 pb-8">
            <div className="mb-2 flex justify-end">
              <Button ref={closeRef} variant="secondary" onClick={() => setOpen(false)}>
                <X size={18} /> Close
              </Button>
            </div>
            <OrderSummary onEditHosting={onEditHosting ? () => { setOpen(false); onEditHosting(); } : undefined} />
          </div>
        </div>
      )}
    </>
  );
}
