import { CURRENCIES } from '../data/catalog';
import { useStore } from '../state/store';
import type { CurrencyCode, Step } from '../types';
import { Check, ChevronDown, Lock } from './icons';
import { cx } from './ui';

export function Logo() {
  return (
    <span className="flex items-center gap-2 text-xl font-bold tracking-tight text-gray-950">
      <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill="#395AF4" />
        <path d="M22.5 22H11a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 22 12.5a4.75 4.75 0 0 1 .5 9.5Z" fill="#fff" />
        <circle cx="23.5" cy="9" r="3" fill="#E7A403" />
      </svg>
      cloudoon
    </span>
  );
}

export function Header({ showCurrency = true }: { showCurrency?: boolean }) {
  const { cart, update } = useStore();
  return (
    <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <a href="#" aria-label="Cloudoon — back to start of checkout" className="flex min-h-11 items-center rounded-md focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:outline-none">
          <Logo />
        </a>
        <div className="flex items-center gap-4">
          <span className="hidden items-center gap-1.5 text-sm text-gray-600 sm:flex"><Lock size={16} /> Secure checkout</span>
          {showCurrency && (
            <div className="flex items-center gap-2">
              <label htmlFor="currency" className="hidden text-sm font-medium text-gray-700 md:block">Currency</label>
              <div className="relative">
                <select
                  id="currency"
                  aria-label="Currency"
                  value={cart.currency}
                  onChange={(e) => update({ currency: e.target.value as CurrencyCode })}
                  className="min-h-11 cursor-pointer appearance-none rounded-lg border border-gray-300 bg-white py-2 pr-9 pl-3 text-sm font-semibold text-gray-950 hover:border-gray-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/30 focus:outline-none"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
                  ))}
                </select>
                <ChevronDown size={16} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-gray-500" />
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

const STEPS: { n: Step; label: string; short: string }[] = [
  { n: 1, label: 'Configure product', short: 'Configure' },
  { n: 2, label: 'Account & billing', short: 'Account' },
  { n: 3, label: 'Payment & confirmation', short: 'Payment' },
];

export function Stepper() {
  const { checkout, setStep } = useStore();
  const current = checkout.step;
  return (
    <nav aria-label="Checkout progress">
      <ol className="grid grid-cols-3 gap-3 sm:gap-4">
        {STEPS.map((s) => {
          const done = s.n < current;
          const active = s.n === current;
          const content = (
            <>
              <span className={cx('h-1.5 w-full rounded-full', done || active ? 'bg-brand-600' : 'bg-gray-200')} aria-hidden="true" />
              <span className="mt-2 flex w-full min-w-0 items-center gap-1.5 sm:gap-2">
                <span className={cx('flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold', done ? 'bg-brand-600 text-white' : active ? 'border-2 border-brand-600 text-brand-700' : 'border-2 border-gray-300 text-gray-500')}>
                  {done ? <Check size={14} strokeWidth={3} /> : s.n}
                </span>
                <span className={cx('min-w-0 truncate text-left text-xs font-semibold sm:text-sm', active ? 'text-gray-950' : done ? 'text-brand-700' : 'text-gray-500')}>
                  <span className="sm:hidden">{s.short}</span>
                  <span className="hidden sm:inline">{s.label}</span>
                </span>
              </span>
            </>
          );
          return (
            <li key={s.n} aria-current={active ? 'step' : undefined}>
              {done ? (
                <button type="button" onClick={() => setStep(s.n)} className="flex min-h-11 w-full flex-col items-start rounded-md hover:opacity-80 focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 focus-visible:outline-none" aria-label={`Step ${s.n}: ${s.label} — completed, go back`}>
                  {content}
                </button>
              ) : (
                <div className="flex min-h-11 w-full flex-col items-start">
                  {content}
                  <span className="sr-only">{active ? ' — current step' : ' — not started'}</span>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
