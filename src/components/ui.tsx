// Design-system primitives. Every interactive element has hover, active,
// focus-visible and disabled states, and a touch target of at least 44px.

import { useId, useRef, type Ref, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';
import { Alert, Check, ChevronDown, Info, Minus, Plus, Spinner } from './icons';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');
export { cx };

const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2';

/* -------------------------------- Button ------------------------------- */

type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger-ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

const variants: Record<ButtonVariant, string> = {
  // Primary: actions & navigation (brand blue, 5.3:1 with white text).
  primary: 'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 shadow-sm',
  // Accent: the single conversion action on screen (dark text on amber, 9.3:1).
  accent: 'bg-accent-400 text-gray-950 hover:bg-accent-300 active:bg-accent-500 shadow-sm',
  secondary: 'bg-white text-gray-900 border border-gray-300 hover:bg-gray-50 hover:border-gray-400 active:bg-gray-100',
  ghost: 'text-brand-700 hover:bg-brand-50 active:bg-brand-100',
  'danger-ghost': 'text-gray-600 hover:text-red-700 hover:bg-red-50 active:bg-red-100',
};

export function Button({ variant = 'primary', size = 'md', loading, fullWidth, className, children, disabled, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors select-none',
        'disabled:cursor-not-allowed disabled:opacity-50',
        focusRing,
        size === 'md' ? 'min-h-11 px-4 text-sm' : 'min-h-13 px-6 text-base',
        variants[variant],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

/* --------------------------------- Badge ------------------------------- */

type Tone = 'accent' | 'brand' | 'success' | 'neutral' | 'danger';

const badgeTones: Record<Tone, string> = {
  accent: 'bg-accent-400 text-gray-950',
  brand: 'bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200',
  success: 'bg-green-50 text-green-800 ring-1 ring-inset ring-green-200',
  neutral: 'bg-gray-100 text-gray-700',
  danger: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200',
};

export function Badge({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap', badgeTones[tone], className)}>
      {children}
    </span>
  );
}

/* -------------------------------- Section ------------------------------ */

export function Section({ id, title, description, aside, children }: { id?: string; title: string; description?: string; aside?: ReactNode; children: ReactNode }) {
  const headingId = useId();
  return (
    <section id={id} aria-labelledby={headingId} className="scroll-mt-28 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id={headingId} className="text-lg font-semibold text-gray-950">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-gray-600">{description}</p>}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

/* --------------------------------- Switch ------------------------------ */

interface SwitchProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  price?: ReactNode;
  disabled?: boolean;
  icon?: ReactNode;
}

/** A full-width row toggle. The whole row is the hit target. */
export function Switch({ checked, onChange, label, description, price, disabled, icon }: SwitchProps) {
  const id = useId();
  return (
    <div className={cx('flex items-center gap-3 rounded-xl border p-3 transition-colors sm:p-4', checked ? 'border-brand-600 bg-brand-50/50' : 'border-gray-200 bg-white', !disabled && 'hover:border-brand-400', disabled && 'opacity-60')}>
      {icon && <span className={cx('hidden shrink-0 rounded-lg p-2 sm:block', checked ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600')}>{icon}</span>}
      <label htmlFor={id} className={cx('min-w-0 flex-1', disabled ? 'cursor-not-allowed' : 'cursor-pointer')}>
        <span className="block font-medium text-gray-950">{label}</span>
        {description && <span className="mt-0.5 block text-sm text-gray-600">{description}</span>}
      </label>
      {price && <span className="shrink-0 text-right text-sm font-semibold text-gray-950">{price}</span>}
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cx('relative inline-flex h-11 w-14 shrink-0 items-center justify-center rounded-full disabled:cursor-not-allowed', focusRing)}
      >
        <span className={cx('h-7 w-12 rounded-full transition-colors', checked ? 'bg-brand-600' : 'bg-gray-300')} />
        <span className={cx('absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white shadow transition-all', checked ? 'left-8' : 'left-2')} />
        <span className="sr-only">{checked ? 'On' : 'Off'}</span>
      </button>
    </div>
  );
}

/* ------------------------------- RadioCard ----------------------------- */

interface RadioCardProps {
  name: string;
  value: string;
  checked: boolean;
  onChange: (value: string) => void;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
  label?: string; // accessible label when children are complex
}

/** A selectable card backed by a native radio input (keyboard arrows work). */
export function RadioCard({ name, value, checked, onChange, disabled, children, className, label }: RadioCardProps) {
  return (
    <label
      className={cx(
        'relative flex min-h-11 rounded-xl border-2 bg-white p-4 transition-all',
        'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-600 has-[:focus-visible]:ring-offset-2',
        checked ? 'border-brand-600 bg-brand-50/40 shadow-sm' : 'border-gray-200',
        disabled ? 'cursor-not-allowed bg-gray-50 opacity-60' : 'cursor-pointer hover:border-brand-400 active:scale-[0.99]',
        className,
      )}
    >
      <input type="radio" className="sr-only" name={name} value={value} checked={checked} disabled={disabled} aria-label={label} onChange={() => onChange(value)} />
      {checked && (
        <span className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white" aria-hidden="true">
          <Check size={13} strokeWidth={3} />
        </span>
      )}
      <span className="block w-full">{children}</span>
    </label>
  );
}

/* ------------------------------- Segmented ----------------------------- */

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
    <div role="radiogroup" aria-label={label} className={cx('inline-flex rounded-xl bg-gray-100 p-1', fullWidth && 'flex w-full')}>
      {options.map((o) => (
        <label
          key={o.value}
          className={cx(
            'flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-lg px-3 text-center text-sm font-semibold transition-colors',
            'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-600',
            value === o.value ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-600 hover:text-gray-950',
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

/* --------------------------------- Fields ------------------------------ */

interface FieldShellProps {
  id: string;
  label: string;
  optional?: boolean;
  error?: string;
  hint?: ReactNode;
  valid?: boolean;
  children: ReactNode;
  className?: string;
}

export function FieldShell({ id, label, optional, error, hint, valid, children, className }: FieldShellProps) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-900">
        <span>{label}</span>
        {optional && <span className="text-xs font-normal text-gray-500">Optional</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1.5 flex items-start gap-1.5 text-sm text-red-700">
          <Alert size={16} className="mt-0.5 shrink-0" />
          {error}
        </p>
      ) : valid ? (
        <p id={`${id}-hint`} className="mt-1.5 flex items-center gap-1.5 text-sm text-green-700">
          <Check size={16} className="shrink-0" /> Looks good
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-sm text-gray-600">{hint}</p>
      ) : null}
    </div>
  );
}

export const inputClass = (invalid?: boolean, extra?: string) =>
  cx(
    'block min-h-11 w-full rounded-lg border bg-white px-3 py-2.5 text-base text-gray-950 placeholder:text-gray-400 transition-colors sm:text-sm',
    'focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500',
    invalid
      ? 'border-red-600 focus:border-red-600 focus:ring-red-600/30'
      : 'border-gray-300 hover:border-gray-400 focus:border-brand-600 focus:ring-brand-600/30',
    extra,
  );

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  hint?: ReactNode;
  valid?: boolean;
  optional?: boolean;
  trailing?: ReactNode;
  className?: string;
}

export function TextField({ label, value, onChange, error, hint, valid, optional, trailing, className, id: idProp, ...rest }: TextFieldProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  return (
    <FieldShell id={id} label={label} optional={optional} error={error} hint={hint} valid={valid} className={className}>
      <div className="relative">
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? `${id}-error` : hint || valid ? `${id}-hint` : undefined}
          className={inputClass(!!error, trailing ? 'pr-12' : undefined)}
          {...rest}
        />
        {trailing && <div className="absolute inset-y-0 right-0 flex items-center pr-1">{trailing}</div>}
      </div>
    </FieldShell>
  );
}

interface SelectFieldProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  error?: string;
  hint?: ReactNode;
  className?: string;
}

export function SelectField({ label, value, onChange, options, error, hint, className, ...rest }: SelectFieldProps) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} className={className}>
      <div className="relative">
        <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={inputClass(!!error, 'appearance-none pr-10')} {...rest}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <ChevronDown size={18} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-gray-500" />
      </div>
    </FieldShell>
  );
}

/* -------------------------------- Range -------------------------------- */

interface RangeFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  display: string;
  price?: string;
  minLabel: string;
  maxLabel: string;
  valueText?: string;
}

