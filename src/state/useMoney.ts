import { useCallback } from 'react';
import { money } from '../lib/format';
import { convert } from '../lib/pricing';
import { useStore } from './store';

/** Formatting helpers bound to the cart's current currency. */
export function useMoney() {
  const { cart } = useStore();
  const cur = cart.currency;
  /** Format an amount already in the cart currency. */
  const fmt = useCallback((amount: number, precise = false) => money(amount, cur, precise), [cur]);
  /** Convert a USD catalog price and format it. */
  const usd = useCallback((amountUsd: number) => money(convert(amountUsd, cur), cur), [cur]);
  return { fmt, usd, currency: cur };
}
