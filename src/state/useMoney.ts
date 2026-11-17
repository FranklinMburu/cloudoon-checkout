import { useCallback } from 'react';
import { money } from '../lib/format';
import { useStore } from './store';

/** Formats API amounts in the catalog's current currency. */
export function useMoney() {
  const { catalog } = useStore();
  const { code, decimals } = catalog.currency;
  const fmt = useCallback((amount: string | number) => money(amount, code, decimals), [code, decimals]);
  /** For small hourly rates (e.g. cloud burst pricing). */
  const fmtPrecise = useCallback((amount: string | number) => money(amount, code, 3), [code]);
  return { fmt, fmtPrecise, currency: code };
}
