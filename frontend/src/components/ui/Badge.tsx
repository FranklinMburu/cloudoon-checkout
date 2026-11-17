// Small status labels: discounts, promos, stock.

import { type ReactNode } from 'react';
import { cx } from './styles';

type Tone = 'accent' | 'brand' | 'success' | 'neutral' | 'danger';

// Promo and discount flags use a light amber so solid amber stays reserved for the conversion button.
const badgeTones: Record<Tone, string> = {
  accent: 'bg-accent-100 text-accent-900 ring-1 ring-inset ring-accent-300',
  brand: 'bg-brand-50 text-brand-700',
  success: 'bg-green-50 text-green-800',
  neutral: 'bg-gray-100 text-gray-700',
  danger: 'bg-red-50 text-red-700',
};

export function Badge({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cx('inline-flex items-center rounded-md px-1.5 py-0.5 text-xs leading-4 font-medium whitespace-nowrap', badgeTones[tone], className)}>
      {children}
    </span>
  );
}
