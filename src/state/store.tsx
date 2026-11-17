// App state. The backend owns all data and money; this store only keeps:
//   - the cart (what the customer picked) — localStorage, so a refresh or login never loses it
//   - the latest catalog and quote returned by the API
//   - checkout progress — sessionStorage, so personal details don't outlive the tab

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ApiError, api, setAuthToken } from '../api/client';
import type { Account, BillingDetails, CartState, Catalog, DomainItem, Order, Quote } from '../api/types';

const CART_KEY = 'cloudoon.cart.v2';
const CHECKOUT_KEY = 'cloudoon.checkout.v2';

export type Step = 1 | 2 | 3;

export const EMPTY_BILLING: BillingDetails = {
  full_name: '', email: '', phone: '', country: 'KE', address: '', city: '', postal_code: '', is_business: false, company: '', tax_id: '',
};

interface CheckoutState {
  step: Step;
  account: Account | null;
  billing: BillingDetails;
  order: Order | null;
}

const DEFAULT_CHECKOUT: CheckoutState = { step: 1, account: null, billing: EMPTY_BILLING, order: null };

function read<T>(storage: Storage, key: string): T | null {
  try {
    const raw = storage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(storage: Storage, key: string, value: unknown) {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable (private mode): state still works in memory */
  }
}

/** A saved cart from an older version may reference products that no longer exist. */
function isUsable(cart: CartState | null, catalog: Catalog): cart is CartState {
  if (!cart || typeof cart !== 'object') return false;
  const has = <T,>(list: T[], pred: (x: T) => boolean) => list.some(pred);
  try {
    return (
      has(catalog.categories, (c) => c.slug === cart.category) &&
      has(catalog.shared_plans, (p) => p.slug === cart.shared.plan) &&
      has(catalog.vps.operating_systems, (o) => o.slug === cart.vps.os) &&
      has(catalog.dedicated.servers, (s) => s.slug === cart.dedicated.server) &&
      has(catalog.dedicated.datacenters, (d) => d.slug === cart.dedicated.location) &&
      has(catalog.dedicated.bandwidth, (b) => b.slug === cart.dedicated.bandwidth) &&
      has(catalog.cloud.sizes, (s) => s.slug === cart.cloud.size) &&
      has(catalog.cloud.scaling_presets, (s) => s.slug === cart.cloud.scaling) &&
      has(catalog.ssl_options, (s) => s.slug === cart.addons.ssl) &&
      has(catalog.currencies, (c) => c.code === cart.currency) &&
      has(catalog.countries, (c) => c.code === cart.country) &&
      catalog.cycles.includes(cart.cycle) &&
      Array.isArray(cart.domains)
    );
  } catch {
    return false;
  }
}

interface Store {
  catalog: Catalog | null;
  catalogError: ApiError | null;
  retryCatalog: () => void;
  cart: CartState;
  quote: Quote | null;
  quoting: boolean;
  quoteError: string | null;
  update: (patch: Partial<CartState> | ((c: CartState) => Partial<CartState>)) => void;
  addDomain: (d: DomainItem) => void;
  updateDomain: (name: string, patch: Partial<DomainItem>) => void;
  removeLine: (lineId: string) => void;
  checkout: CheckoutState;
  setStep: (s: Step) => void;
  setAccount: (a: Account | null) => void;
  setBilling: (patch: Partial<BillingDetails>) => void;
  completeOrder: (order: Order) => void;
  resetAll: () => void;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const saved = useRef<CartState | null>(read<CartState>(localStorage, CART_KEY));
  const [cart, setCart] = useState<CartState | null>(null);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [catalogError, setCatalogError] = useState<ApiError | null>(null);
  const [catalogAttempt, setCatalogAttempt] = useState(0);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [checkout, setCheckout] = useState<CheckoutState>(() => ({ ...DEFAULT_CHECKOUT, ...read<CheckoutState>(sessionStorage, CHECKOUT_KEY) }));

  // Catalog prices depend on currency and billing period, so refetch when either changes.
  const currency = cart?.currency ?? saved.current?.currency ?? 'USD';
  const cycle = cart?.cycle ?? saved.current?.cycle ?? 12;
  useEffect(() => {
    const ctrl = new AbortController();
    setCatalogError(null);
    api
      .catalog(currency, cycle, ctrl.signal)
      .then((c) => {
        setCatalog(c);
        // First load: restore the saved cart if it still matches the catalog, otherwise start from the server's defaults.
        setCart((current) => current ?? (isUsable(saved.current, c) ? saved.current : c.default_cart));
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        if (err instanceof ApiError && err.status === 400 && saved.current) {
          saved.current = null; // stale currency/cycle in storage: retry with defaults
          setCatalogAttempt((n) => n + 1);
          return;
        }
        setCatalogError(err);
      });
    return () => ctrl.abort();
  }, [currency, cycle, catalogAttempt]);

  // Every cart change is re-priced by the server (debounced; the last quote stays visible meanwhile).
  useEffect(() => {
    if (!cart) return;
    write(localStorage, CART_KEY, cart);
    const ctrl = new AbortController();
    setQuoting(true);
    const t = setTimeout(() => {
      api
        .quote(cart, ctrl.signal)
        .then((q) => {
          setQuote(q);
          setQuoteError(null);
          setQuoting(false);
        })
        .catch((err) => {
          if (err.name === 'AbortError') return;
          setQuoteError(err.message);
          setQuoting(false);
        });
    }, 120);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [cart]);

  useEffect(() => {
    write(sessionStorage, CHECKOUT_KEY, checkout);
    setAuthToken(checkout.account?.token);
  }, [checkout]);

  const update: Store['update'] = useCallback((patch) => {
    setCart((c) => (c ? { ...c, ...(typeof patch === 'function' ? patch(c) : patch) } : c));
  }, []);

  const addDomain: Store['addDomain'] = useCallback((d) => {
    setCart((c) => (c && !c.domains.some((x) => x.name === d.name) ? { ...c, domains: [...c.domains, d] } : c));
  }, []);

  const updateDomain: Store['updateDomain'] = useCallback((name, patch) => {
    setCart((c) => (c ? { ...c, domains: c.domains.map((d) => (d.name === name ? { ...d, ...patch } : d)) } : c));
  }, []);

  const catalogDefaultBandwidth = useRef('bw-10');
  useEffect(() => {
    if (catalog) catalogDefaultBandwidth.current = catalog.dedicated.bandwidth.find((b) => b.is_default)?.slug ?? catalogDefaultBandwidth.current;
  }, [catalog]);

  /** Remove a summary line. Add-ons switch back to their free default; line ids come from the API. */
  const removeLine: Store['removeLine'] = useCallback((lineId) => {
    setCart((c) => {
      if (!c) return c;
      if (lineId.startsWith('domain:')) return { ...c, domains: c.domains.filter((d) => d.name !== lineId.slice(7)) };
      const a = c.addons;
      switch (lineId) {
        case 'addon:backups': return { ...c, addons: { ...a, backups: false } };
        case 'addon:ssl': return { ...c, addons: { ...a, ssl: 'free' } };
        case 'addon:email': return { ...c, addons: { ...a, email_boxes: 0 } };
        case 'addon:ddos': return { ...c, addons: { ...a, ddos_advanced: false } };
        case 'addon:cdn': return { ...c, addons: { ...a, cdn: false } };
        case 'addon:bandwidth': return { ...c, dedicated: { ...c.dedicated, bandwidth: catalogDefaultBandwidth.current } };
        case 'addon:k8s': return { ...c, cloud: { ...c.cloud, kubernetes: false } };
        case 'addon:k8s-lb': return { ...c, cloud: { ...c.cloud, k8s_load_balancer: false } };
        case 'addon:k8s-registry': return { ...c, cloud: { ...c.cloud, k8s_registry: false } };
        default: return c;
      }
    });
  }, []);

  const setStep = useCallback((step: Step) => setCheckout((s) => ({ ...s, step })), []);
  const setAccount = useCallback((account: Account | null) => setCheckout((s) => ({ ...s, account })), []);
  const setBilling = useCallback((patch: Partial<BillingDetails>) => {
    setCheckout((s) => ({ ...s, billing: { ...s.billing, ...patch } }));
    // The billing country decides the tax rate in the quote.
    if (patch.country) setCart((c) => (c ? { ...c, country: patch.country! } : c));
  }, []);

  /** After payment: keep the receipt (survives refresh), empty the cart so nothing can be paid twice. */
  const completeOrder = useCallback((order: Order) => {
    setCheckout((s) => ({ ...s, order, step: 1 }));
    setCart((c) => (catalog ? { ...catalog.default_cart, currency: c?.currency ?? 'USD' } : c));
    try {
      localStorage.removeItem(CART_KEY);
    } catch {
      /* ignore */
    }
  }, [catalog]);

  const resetAll = useCallback(() => {
    if (catalog) setCart(catalog.default_cart);
    setCheckout(DEFAULT_CHECKOUT);
  }, [catalog]);

  const value = useMemo<Store | null>(
    () =>
      cart
        ? {
            catalog, catalogError, retryCatalog: () => setCatalogAttempt((n) => n + 1),
            cart, quote, quoting, quoteError, update, addDomain, updateDomain, removeLine,
            checkout, setStep, setAccount, setBilling, completeOrder, resetAll,
          }
        : null,
    [catalog, catalogError, cart, quote, quoting, quoteError, update, addDomain, updateDomain, removeLine, checkout, setStep, setAccount, setBilling, completeOrder, resetAll],
  );

  if (!value || !catalog) {
    return <BootScreen error={catalogError} onRetry={() => setCatalogAttempt((n) => n + 1)} />;
  }
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx as Store & { catalog: Catalog };
}

/* ------------------------------- Boot screen ------------------------------ */

/** Shown until the catalog arrives. Free hosting sleeps when idle, so the first request can take ~50s. */
function BootScreen({ error, onRetry }: { error: ApiError | null; onRetry: () => void }) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 4000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="h-14 border-b border-gray-200 bg-white" />
      <div className="mx-auto grid max-w-6xl gap-8 px-4 pt-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4" aria-busy={!error}>
          {error ? (
            <div role="alert" className="rounded-xl border border-gray-200 bg-white p-6">
              <p className="text-base font-semibold text-gray-950">We couldn’t load the store</p>
              <p className="mt-1 text-sm text-gray-600">{error.message}</p>
              <button type="button" onClick={onRetry} className="mt-4 min-h-11 rounded-lg bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700 sm:min-h-10">
                Try again
              </button>
            </div>
          ) : (
            <>
              <div className="h-6 w-48 animate-pulse rounded bg-gray-200" />
              <div className="h-8 w-72 animate-pulse rounded bg-gray-200" />
              <div className="h-64 animate-pulse rounded-xl bg-gray-200" />
              <div className="h-40 animate-pulse rounded-xl bg-gray-200" />
              <p className="text-sm text-gray-600" role="status">
                {slow ? 'Starting the server — this can take up to a minute on first visit…' : 'Loading plans and prices…'}
              </p>
            </>
          )}
        </div>
        <div className="hidden h-96 animate-pulse rounded-xl bg-gray-200 lg:block" />
      </div>
    </div>
  );
}
