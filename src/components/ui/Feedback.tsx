// Notices, loading skeletons, value-change highlight and feature lists.

import { useRef, type ReactNode } from 'react';
import { Alert, Check, Info } from '../icons';
import { cx } from './styles';

const noticeTones = {
  info: 'bg-brand-50 text-brand-900',
  warning: 'bg-accent-50 text-accent-900',
  error: 'bg-red-50 text-red-800',
  success: 'bg-green-50 text-green-800',
};

export function Notice({ tone = 'info', children, className }: { tone?: keyof typeof noticeTones; children: ReactNode; className?: string }) {
  const Icon = tone === 'success' ? Check : tone === 'info' ? Info : Alert;
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={cx('flex items-start gap-2 rounded-lg px-3 py-2.5 text-[13px]', noticeTones[tone], className)}>
      <Icon size={16} className="mt-px shrink-0" />
      <div>{children}</div>
    </div>
  );
}

/** Briefly highlights its content whenever `value` changes (not on first render). */
export function FlashValue({ value, children, className }: { value: string; children: ReactNode; className?: string }) {
  const initial = useRef(value);
  const everChanged = useRef(false);
  if (value !== initial.current) everChanged.current = true;
  return (
    <span key={value} className={cx(everChanged.current && 'flash', 'rounded px-0.5', className)}>
      {children}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('animate-pulse rounded-md bg-gray-200', className)} aria-hidden="true" />;
}

/** A simple check list for plan features. */
export function FeatureList({ items, className }: { items: string[]; className?: string }) {
  return (
    <ul className={cx('space-y-1 text-[13px] text-gray-700', className)}>
      {items.map((f) => (
        <li key={f} className="flex gap-2"><Check size={14} className="mt-0.5 shrink-0 text-green-700" />{f}</li>
      ))}
    </ul>
  );
}
