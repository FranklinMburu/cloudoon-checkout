import type { CurrencyCode } from '../types';
import { getCurrency } from './pricing';

const cache = new Map<string, Intl.NumberFormat>();

function formatter(code: CurrencyCode, decimals: number) {
  const key = `${code}:${decimals}`;
  if (!cache.has(key)) {
    cache.set(
      key,
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: code,
        currencyDisplay: code === 'KES' ? 'code' : 'symbol',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }),
    );
  }
  return cache.get(key)!;
}

/** "$107.64", "€99.03", "KES 13,880". Pass `precise` for small hourly rates. */
export function money(amount: number, code: CurrencyCode, precise = false) {
  const decimals = precise ? 3 : getCurrency(code).decimals;
  // Narrow no-break space after "KES" keeps the code attached to the number.
  return formatter(code, decimals).format(amount).replace(/^KES\s?/, 'KES ');
}

export const pct = (fraction: number) => `${Math.round(fraction * 100)}%`;
