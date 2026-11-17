// Selectable cards backed by native radio inputs.

import { type ReactNode } from 'react';
import { cx } from './styles';

interface RadioCardProps {
  name: string;
  value: string;
  checked: boolean;
  onChange: (value: string) => void;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
  label?: string;
  indicator?: boolean;
}

/** Selectable option backed by a native radio (arrow keys work). Shows a radio dot, not a badge. */
export function RadioCard({ name, value, checked, onChange, disabled, children, className, label, indicator = true }: RadioCardProps) {
  return (
    <label
      className={cx(
        'relative flex min-h-11 gap-3 rounded-lg border bg-white p-3 transition-colors',
        'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-600 has-[:focus-visible]:ring-offset-1',
        checked ? 'border-brand-600 bg-brand-50/40 ring-1 ring-brand-600' : 'border-gray-200',
        disabled ? 'cursor-not-allowed bg-gray-50 opacity-60' : 'cursor-pointer hover:border-gray-400 active:bg-gray-50',
        checked && !disabled && 'hover:border-brand-600',
        className,
      )}
    >
      <input type="radio" className="sr-only" name={name} value={value} checked={checked} disabled={disabled} aria-label={label} onChange={() => onChange(value)} />
      {indicator && (
        <span
          aria-hidden="true"
          className={cx('mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border', checked ? 'border-brand-600 bg-brand-600' : 'border-gray-400 bg-white')}
        >
          {checked && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
        </span>
      )}
      <span className="block min-w-0 flex-1">{children}</span>
    </label>
  );
}
