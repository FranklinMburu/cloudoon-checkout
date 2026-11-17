// Design-system primitives.
//
// Type scale (only these are used): 12 meta · 13 secondary · 14 body · 16 section title ·
// 20 price/total · 24 page title. Weights: 400 / 500 / 600.
// Controls are 40px tall on desktop and 44px on mobile (touch) — see `control`.

import { useId, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type Ref, type SelectHTMLAttributes } from 'react';
import { Alert, Check, ChevronDown, Info, Minus, Plus, Spinner } from './icons';

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

/** Height for every interactive control: 44px on phones, 40px from `sm` up. */
export const control = 'min-h-11 sm:min-h-10';
export const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2';

/* -------------------------------- Button ------------------------------- */

type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger-ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

const variants: Record<ButtonVariant, string> = {
  // Primary: actions & navigation (white on #395AF4 = 5.3:1).
  primary: 'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800',
  // Accent: the one conversion action per screen (near-black on #E7A403 = 9.3:1).
  accent: 'bg-accent-400 text-gray-950 hover:bg-accent-300 active:bg-accent-500',
  secondary: 'bg-white text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 active:bg-gray-100',
  ghost: 'text-brand-700 hover:bg-brand-50 active:bg-brand-100',
  'danger-ghost': 'text-gray-600 hover:bg-red-50 hover:text-red-700 active:bg-red-100',
};

const sizes = {
  sm: 'min-h-11 sm:min-h-8 px-2.5 text-[13px]',
  md: `${control} px-4 text-sm`,
  lg: 'min-h-12 px-5 text-[15px]',
};

export function Button({ variant = 'primary', size = 'md', loading, fullWidth, className, children, disabled, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        'inline-flex shrink-0 items-center justify-center gap-2 rounded-lg font-medium whitespace-nowrap transition-colors select-none',
        'disabled:cursor-not-allowed disabled:opacity-50',
        focusRing,
        sizes[size],
        variants[variant],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading && <Spinner size={16} />}
      {children}
    </button>
  );
}

/** Small inline text action (Change, Remove, Edit) with a 44px touch area on phones. */
export function TextButton({ children, tone = 'brand', className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: 'brand' | 'muted' }) {
  return (
    <button
      type="button"
      className={cx(
        '-mx-1.5 inline-flex min-h-11 shrink-0 items-center gap-1 rounded-md px-1.5 text-[13px] font-medium sm:min-h-7',
        tone === 'brand' ? 'text-brand-700 hover:bg-brand-50' : 'text-gray-500 hover:bg-red-50 hover:text-red-700',
        focusRing,
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/* --------------------------------- Badge ------------------------------- */

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

/* -------------------------------- Section ------------------------------ */

/** Full-bleed block on phones (no card-in-card), a bordered card from `sm` up. */
export function Section({ id, title, description, aside, children }: { id?: string; title: string; description?: string; aside?: ReactNode; children: ReactNode }) {
  const headingId = useId();
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className="-mx-4 scroll-mt-20 border-y border-gray-200 bg-white px-4 py-5 sm:mx-0 sm:rounded-xl sm:border sm:p-6"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id={headingId} className="text-base font-semibold text-gray-950">{title}</h2>
          {description && <p className="mt-0.5 text-[13px] text-gray-600">{description}</p>}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** A section that stays a one-line summary until opened (progressive disclosure). */
export function CollapsibleSection({
  id, title, summary, open, onToggle, badge, children,
}: { id: string; title: string; summary: ReactNode; open: boolean; onToggle: () => void; badge?: ReactNode; children: ReactNode }) {
  const panelId = `${id}-panel`;
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="-mx-4 scroll-mt-20 border-y border-gray-200 bg-white sm:mx-0 sm:rounded-xl sm:border">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className={cx('flex w-full items-center gap-3 px-4 py-4 text-left hover:bg-gray-50/60 sm:rounded-xl sm:px-6 sm:py-5', focusRing, open && 'sm:rounded-b-none')}
      >
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span id={`${id}-title`} className="text-base font-semibold text-gray-950">{title}</span>
            {badge}
          </span>
          <span className="mt-0.5 block truncate text-[13px] text-gray-600">{summary}</span>
        </span>
        <span className="flex shrink-0 items-center gap-1 text-[13px] font-medium text-brand-700">
          {open ? 'Hide' : 'Edit'}
          <ChevronDown size={16} className={cx('transition-transform', open && 'rotate-180')} />
        </span>
      </button>
      {open && (
        <div id={panelId} className="px-4 pb-5 sm:px-6 sm:pb-6">
          {children}
        </div>
      )}
    </section>
  );
}

export function SubHeading({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="mb-2.5 flex items-baseline justify-between gap-3">
      <h3 className="text-sm font-medium text-gray-950">{children}</h3>
      {hint && <span className="text-xs text-gray-500">{hint}</span>}
    </div>
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

/* ------------------------------- RadioCard ----------------------------- */

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
      <label htmlFor={id} className="mb-1.5 flex items-baseline justify-between text-[13px] font-medium text-gray-900">
        <span>{label}</span>
        {optional && <span className="text-xs font-normal text-gray-500">Optional</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1.5 flex items-start gap-1.5 text-[13px] text-red-700">
          <Alert size={14} className="mt-0.5 shrink-0" />
          {error}
        </p>
      ) : valid ? (
        <p id={`${id}-hint`} className="mt-1.5 flex items-center gap-1.5 text-[13px] text-green-700">
          <Check size={14} className="shrink-0" /> Looks good
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-gray-500">{hint}</p>
      ) : null}
    </div>
  );
}

// 16px text on phones prevents iOS zoom-on-focus; 14px from `sm` up.
export const inputClass = (invalid?: boolean, extra?: string) =>
  cx(
    'block w-full rounded-lg border bg-white px-3 text-base text-gray-950 shadow-xs transition-colors placeholder:text-gray-400 sm:text-sm',
    control,
    'focus:outline-none focus:ring-[3px] disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500',
    invalid
      ? 'border-red-600 focus:border-red-600 focus:ring-red-600/20'
      : 'border-gray-300 hover:border-gray-400 focus:border-brand-600 focus:ring-brand-600/20',
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
          className={inputClass(!!error, trailing ? 'pr-16' : undefined)}
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
        <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={inputClass(!!error, 'cursor-pointer appearance-none pr-9')} {...rest}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <ChevronDown size={16} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-gray-500" />
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
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-[13px] font-medium text-gray-900">{label}</label>
        <span className="text-[13px] text-gray-500 tabular-nums">
          <span className="text-sm font-semibold text-gray-950">{display}</span>
          {price && <span className="ml-1.5">· {price}</span>}
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
      <div className="-mt-1 flex justify-between text-xs text-gray-500">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  );
}

/* ------------------------------ Quantity ------------------------------- */

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

/* -------------------------------- Notice ------------------------------- */

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

/* ------------------------------ FlashValue ----------------------------- */

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

/* ------------------------------- Skeleton ------------------------------ */

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
