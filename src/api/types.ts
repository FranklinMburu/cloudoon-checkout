// Types for the Cloudoon REST API (/api/v1). Field names match the backend (snake_case).
// Money is always a decimal string, e.g. "86.28" — never a float.

export type Money = string;
export type CurrencyCode = string;
export type Cycle = 1 | 12 | 24 | 36;
export type ProductCategory = 'shared' | 'vps' | 'dedicated' | 'cloud';
export type DomainMode = 'register' | 'transfer' | 'existing';

/* --------------------------------- Cart --------------------------------- */

export interface CartState {
  category: ProductCategory | 'none'; // 'none': a domain-only order (hosting removed from the summary)
  shared: { plan: string };
  vps: { managed: boolean; os: string; cpu: number; ram: number; storage: number };
  dedicated: { server: string; location: string; bandwidth: string };
  cloud: { size: string; scaling: string; kubernetes: boolean; k8s_load_balancer: boolean; k8s_registry: boolean };
  cycle: Cycle;
  currency: CurrencyCode;
  country: string;
  promo_code: string | null;
  domains: DomainItem[];
  addons: { backups: boolean; ssl: string; email_boxes: number; ddos_advanced: boolean; cdn: boolean };
}

export interface DomainItem {
  name: string;
  mode: DomainMode;
  auto_renew: boolean;
  privacy: boolean;
}

/* -------------------------------- Catalog ------------------------------- */

export interface Catalog {
  currency: { code: CurrencyCode; name: string; symbol: string; decimals: number };
  currencies: { code: CurrencyCode; name: string; symbol: string }[];
  countries: { code: string; name: string; tax_name: string; tax_rate: string; currency: CurrencyCode }[];
  cycles: Cycle[];
  categories: { slug: ProductCategory; name: string; tagline: string }[];
  shared_plans: { slug: string; name: string; description: string; features: string[]; is_popular: boolean; discount: string; monthly: Money; regular_monthly: Money }[];
  vps: {
    managed_fee: Money;
    per_cpu: Money;
    per_ram_gb: Money;
    per_100gb_storage: Money;
    cpu: { min: number; max: number };
    ram_steps: number[];
    storage: { min: number; max: number; step: number };
    managed_features: string[];
    unmanaged_features: string[];
    operating_systems: { slug: string; name: string; version: string; monthly: Money; min_cpu: number; min_ram_gb: number }[];
  };
  dedicated: {
    datacenters: { slug: string; city: string; country: string }[];
    servers: { slug: string; name: string; cpu: string; ram: string; storage: string; monthly: Money; out_of_stock_at: string[] }[];
    bandwidth: { slug: string; name: string; monthly: Money; is_default: boolean }[];
  };
  cloud: {
    sizes: { slug: string; name: string; cpu: number; ram_gb: number; storage_gb: number; monthly: Money }[];
    scaling_presets: { slug: string; name: string; min: number; max: number; description: string }[];
  };
  addons: { slug: string; name: string; description: string; monthly: Money }[];
  ssl_options: { slug: string; name: string; description: string; monthly: Money }[];
  tlds: { tld: string; register: Money; renew: Money; transfer: Money; privacy_supported: boolean; free_with_hosting: boolean }[];
  limits: { max_domains: number; max_mailboxes: number };
  nameservers: string[];
  default_cart: CartState;
}

/* --------------------------------- Quote -------------------------------- */

export interface LineItem {
  id: string;
  kind: 'hosting' | 'domain' | 'addon';
  title: string;
  details: string[];
  term_label: string;
  due_today: Money;
  regular_price: Money;
  renewal: { amount: Money; label: string } | null;
  badge: string | null;
  removable: boolean;
  auto_renew: boolean | null;
}

export interface CycleOption {
  months: Cycle;
  discount: string;
  monthly: Money;
  regular_monthly: Money;
  total: Money;
}

export interface Quote {
  currency: CurrencyCode;
  cycle: Cycle;
  lines: LineItem[];
  subtotal: Money;
  savings: Money;
  promo: { code: string; label: string; amount: Money } | null;
  promo_error: string | null;
  tax_rate: string;
  tax_label: string;
  tax: Money;
  total: Money;
  cycle_options: CycleOption[];
  free_domain: { eligible: boolean; applied_to: string | null };
  cloud_burst_hourly: string | null;
}

/* ------------------------------ Other calls ----------------------------- */

export interface DomainResult {
  name: string;
  tld: string;
  available: boolean;
}

export interface AddressSuggestion {
  line: string;
  city: string;
  postal_code: string;
  country: string;
}

export type AuthProvider = 'password' | 'signup' | 'guest' | 'google' | 'github' | 'sso';

export interface Account {
  name: string;
  email: string;
  provider: AuthProvider;
  token?: string; // absent for guest checkout
}

export interface BillingDetails {
  full_name: string;
  email: string;
  phone: string;
  country: string;
  address: string;
  city: string;
  postal_code: string;
  is_business: boolean;
  company: string;
  tax_id: string;
}

export type PaymentMethod = 'card' | 'mpesa' | 'paypal';

export interface PaymentInput {
  method: PaymentMethod;
  payment_method?: string; // card: Stripe PaymentMethod id from Stripe.js
  brand?: string;
  last4?: string;
  phone?: string; // mpesa
  paypal_order_id?: string; // paypal: the order approved in PayPal's window
}

export type SignInMethod = 'google' | 'github' | 'sso';

/** GET /config/: what the backend has switched on, plus public keys for the browser SDKs. */
export interface CheckoutConfig {
  sign_in: SignInMethod[];
  payments: {
    methods: PaymentMethod[];
    stripe_publishable_key: string;
    paypal_client_id: string;
    paypal_currencies: CurrencyCode[];
  };
}

export interface Order {
  reference: string;
  number: string;
  status: 'pending' | 'paid' | 'failed';
  email: string;
  currency: CurrencyCode;
  cycle_months: number;
  subtotal: Money;
  discount: Money;
  promo_code: string;
  tax: Money;
  tax_label: string;
  total: Money;
  payment_label: string;
  payment_error: string;
  created_at: string;
  items: {
    line_id: string;
    kind: string;
    title: string;
    details: string[];
    term_label: string;
    due_today: Money;
    regular_price: Money;
    renewal_amount: Money | null;
    renewal_label: string;
    auto_renew: boolean | null;
  }[];
}
