// SIMULATED card tokenization (stands in for Stripe.js).
// In production the card number goes straight from the browser to the payment provider,
// which returns a one-time token; our backend only ever sees the token, brand and last 4 digits.

import { cardBrand } from '../lib/validation';

export function tokenizeCard(cardNumber: string) {
  const digits = cardNumber.replace(/\D/g, '');
  const brand = cardBrand(digits) ?? 'Card';
  const token = digits === '4000000000000002' ? 'tok_chargeDeclined' : `tok_${brand.toLowerCase().replace(/\s+/g, '_')}`;
  return { token, brand, last4: digits.slice(-4) };
}
