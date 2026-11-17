// Buttons. Accent is reserved for the single conversion action on a screen.

import { type ButtonHTMLAttributes, type Ref } from 'react';
import { Spinner } from '../icons';
import { control, cx, focusRing } from './styles';

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
