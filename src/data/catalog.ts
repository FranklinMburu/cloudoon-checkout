// Product catalog. All base prices are in USD per month unless stated otherwise.
// Change prices here — every screen and total is derived from this file.

import type { CurrencyCode, Cycle, OsId, ProductCategory, SslOption } from '../types';

/* ----------------------------- Currencies ----------------------------- */

export interface Currency {
  code: CurrencyCode;
  label: string;
  symbol: string;
  rate: number; // units per 1 USD
  decimals: number;
}

export const CURRENCIES: Currency[] = [
  { code: 'USD', label: 'US Dollar', symbol: '$', rate: 1, decimals: 2 },
  { code: 'EUR', label: 'Euro', symbol: '€', rate: 0.92, decimals: 2 },
  { code: 'GBP', label: 'British Pound', symbol: '£', rate: 0.79, decimals: 2 },
  { code: 'KES', label: 'Kenyan Shilling', symbol: 'KSh', rate: 129, decimals: 0 },
];

/* ---------------------------- Billing cycles --------------------------- */

export const CYCLES: Cycle[] = [1, 12, 24, 36];

export const cycleLabel = (c: Cycle) => (c === 1 ? '1 month' : `${c} months`);

/** Intro discount on the hosting product for each billing cycle, per category. */
export const CYCLE_DISCOUNTS: Record<ProductCategory, Record<Cycle, number>> = {
  shared: { 1: 0, 12: 0.2, 24: 0.3, 36: 0.4 },
  vps: { 1: 0, 12: 0.1, 24: 0.15, 36: 0.2 },
  dedicated: { 1: 0, 12: 0.05, 24: 0.1, 36: 0.15 },
  cloud: { 1: 0, 12: 0.1, 24: 0.15, 36: 0.2 },
};

/* ----------------------------- Categories ------------------------------ */

export const CATEGORIES: { id: ProductCategory; label: string; tagline: string }[] = [
  { id: 'shared', label: 'Shared Hosting', tagline: 'Websites & online stores' },
  { id: 'vps', label: 'VPS', tagline: 'Virtual server, root access' },
  { id: 'dedicated', label: 'Dedicated', tagline: 'Your own physical server' },
  { id: 'cloud', label: 'Cloud', tagline: 'Autoscaling & Kubernetes' },
];

/* --------------------------- Shared hosting ---------------------------- */

export interface SharedPlan {
  id: string;
  name: string;
  description: string;
  monthly: number;
  features: string[];
  popular?: boolean;
}

export const SHARED_PLANS: SharedPlan[] = [
  {
    id: 'web',
    name: 'Web',
    description: 'A personal or small business site.',
    monthly: 5.99,
    features: ['1 website', '25 GB NVMe storage', 'Unmetered bandwidth', 'Free SSL certificate', 'Weekly backups'],
  },
  {
    id: 'wordpress',
    name: 'WordPress',
    description: 'WordPress installed and kept updated.',
    monthly: 8.99,
    popular: true,
    features: ['3 websites', '50 GB NVMe storage', 'Unmetered bandwidth', 'Free SSL certificate', 'Automatic WordPress updates', 'Staging site'],
  },
  {
    id: 'woocommerce',
    name: 'WooCommerce',
    description: 'An online store, ready to sell.',
    monthly: 14.99,
    features: ['10 websites', '100 GB NVMe storage', 'Unmetered bandwidth', 'Free SSL certificate', 'WooCommerce pre-installed', 'Double CPU & RAM'],
  },
];

/* --------------------------------- VPS --------------------------------- */

export const VPS_PRICING = {
  perCpu: 4, // per vCPU / month
  perRamGb: 2, // per GB / month
  perStorageGb: 0.05, // per GB NVMe / month
  managed: 25, // management fee / month
};

export const VPS_LIMITS = {
  cpu: { min: 1, max: 16, step: 1 },
  ramSteps: [1, 2, 4, 8, 16, 32, 64],
  storage: { min: 25, max: 800, step: 25 },
};

export interface OsOption {
  id: OsId;
  name: string;
  version: string;
  monthly: number; // licence fee
  minRam: number;
  minCpu: number;
}

export const OS_OPTIONS: OsOption[] = [
  { id: 'ubuntu', name: 'Ubuntu', version: '24.04 LTS', monthly: 0, minRam: 1, minCpu: 1 },
  { id: 'almalinux', name: 'AlmaLinux', version: '9', monthly: 0, minRam: 1, minCpu: 1 },
  { id: 'windows', name: 'Windows Server', version: '2022 Standard', monthly: 18, minRam: 4, minCpu: 2 },
];

