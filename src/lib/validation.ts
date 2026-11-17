// Field validators. Each returns an error message, or '' when the value is valid.

export const required = (label: string) => (v: string) => (v.trim() ? '' : `Enter your ${label}.`);

export function email(v: string) {
  if (!v.trim()) return 'Enter your email address.';
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Enter an email like name@company.com.';
}

export function fullName(v: string) {
  if (!v.trim()) return 'Enter your full name.';
  return v.trim().split(/\s+/).length >= 2 ? '' : 'Enter your first and last name.';
}

export function phone(v: string) {
  const digits = v.replace(/[^\d]/g, '');
  if (!digits) return 'Enter your phone number.';
  return digits.length >= 9 && digits.length <= 15 ? '' : 'Enter a valid phone number, including country code.';
}

/* ------------------------------ Passwords ------------------------------ */

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  label: 'Too short' | 'Weak' | 'Fair' | 'Good' | 'Strong';
  checks: { label: string; met: boolean }[];
}

export function passwordStrength(v: string): PasswordStrength {
  const checks = [
    { label: 'At least 8 characters', met: v.length >= 8 },
    { label: 'Upper & lower case letters', met: /[a-z]/.test(v) && /[A-Z]/.test(v) },
    { label: 'A number', met: /\d/.test(v) },
    { label: 'A symbol (e.g. ! ? #)', met: /[^A-Za-z0-9]/.test(v) },
  ];
  if (v.length < 8) return { score: 0, label: 'Too short', checks };
  const met = checks.filter((c) => c.met).length; // 1–4, length is always met here
  const lengthBonus = v.length >= 14 ? 1 : 0;
  const score = Math.min(4, met + lengthBonus) as PasswordStrength['score'];
  const labels = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'] as const;
  return { score, label: labels[score], checks };
}

export function password(v: string) {
  if (!v) return 'Create a password.';
  return passwordStrength(v).score >= 2 ? '' : 'Use at least 8 characters with a mix of letters, numbers or symbols.';
}

/* -------------------------------- Domains ------------------------------ */

/** Validates the part before the TLD, e.g. "my-brand". */
export function domainLabel(v: string) {
  const s = v.trim().toLowerCase();
  if (!s) return 'Type the name you want, e.g. mybrand.';
  if (s.length < 2) return 'Use at least 2 characters.';
  if (s.length > 63) return 'Use 63 characters or fewer.';
  if (!/^[a-z0-9-]+$/.test(s)) return 'Use letters, numbers and hyphens only — no spaces.';
  if (s.startsWith('-') || s.endsWith('-')) return 'A domain can’t start or end with a hyphen.';
  return '';
}

/** Validates a full domain, e.g. "mybrand.co.ke". */
export function fullDomain(v: string) {
  const s = v.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
  if (!s) return 'Enter your domain, e.g. mybrand.com.';
  if (!/^([a-z0-9-]+\.)+[a-z]{2,}$/.test(s)) return 'Enter a full domain like mybrand.com (without https://).';
  return '';
}

export const normalizeDomain = (v: string) =>
  v.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');

/* -------------------------------- Payment ------------------------------ */

export type CardBrand = 'Visa' | 'Mastercard' | 'American Express' | null;

export function cardBrand(num: string): CardBrand {
  const d = num.replace(/\D/g, '');
  if (/^4/.test(d)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(d)) return 'Mastercard';
  if (/^3[47]/.test(d)) return 'American Express';
  return null;
}

export function formatCardNumber(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 16);
  return d.replace(/(.{4})/g, '$1 ').trim();
}

function luhn(num: string) {
  const d = num.replace(/\D/g, '');
  let sum = 0;
  for (let i = 0; i < d.length; i++) {
    let n = Number(d[d.length - 1 - i]);
    if (i % 2 === 1) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
  }
  return d.length >= 13 && sum % 10 === 0;
}

export function cardNumber(v: string) {
  const d = v.replace(/\D/g, '');
  if (!d) return 'Enter your card number.';
  if (d.length < 15) return 'Your card number is incomplete.';
  return luhn(d) ? '' : 'This card number isn’t valid. Check the digits.';
}

export function formatExpiry(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)} / ${d.slice(2)}` : d;
}

export function expiry(v: string, now = new Date()) {
  const d = v.replace(/\D/g, '');
  if (!d) return 'Enter the expiry date.';
  if (d.length < 4) return 'Use the format MM / YY.';
  const m = Number(d.slice(0, 2));
  const y = 2000 + Number(d.slice(2));
  if (m < 1 || m > 12) return 'Month must be between 01 and 12.';
  const endOfMonth = new Date(y, m, 0, 23, 59, 59);
  return endOfMonth < now ? 'This card has expired.' : '';
}

export function cvc(v: string) {
  const d = v.replace(/\D/g, '');
  if (!d) return 'Enter the 3–4 digit security code.';
  return d.length >= 3 ? '' : 'The security code is 3 or 4 digits.';
}

export function mpesaPhone(v: string) {
  const d = v.replace(/\D/g, '');
  if (!d) return 'Enter your M-Pesa phone number.';
  return /^(?:254|0)?(7|1)\d{8}$/.test(d) ? '' : 'Enter a Safaricom number like 0712 345 678.';
}
