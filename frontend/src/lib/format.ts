// Display formatting only — every amount comes from the API as a decimal string.

const LOCALES: Record<string, string> = { USD: 'en-US', EUR: 'de-DE', GBP: 'en-GB', KES: 'en-KE' };
const cache = new Map<string, Intl.NumberFormat>();

/** Locale-aware money: "$1,234.56", "1.234,56 €", "£1,234.56", "Ksh 1,235". */
export function money(amount: string | number, code: string, decimals: number) {
  const key = `${code}:${decimals}`;
  if (!cache.has(key)) {
    cache.set(
      key,
      new Intl.NumberFormat(LOCALES[code] ?? 'en-US', {
        style: 'currency',
        currency: code,
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }),
    );
  }
  return cache.get(key)!.format(Number(amount));
}

export const toNumber = (amount: string | number | null | undefined) => Number(amount ?? 0);
