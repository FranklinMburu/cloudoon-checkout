// App state: the cart (what is being bought) and the checkout (who is buying).
// Both persist to localStorage, so a refresh or a login never loses the order.
// Passwords and card details are never stored.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { OS_OPTIONS, VPS_LIMITS } from '../data/catalog';
import { buildQuote } from '../lib/pricing';
import type { Account, BillingDetails, CartState, DomainItem, Quote, Step, VpsConfig } from '../types';

const CART_KEY = 'cloudoon.cart.v1';
const CHECKOUT_KEY = 'cloudoon.checkout.v1';

export const DEFAULT_CART: CartState = {
  category: 'shared',
  shared: { planId: 'wordpress' },
  vps: { managed: true, os: 'ubuntu', cpu: 2, ram: 4, storage: 80 },
  dedicated: { serverId: 'epyc-4344p', locationId: 'nbo', bandwidthId: 'bw-10' },
  cloud: { sizeId: 'c2', scalingId: 'balanced', kubernetes: false, k8sLoadBalancer: true, k8sRegistry: false },
  cycle: 12,
  currency: 'USD',
  domains: [],
  addons: { backups: false, ssl: 'free', emailBoxes: 0, ddosAdvanced: false, cdn: false },
  promoCode: null,
  country: 'KE',
};

export const EMPTY_BILLING: BillingDetails = {
  fullName: '',
  email: '',
  phone: '',
  country: 'KE',
  address: '',
  city: '',
  postalCode: '',
  isBusiness: false,
  company: '',
  taxId: '',
};

interface CheckoutState {
  step: Step;
  account: Account | null;
  billing: BillingDetails;
}

const DEFAULT_CHECKOUT: CheckoutState = { step: 1, account: null, billing: EMPTY_BILLING };

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable (private mode) — state still works in memory */
  }
}

/** Keep VPS resources valid for the chosen OS (e.g. Windows needs 2 vCPU / 4 GB). */
export function fitVpsToOs(v: VpsConfig): VpsConfig {
  const os = OS_OPTIONS.find((o) => o.id === v.os)!;
  return {
    ...v,
    cpu: Math.max(v.cpu, os.minCpu),
    ram: Math.max(v.ram, os.minRam),
    storage: Math.min(Math.max(v.storage, VPS_LIMITS.storage.min), VPS_LIMITS.storage.max),
  };
}

interface Store {
  cart: CartState;
  quote: Quote;
  update: (patch: Partial<CartState> | ((c: CartState) => Partial<CartState>)) => void;
  addDomain: (d: Omit<DomainItem, 'id'>) => void;
  updateDomain: (id: string, patch: Partial<DomainItem>) => void;
  removeLine: (lineId: string) => void;
  checkout: CheckoutState;
  setStep: (s: Step) => void;
  setAccount: (a: Account | null) => void;
  setBilling: (patch: Partial<BillingDetails>) => void;
  resetAll: () => void;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartState>(() => load(CART_KEY, DEFAULT_CART));
  const [checkout, setCheckout] = useState<CheckoutState>(() => load(CHECKOUT_KEY, DEFAULT_CHECKOUT));

  useEffect(() => save(CART_KEY, cart), [cart]);
  useEffect(() => save(CHECKOUT_KEY, checkout), [checkout]);

  const quote = useMemo(() => buildQuote(cart), [cart]);

  const update: Store['update'] = useCallback((patch) => {
    setCart((c) => ({ ...c, ...(typeof patch === 'function' ? patch(c) : patch) }));
  }, []);

  const addDomain: Store['addDomain'] = useCallback((d) => {
    setCart((c) =>
      c.domains.some((x) => x.name === d.name)
        ? c
        : { ...c, domains: [...c.domains, { ...d, id: `${d.name}-${Date.now().toString(36)}` }] },
    );
  }, []);

  const updateDomain: Store['updateDomain'] = useCallback((id, patch) => {
    setCart((c) => ({ ...c, domains: c.domains.map((d) => (d.id === id ? { ...d, ...patch } : d)) }));
  }, []);

  /** Remove a summary line. Add-ons are switched back to their free default. */
  const removeLine: Store['removeLine'] = useCallback((lineId) => {
    setCart((c) => {
      if (lineId.startsWith('domain:')) {
        const id = lineId.slice('domain:'.length);
        return { ...c, domains: c.domains.filter((d) => d.id !== id) };
      }
      const a = c.addons;
      switch (lineId) {
        case 'addon:backups': return { ...c, addons: { ...a, backups: false } };
        case 'addon:ssl': return { ...c, addons: { ...a, ssl: 'free' } };
        case 'addon:email': return { ...c, addons: { ...a, emailBoxes: 0 } };
        case 'addon:ddos': return { ...c, addons: { ...a, ddosAdvanced: false } };
        case 'addon:cdn': return { ...c, addons: { ...a, cdn: false } };
        case 'addon:bandwidth': return { ...c, dedicated: { ...c.dedicated, bandwidthId: 'bw-10' } };
        case 'addon:k8s': return { ...c, cloud: { ...c.cloud, kubernetes: false } };
        case 'addon:k8s-lb': return { ...c, cloud: { ...c.cloud, k8sLoadBalancer: false } };
        case 'addon:k8s-registry': return { ...c, cloud: { ...c.cloud, k8sRegistry: false } };
        default: return c;
      }
    });
  }, []);

  const setStep = useCallback((step: Step) => setCheckout((s) => ({ ...s, step })), []);
  const setAccount = useCallback((account: Account | null) => setCheckout((s) => ({ ...s, account })), []);
  const setBilling = useCallback((patch: Partial<BillingDetails>) => {
    setCheckout((s) => ({ ...s, billing: { ...s.billing, ...patch } }));
    // The billing country drives the tax estimate in the summary.
    if (patch.country) setCart((c) => ({ ...c, country: patch.country! }));
  }, []);

  const resetAll = useCallback(() => {
    setCart(DEFAULT_CART);
    setCheckout(DEFAULT_CHECKOUT);
  }, []);

  const value = useMemo(
    () => ({ cart, quote, update, addDomain, updateDomain, removeLine, checkout, setStep, setAccount, setBilling, resetAll }),
    [cart, quote, update, addDomain, updateDomain, removeLine, checkout, setStep, setAccount, setBilling, resetAll],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx;
}
