// The only module that talks to the backend. Components call these typed functions.

import type {
  Account, AddressSuggestion, AuthProvider, BillingDetails, CartState, Catalog, CheckoutConfig, Cycle, DomainResult, Order, PaymentInput,
  Quote, SignInMethod,
} from './types';

/** Deployed API. Override with VITE_API_URL (e.g. http://localhost:8000 for local development). */
const DEFAULT_API_URL = 'https://cloudoon-checkout-api.onrender.com';
export const API_URL: string = ((import.meta as { env?: Record<string, string> }).env?.VITE_API_URL || DEFAULT_API_URL).replace(/\/$/, '');

export class ApiError extends Error {
  constructor(public status: number, message: string, public field?: string, public errors?: unknown) {
    super(message);
  }
}

let authToken: string | undefined;
export const setAuthToken = (token: string | undefined) => {
  authToken = token;
};

async function request<T>(method: string, path: string, body?: unknown, headers: Record<string, string> = {}, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/v1/${path}`, {
      method,
      signal,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...(authToken && { Authorization: `Token ${authToken}` }),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    throw new ApiError(0, 'We can’t reach the server. Check your connection and try again.');
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const firstError = data.errors && firstMessage(data.errors);
    throw new ApiError(res.status, data.detail || firstError || 'Something went wrong. Please try again.', data.field, data.errors ?? data);
  }
  return data as T;
}

/** DRF validation errors are nested objects of string arrays; surface the first readable one. */
function firstMessage(errors: unknown): string | undefined {
  if (typeof errors === 'string') return errors;
  if (Array.isArray(errors)) return errors.map(firstMessage).find(Boolean);
  if (errors && typeof errors === 'object') return Object.values(errors).map(firstMessage).find(Boolean);
  return undefined;
}

interface SessionResponse {
  token: string;
  user: { name: string; email: string; provider: AuthProvider };
}

const toAccount = (r: SessionResponse): Account => ({ ...r.user, token: r.token });

export const api = {
  config: () => request<CheckoutConfig>('GET', 'config/'),

  catalog: (currency: string, cycle: Cycle, signal?: AbortSignal) =>
    request<Catalog>('GET', `catalog/?currency=${encodeURIComponent(currency)}&cycle=${cycle}`, undefined, {}, signal),

  quote: (cart: CartState, signal?: AbortSignal) => request<Quote>('POST', 'quote/', cart, {}, signal),

  validatePromo: (code: string) => request<{ code: string; label: string }>('POST', 'promos/validate/', { code }),

  checkDomain: (q: string) =>
    request<{ exact: DomainResult; suggestions: DomainResult[] }>('GET', `domains/check/?q=${encodeURIComponent(q)}`),

  addresses: (q: string, country: string, signal?: AbortSignal) =>
    request<{ results: AddressSuggestion[] }>(
      'GET', `addresses/?q=${encodeURIComponent(q)}&country=${encodeURIComponent(country)}`, undefined, {}, signal,
    ),

  register: async (email: string, password: string, fullName: string) =>
    toAccount(await request<SessionResponse>('POST', 'auth/register/', { email, password, full_name: fullName })),

  login: async (email: string, password: string) => toAccount(await request<SessionResponse>('POST', 'auth/login/', { email, password })),

  /** Where the sign-in popup starts; the backend redirects it to Google or GitHub. */
  oauthStartUrl: (method: SignInMethod, nonce: string, email?: string) =>
    `${API_URL}/api/v1/auth/oauth/${method}/start/?nonce=${nonce}${email ? `&email=${encodeURIComponent(email)}` : ''}`,

  /** Polled while the popup is open: null until the customer finishes signing in. */
  oauthResult: async (nonce: string) => {
    const r = await request<SessionResponse | { status: 'waiting' }>('POST', 'auth/oauth/result/', { nonce });
    return 'token' in r ? toAccount(r) : null;
  },

  logout: () => request<void>('POST', 'auth/logout/'),

  passwordReset: (email: string) => request<{ detail: string }>('POST', 'auth/password-reset/', { email }),

  createOrder: (
    payload: { cart: CartState; billing: Omit<BillingDetails, 'is_business'>; payment: PaymentInput; accept_terms: boolean },
    idempotencyKey: string,
  ) => request<Order>('POST', 'orders/', payload, { 'Idempotency-Key': idempotencyKey }),

  /** PayPal order for the server-priced total; PayPal's button then asks the customer to approve it. */
  createPayPalOrder: (cart: CartState) => request<{ id: string }>('POST', 'payments/paypal/orders/', { cart }),
};
