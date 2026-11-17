// Form fields with label, hint, inline error and valid state.

import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';
import { Alert, Check, ChevronDown } from '../icons';
import { control, cx } from './styles';

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