export function RangeField({ label, value, min, max, step = 1, onChange, display, price, minLabel, maxLabel, valueText }: RangeFieldProps) {
  const id = useId();
  const fill = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium text-gray-900">{label}</label>
        <span className="text-sm text-gray-600">
          <span className="text-base font-semibold text-gray-950">{display}</span>
          {price && <span className="ml-2">{price}</span>}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={valueText ?? display}
        onChange={(e) => onChange(Number(e.target.value))}
        className="range h-11 w-full cursor-pointer"
        style={{ ['--fill' as string]: `${fill}%` }}
      />
      <div className="flex justify-between text-xs text-gray-500">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  );
}

/* ------------------------------ Quantity ------------------------------- */

export function Quantity({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  const btn = cx('flex h-11 w-11 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 active:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40', focusRing);
  return (
    <div className="flex items-center gap-2" role="group" aria-label={label}>
      <button type="button" className={btn} onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label={`Remove one ${label.toLowerCase()}`}>
        <Minus size={18} />
      </button>
      <output className="w-10 text-center text-base font-semibold text-gray-950" aria-live="polite">{value}</output>
      <button type="button" className={btn} onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label={`Add one ${label.toLowerCase()}`}>
        <Plus size={18} />
      </button>
    </div>
  );
}

/* -------------------------------- Notice ------------------------------- */

const noticeTones = {
  info: 'border-brand-200 bg-brand-50 text-brand-900',
  warning: 'border-accent-200 bg-accent-50 text-accent-900',
  error: 'border-red-200 bg-red-50 text-red-800',
  success: 'border-green-200 bg-green-50 text-green-800',
};

export function Notice({ tone = 'info', children, className }: { tone?: keyof typeof noticeTones; children: ReactNode; className?: string }) {
  const Icon = tone === 'success' ? Check : tone === 'info' ? Info : Alert;
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={cx('flex items-start gap-2 rounded-lg border p-3 text-sm', noticeTones[tone], className)}>
      <Icon size={18} className="mt-0.5 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

/* ------------------------------ FlashValue ----------------------------- */

/** Briefly highlights its content whenever `value` changes (not on first render). */
export function FlashValue({ value, children, className }: { value: string; children: ReactNode; className?: string }) {
  const initial = useRef(value);
  const everChanged = useRef(false);
  if (value !== initial.current) everChanged.current = true;
  const changed = everChanged.current;
  return (
    <span key={value} className={cx(changed && 'flash', 'rounded px-1', className)}>
      {children}
    </span>
  );
}

/* ------------------------------- Skeleton ------------------------------ */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('animate-pulse rounded-md bg-gray-200', className)} aria-hidden="true" />;
}
