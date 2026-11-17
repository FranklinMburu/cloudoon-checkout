// Shared class helpers used by every component.

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

/** Height for every interactive control: 44px on phones, 40px from `sm` up. */
export const control = 'min-h-11 sm:min-h-10';
export const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2';