export const MANAGED_FEATURES = ['24/7 server monitoring', 'Security patching & updates', 'Control panel installed', 'Expert help with server issues'];
export const UNMANAGED_FEATURES = ['Full root / admin access', 'You install and maintain software', 'Infrastructure support only'];

/* ------------------------------ Dedicated ------------------------------ */

export interface DedicatedServer {
  id: string;
  name: string;
  cpu: string;
  ram: string;
  storage: string;
  monthly: number;
  outOfStock: string[]; // location ids
}

export const DEDICATED_SERVERS: DedicatedServer[] = [
  { id: 'xeon-e', name: 'Intel Xeon E-2388G', cpu: '8 cores / 16 threads · 3.2 GHz', ram: '32 GB DDR4 ECC', storage: '2 × 960 GB NVMe (RAID 1)', monthly: 129, outOfStock: [] },
  { id: 'epyc-4344p', name: 'AMD EPYC 4344P', cpu: '8 cores / 16 threads · 3.8 GHz', ram: '64 GB DDR5 ECC', storage: '2 × 1.92 TB NVMe (RAID 1)', monthly: 179, outOfStock: [] },
  { id: 'epyc-9354p', name: 'AMD EPYC 9354P', cpu: '32 cores / 64 threads · 3.25 GHz', ram: '256 GB DDR5 ECC', storage: '2 × 3.84 TB NVMe (RAID 1)', monthly: 449, outOfStock: ['nbo'] },
];

export const LOCATIONS = [
  { id: 'nbo', city: 'Nairobi', country: 'Kenya' },
  { id: 'jnb', city: 'Johannesburg', country: 'South Africa' },
  { id: 'fra', city: 'Frankfurt', country: 'Germany' },
  { id: 'lon', city: 'London', country: 'United Kingdom' },
  { id: 'iad', city: 'Ashburn', country: 'United States' },
];

export const BANDWIDTH_PACKAGES = [
  { id: 'bw-10', name: '10 TB at 1 Gbps', monthly: 0 },
  { id: 'bw-50', name: '50 TB at 1 Gbps', monthly: 29 },
  { id: 'bw-unmetered', name: 'Unmetered at 1 Gbps', monthly: 79 },
  { id: 'bw-10g', name: '100 TB at 10 Gbps', monthly: 149 },
];

/* -------------------------------- Cloud -------------------------------- */

export const CLOUD_SIZES = [
  { id: 'c1', name: 'Small', cpu: 1, ram: 2, storage: 40, monthly: 12 },
  { id: 'c2', name: 'Medium', cpu: 2, ram: 4, storage: 80, monthly: 24 },
  { id: 'c4', name: 'Large', cpu: 4, ram: 8, storage: 160, monthly: 48 },
  { id: 'c8', name: 'X-Large', cpu: 8, ram: 16, storage: 320, monthly: 96 },
];

export const SCALING_PRESETS = [
  { id: 'fixed', name: 'Fixed', min: 1, max: 1, description: 'Always 1 instance. Predictable cost.' },
  { id: 'balanced', name: 'Balanced', min: 2, max: 4, description: 'Adds instances above 70% CPU.' },
  { id: 'performance', name: 'Performance', min: 3, max: 10, description: 'Adds instances above 60% CPU.' },
];

export const K8S_PRICING = { controlPlane: 20, loadBalancer: 10, registry: 5 };

/** Hours used to convert monthly instance prices to the hourly burst rate. */
export const HOURS_PER_MONTH = 730;

/* -------------------------------- Domains ------------------------------ */

export interface Tld {
  tld: string;
  register: number; // USD first year
  renew: number; // USD / year
  transfer: number; // USD incl. 1-year extension
  privacy: boolean; // registry supports WHOIS privacy
  freeWithHosting: boolean;
}

export const TLDS: Tld[] = [
  { tld: '.com', register: 11.99, renew: 14.99, transfer: 11.99, privacy: true, freeWithHosting: true },
  { tld: '.net', register: 13.99, renew: 16.99, transfer: 13.99, privacy: true, freeWithHosting: true },
  { tld: '.org', register: 10.99, renew: 15.99, transfer: 10.99, privacy: true, freeWithHosting: true },
  { tld: '.co.ke', register: 9.99, renew: 9.99, transfer: 9.99, privacy: false, freeWithHosting: true },
  { tld: '.africa', register: 14.99, renew: 19.99, transfer: 14.99, privacy: true, freeWithHosting: false },
  { tld: '.io', register: 39.99, renew: 49.99, transfer: 39.99, privacy: true, freeWithHosting: false },
  { tld: '.dev', register: 14.99, renew: 16.99, transfer: 14.99, privacy: true, freeWithHosting: false },
  { tld: '.store', register: 2.99, renew: 49.99, transfer: 49.99, privacy: true, freeWithHosting: false },
];

