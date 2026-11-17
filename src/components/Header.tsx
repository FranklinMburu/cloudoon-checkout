import { CURRENCIES } from '../data/catalog';
import { useStore } from '../state/store';
import type { CurrencyCode, Step } from '../types';
import { Check, ChevronDown, Lock } from './icons';
import { cx, focusRing } from './ui';

export function Logo() {
  return (
    <span className="flex items-center gap-2 text-[17px] font-semibold tracking-tight text-gray-950">
      <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true">
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
    <header className="sticky top-0 z-20 border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <a href="#" aria-label="Cloudoon — start of checkout" className={cx('-mx-1 flex min-h-11 items-center rounded-md px-1', focusRing)}>
          <Logo />
        </a>
        <div className="flex items-center gap-3 sm:gap-5">
          <span className="hidden items-center gap-1.5 text-[13px] text-gray-500 sm:flex"><Lock size={14} /> Secure checkout</span>
          {showCurrency && (
            <div className="relative">
              <label htmlFor="currency" className="sr-only">Currency</label>
              <select
                id="currency"
                value={cart.currency}
                onChange={(e) => update({ currency: e.target.value as CurrencyCode })}
                className={cx(
                  'min-h-11 cursor-pointer appearance-none rounded-lg border border-gray-300 bg-white py-1 pr-8 pl-3 text-sm font-medium text-gray-900 sm:min-h-9',
                  'hover:border-gray-400 focus:border-brand-600 focus:ring-[3px] focus:ring-brand-600/20 focus:outline-none',
                )}
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
                ))}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-gray-500" />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

const STEPS: { n: Step; label: string }[] = [
  { n: 1, label: 'Configure' },
  { n: 2, label: 'Account & billing' },
  { n: 3, label: 'Payment' },
];

export function Stepper() {
  const { checkout, setStep } = useStore();
  const current = checkout.step;
  return (
    <nav aria-label="Checkout progress">
      <ol className="flex items-center gap-2 text-[13px]">
        {STEPS.map((s, i) => {
          const done = s.n < current;
          const active = s.n === current;
          const dot = (
            <span
              className={cx(
                'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
                done ? 'bg-brand-600 text-white' : active ? 'bg-gray-950 text-white' : 'bg-gray-200 text-gray-600',
              )}
              aria-hidden="true"
            >
              {done ? <Check size={12} strokeWidth={3} /> : s.n}
            </span>
          );
          const text = (
            <span className={cx('truncate', active ? 'font-medium text-gray-950' : done ? 'text-gray-700' : 'text-gray-500', !active && 'max-sm:hidden')}>
              {s.label}
            </span>
          );
          return (
            <li key={s.n} className={cx('flex min-w-0 items-center gap-2', active && 'shrink-0')} aria-current={active ? 'step' : undefined}>
              {done ? (
                <button type="button" onClick={() => setStep(s.n)} className={cx('-mx-1 flex min-h-11 items-center gap-2 rounded-md px-1 hover:text-brand-700 sm:min-h-8', focusRing)} aria-label={`${s.label}, completed. Go back to this step`}>
                  {dot}
                  {text}
                </button>
              ) : (
                <span className="flex min-h-11 items-center gap-2 sm:min-h-8">
                  {dot}
                  {text}
                  <span className="sr-only">{active ? ', current step' : ', not started'}</span>
                </span>
              )}
              {i < STEPS.length - 1 && <span className={cx('h-px w-6 shrink-0 sm:w-10', done ? 'bg-brand-600' : 'bg-gray-300')} aria-hidden="true" />}
            </li>
          );
        })}
        <li className="ml-auto shrink-0 text-xs text-gray-500 sm:hidden" aria-hidden="true">Step {current} of 3</li>
      </ol>
    </nav>
  );
}
