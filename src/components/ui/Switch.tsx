// Toggle rows, and the divided list they usually sit in.

import { useId, type ReactNode } from 'react';
import { cx, focusRing } from './styles';

interface SwitchProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  price?: ReactNode;
  disabled?: boolean;
  bordered?: boolean;
}

/** A toggle row. Used inside a `ListGroup` (divided rows) or standalone with `bordered`. */
export function Switch({ checked, onChange, label, description, price, disabled, bordered }: SwitchProps) {
  const id = useId();
  return (
    <div className={cx('flex items-center gap-3 py-3', bordered && 'rounded-lg border border-gray-200 px-3 hover:border-gray-300', disabled && 'opacity-60')}>
      <label htmlFor={id} className={cx('min-w-0 flex-1', disabled ? 'cursor-not-allowed' : 'cursor-pointer')}>
        <span className="block text-sm font-medium text-gray-950">{label}</span>
        {description && <span className="mt-0.5 block text-[13px] text-gray-600">{description}</span>}
      </label>
      {price && <span className="shrink-0 text-right text-[13px] text-gray-700 tabular-nums">{price}</span>}
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cx('relative -my-1 inline-flex h-11 w-12 shrink-0 items-center justify-center rounded-full disabled:cursor-not-allowed', focusRing)}
      >
        <span className={cx('h-6 w-10 rounded-full transition-colors', checked ? 'bg-brand-600' : 'bg-gray-300')} />
        <span className={cx('absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white shadow-sm transition-all', checked ? 'left-[22px]' : 'left-[6px]')} />
        <span className="sr-only">{checked ? 'On' : 'Off'}</span>
      </button>
    </div>
  );
}

/** Rows separated by hairlines inside one border — instead of a stack of separate boxes. */
export function ListGroup({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('divide-y divide-gray-200 rounded-lg border border-gray-200 px-3 sm:px-4', className)}>{children}</div>;
}
