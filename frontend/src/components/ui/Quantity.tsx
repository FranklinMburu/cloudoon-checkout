// Minus / value / plus stepper.

import { Minus, Plus } from '../icons';
import { cx, focusRing } from './styles';

export function Quantity({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  const btn = cx('flex h-11 w-11 items-center justify-center text-gray-700 hover:bg-gray-50 active:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 sm:h-9 sm:w-9', focusRing);
  return (
    <div className="inline-flex items-center rounded-lg border border-gray-300" role="group" aria-label={label}>
      <button type="button" className={cx(btn, 'rounded-l-lg')} onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label={`Remove one ${label.toLowerCase()}`}>
        <Minus size={16} />
      </button>
      <output className="w-9 border-x border-gray-300 text-center text-sm font-medium text-gray-950 tabular-nums" aria-live="polite">{value}</output>
      <button type="button" className={cx(btn, 'rounded-r-lg')} onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label={`Add one ${label.toLowerCase()}`}>
        <Plus size={16} />
      </button>
    </div>
  );
}
