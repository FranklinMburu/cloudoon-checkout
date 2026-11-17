// Stripe.js, loaded from Stripe (it must never be bundled or self-hosted).
// Only the small part of its API this checkout uses is typed here.

import { loadScript } from './loadScript';

export interface StripeChangeEvent {
  complete: boolean;
  empty: boolean;
  error?: { message: string };
}

export interface StripeElement {
  mount(target: HTMLElement): void;
  destroy(): void;
  focus(): void;
  on(event: 'change', handler: (e: StripeChangeEvent) => void): void;
  on(event: 'focus' | 'blur' | 'ready', handler: () => void): void;
}

export interface Stripe {
  elements(options?: object): { create(type: 'cardNumber' | 'cardExpiry' | 'cardCvc', options?: object): StripeElement };
  createPaymentMethod(data: {
    type: 'card';
    card: StripeElement;
    billing_details?: { name?: string; email?: string; phone?: string };
  }): Promise<{ paymentMethod?: { id: string; card?: { brand: string; last4: string } }; error?: { message?: string } }>;
}

declare global {
  interface Window {
    Stripe?: (publishableKey: string) => Stripe;
  }
}

const instances = new Map<string, Promise<Stripe>>();

export function loadStripe(publishableKey: string): Promise<Stripe> {
  let stripe = instances.get(publishableKey);
  if (!stripe) {
    stripe = loadScript('https://js.stripe.com/v3/').then(() => window.Stripe!(publishableKey));
    stripe.catch(() => instances.delete(publishableKey));
    instances.set(publishableKey, stripe);
  }
  return stripe;
}
