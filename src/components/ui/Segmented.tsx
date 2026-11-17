// Segmented control: a small set of mutually exclusive options.

import { useId } from 'react';
import { cx } from './styles';

interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  options: { value: T; label: string; disabled?: boolean }[];
  onChange: (v: T) => void;
  fullWidth?: boolean;
}

export function Segmented<T extends string>({ label, value, options, onChange, fullWidth }: SegmentedProps<T>) {
  const name = useId();
  return (
    <div role="radiogroup" aria-label={label} className={cx('inline-flex gap-1 rounded-lg bg-gray-100 p-1', fullWidth && 'flex w-full')}>
      {options.map((o) => (
        <label
          key={o.value}
          className={cx(
            'flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-md px-2 text-center text-[13px] font-medium transition-colors sm:min-h-8',
            'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-600',
            value === o.value ? 'bg-white text-gray-950 shadow-sm ring-1 ring-gray-200' : 'text-gray-600 hover:text-gray-950',
            o.disabled && 'cursor-not-allowed opacity-50',
          )}
        >
          <input type="radio" className="sr-only" name={name} value={o.value} checked={value === o.value} disabled={o.disabled} onChange={() => onChange(o.value)} />
          {o.label}
        </label>
      ))}
    </div>
  );
}
