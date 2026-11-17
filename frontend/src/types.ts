// Shared domain types for the Cloudoon checkout prototype.

export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'KES';
export type Cycle = 1 | 12 | 24 | 36;
export type Step = 1 | 2 | 3;
export type ProductCategory = 'shared' | 'vps' | 'dedicated' | 'cloud';
export type OsId = 'ubuntu' | 'almalinux' | 'windows';
export type SslOption = 'free' | 'wildcard' | 'ov';
export type DomainMode = 'register' | 'transfer' | 'existing';

export interface SharedConfig {
  planId: string;
}

export interface VpsConfig {
  managed: boolean;
  os: OsId;
  cpu: number; // vCPU cores
  ram: number; // GB
  storage: number; // GB NVMe
}

export interface DedicatedConfig {
  serverId: string;
  locationId: string;
  bandwidthId: string;
}

export interface CloudConfig {
  sizeId: string;
  scalingId: string;
  kubernetes: boolean;
  k8sLoadBalancer: boolean;
  k8sRegistry: boolean;
}

export interface DomainItem {
  id: string;
  name: string; // full name, e.g. "mybrand.com"
  tld: string; // e.g. ".com"
  mode: DomainMode;
  autoRenew: boolean;
  privacy: boolean;
  authCode?: string;
}

export interface AddonState {
  backups: boolean;
  ssl: SslOption;
  emailBoxes: number;
  ddosAdvanced: boolean;
  cdn: boolean;
}

export interface CartState {
  category: ProductCategory;
  shared: SharedConfig;
  vps: VpsConfig;
  dedicated: DedicatedConfig;
  cloud: CloudConfig;
  cycle: Cycle;
  currency: CurrencyCode;
  domains: DomainItem[];
  addons: AddonState;
  promoCode: string | null;
  country: string; // ISO code used for tax
}

export interface LineItem {
  id: string;
  kind: 'hosting' | 'domain' | 'addon';
  title: string;
  details: string[];
  termLabel: string; // "36 months", "1 year"
  dueToday: number; // amount charged now (after intro discount, before promo)
  regularPrice: number; // what the same term would cost at the regular rate
  renewal: { amount: number; label: string } | null; // null = no recurring charge
  badge?: string; // e.g. "Free 1st year"
  removable: boolean;
  autoRenew?: boolean;
}

export interface Quote {
  lines: LineItem[];
  subtotal: number;
  savings: number; // intro + free-domain savings vs regular price
  promo: { code: string; label: string; amount: number } | null;
  taxRate: number;
  taxLabel: string;
  tax: number;
  total: number;
}

export interface BillingDetails {
  fullName: string;
  email: string;
  phone: string;
  country: string;
  address: string;
  city: string;
  postalCode: string;
  isBusiness: boolean;
  company: string;
  taxId: string;
}

export type AuthMode = 'signup' | 'guest' | 'login';

export interface Account {
  name: string;
  email: string;
  provider: 'password' | 'google' | 'github' | 'sso' | 'guest' | 'signup';
}