export const NAMESERVERS = ['ns1.cloudoon.com', 'ns2.cloudoon.com'];

/* ------------------------------- Add-ons ------------------------------- */

export const ADDON_PRICING = {
  backups: 2.99,
  emailPerBox: 1.49,
  ddosAdvanced: 9.99,
  cdn: 4.99,
};

export const SSL_OPTIONS: { id: SslOption; name: string; description: string; monthly: number }[] = [
  { id: 'free', name: 'Standard SSL', description: "Domain validated (Let's Encrypt)", monthly: 0 },
  { id: 'wildcard', name: 'Wildcard SSL', description: 'Covers all subdomains (shop., blog.)', monthly: 5.99 },
  { id: 'ov', name: 'Business SSL (OV)', description: 'Verified company name in the certificate', monthly: 8.99 },
];

export const EMAIL_LIMITS = { min: 0, max: 50 };

/* --------------------------- Promo codes / tax ------------------------- */

export interface Promo {
  code: string;
  label: string;
  percent: number;
  appliesTo: 'all' | 'hosting';
  expired?: string;
}

export const PROMOS: Promo[] = [
  { code: 'WELCOME10', label: '10% off your first term', percent: 0.1, appliesTo: 'all' },
  { code: 'HOSTING25', label: '25% off hosting, first term', percent: 0.25, appliesTo: 'hosting' },
  { code: 'SUMMER24', label: 'Summer sale', percent: 0.3, appliesTo: 'all', expired: '31 Aug 2024' },
];

export interface Country {
  code: string;
  name: string;
  taxRate: number;
  taxName: string;
  currency: CurrencyCode;
}

export const COUNTRIES: Country[] = [
  { code: 'KE', name: 'Kenya', taxRate: 0.16, taxName: 'VAT', currency: 'KES' },
  { code: 'US', name: 'United States', taxRate: 0, taxName: 'Sales tax', currency: 'USD' },
  { code: 'GB', name: 'United Kingdom', taxRate: 0.2, taxName: 'VAT', currency: 'GBP' },
  { code: 'DE', name: 'Germany', taxRate: 0.19, taxName: 'VAT', currency: 'EUR' },
  { code: 'FR', name: 'France', taxRate: 0.2, taxName: 'VAT', currency: 'EUR' },
  { code: 'NL', name: 'Netherlands', taxRate: 0.21, taxName: 'VAT', currency: 'EUR' },
  { code: 'NG', name: 'Nigeria', taxRate: 0.075, taxName: 'VAT', currency: 'USD' },
  { code: 'ZA', name: 'South Africa', taxRate: 0.15, taxName: 'VAT', currency: 'USD' },
  { code: 'UG', name: 'Uganda', taxRate: 0.18, taxName: 'VAT', currency: 'USD' },
  { code: 'TZ', name: 'Tanzania', taxRate: 0.18, taxName: 'VAT', currency: 'USD' },
];

/* ------------------------- Address lookup (mock) ----------------------- */

export interface AddressSuggestion {
  line: string;
  city: string;
  postalCode: string;
  country: string;
}

export const ADDRESS_BOOK: AddressSuggestion[] = [
  { line: 'Westlands Road, The Mirage Tower 2', city: 'Nairobi', postalCode: '00800', country: 'KE' },
  { line: 'Waiyaki Way, ABC Place', city: 'Nairobi', postalCode: '00800', country: 'KE' },
  { line: 'Kenyatta Avenue, Kimathi House', city: 'Nairobi', postalCode: '00100', country: 'KE' },
  { line: 'Moi Avenue, Nkrumah Road Junction', city: 'Mombasa', postalCode: '80100', country: 'KE' },
  { line: 'Ngong Road, Prestige Plaza', city: 'Nairobi', postalCode: '00505', country: 'KE' },
  { line: '221B Baker Street', city: 'London', postalCode: 'NW1 6XE', country: 'GB' },
  { line: '10 Downing Street', city: 'London', postalCode: 'SW1A 2AA', country: 'GB' },
  { line: '350 Fifth Avenue', city: 'New York', postalCode: '10118', country: 'US' },
  { line: '1600 Amphitheatre Parkway', city: 'Mountain View', postalCode: '94043', country: 'US' },
  { line: 'Friedrichstraße 43', city: 'Berlin', postalCode: '10117', country: 'DE' },
  { line: 'Rue de Rivoli 99', city: 'Paris', postalCode: '75001', country: 'FR' },
  { line: 'Damrak 1', city: 'Amsterdam', postalCode: '1012 LG', country: 'NL' },
];
