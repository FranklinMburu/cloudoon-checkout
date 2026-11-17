// Pure pricing engine. Given the cart, returns every line item and total.
// No React here — this file is the single source of truth for money.

import {
  ADDON_PRICING,
  BANDWIDTH_PACKAGES,
  CLOUD_SIZES,
  COUNTRIES,
  CURRENCIES,
  CYCLE_DISCOUNTS,
  DEDICATED_SERVERS,
  HOURS_PER_MONTH,
  K8S_PRICING,
  LOCATIONS,
  NAMESERVERS,
  OS_OPTIONS,
  PROMOS,
  SCALING_PRESETS,
  SHARED_PLANS,
  SSL_OPTIONS,
  TLDS,
  VPS_PRICING,
  cycleLabel,
  type Promo,
} from '../data/catalog';
import type { CartState, CurrencyCode, Cycle, LineItem, Quote } from '../types';

/* ------------------------------ Money basics ---------------------------- */

export const getCurrency = (code: CurrencyCode) => CURRENCIES.find((c) => c.code === code)!;

export const round = (value: number, decimals: number) => {
  const f = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * f) / f;
};

/** Convert a USD amount into the target currency, rounded to its precision. */
export const convert = (usd: number, code: CurrencyCode) => {
  const c = getCurrency(code);
  return round(usd * c.rate, c.decimals);
};

/** Round an amount that is already in the target currency. */
export const roundIn = (value: number, code: CurrencyCode) => round(value, getCurrency(code).decimals);

export const getTld = (tld: string) => TLDS.find((t) => t.tld === tld);
export const getCountry = (code: string) => COUNTRIES.find((c) => c.code === code) ?? COUNTRIES[0];

/* ---------------------------- Hosting product --------------------------- */

interface HostingBase {
  title: string;
  details: string[];
  monthlyUsd: number; // regular monthly price in USD
}

export function hostingBase(cart: CartState): HostingBase {
  switch (cart.category) {
    case 'shared': {
      const plan = SHARED_PLANS.find((p) => p.id === cart.shared.planId) ?? SHARED_PLANS[0];
      return { title: `${plan.name} Hosting`, details: [plan.features.slice(0, 2).join(' · ')], monthlyUsd: plan.monthly };
    }
    case 'vps': {
      const v = cart.vps;
      const os = OS_OPTIONS.find((o) => o.id === v.os)!;
      const monthlyUsd =
        v.cpu * VPS_PRICING.perCpu +
        v.ram * VPS_PRICING.perRamGb +
        v.storage * VPS_PRICING.perStorageGb +
        (v.managed ? VPS_PRICING.managed : 0);
      return {
        title: `${v.managed ? 'Managed' : 'Unmanaged'} VPS`,
        details: [`${v.cpu} vCPU · ${v.ram} GB RAM · ${v.storage} GB NVMe`, `${os.name} ${os.version}`],
        monthlyUsd,
      };
    }
    case 'dedicated': {
      const s = DEDICATED_SERVERS.find((x) => x.id === cart.dedicated.serverId) ?? DEDICATED_SERVERS[0];
      const loc = LOCATIONS.find((l) => l.id === cart.dedicated.locationId) ?? LOCATIONS[0];
      return {
        title: `Dedicated · ${s.name}`,
        details: [`${s.ram} · ${s.storage}`, `${loc.city}, ${loc.country} · Setup free`],
        monthlyUsd: s.monthly,
      };
    }
    case 'cloud': {
      const size = CLOUD_SIZES.find((x) => x.id === cart.cloud.sizeId) ?? CLOUD_SIZES[0];
      const scaling = SCALING_PRESETS.find((x) => x.id === cart.cloud.scalingId) ?? SCALING_PRESETS[0];
      const range = scaling.min === scaling.max ? `${scaling.min} instance` : `${scaling.min}–${scaling.max} instances`;
      return {
        title: `Cloud · ${size.name}`,
        details: [`${scaling.min} × ${size.cpu} vCPU / ${size.ram} GB RAM`, `Autoscaling: ${scaling.name} (${range})`],
        monthlyUsd: size.monthly * scaling.min,
      };
    }
  }
}

/** Price preview of the hosting product for one billing cycle (used by the cycle selector). */
export function cyclePreview(cart: CartState, cycle: Cycle) {
  const base = hostingBase(cart);
  const discount = CYCLE_DISCOUNTS[cart.category][cycle];
  const regularMonthly = convert(base.monthlyUsd, cart.currency);
  const monthly = roundIn(regularMonthly * (1 - discount), cart.currency);
  return {
    discount,
    regularMonthly,
    monthly,
    total: roundIn(monthly * cycle, cart.currency),
  };
}

/** Hourly price for each extra autoscaled cloud instance, in the cart currency. */
export function cloudBurstHourly(cart: CartState) {
  const size = CLOUD_SIZES.find((x) => x.id === cart.cloud.sizeId) ?? CLOUD_SIZES[0];
  return round((size.monthly / HOURS_PER_MONTH) * getCurrency(cart.currency).rate, 3);
}

/* ------------------------------ Free domain ----------------------------- */

/** One free domain for the first year with Shared Hosting billed 12+ months. */
export function freeDomainEligible(cart: CartState) {
  return cart.category === 'shared' && cart.cycle >= 12;
}

export function freeDomainId(cart: CartState): string | null {
  if (!freeDomainEligible(cart)) return null;
  const first = cart.domains.find((d) => d.mode === 'register' && getTld(d.tld)?.freeWithHosting);
  return first?.id ?? null;
}

/* ------------------------------ Promo codes ----------------------------- */

export type PromoCheck = { ok: true; promo: Promo } | { ok: false; error: string };

export function checkPromo(raw: string): PromoCheck {
  const code = raw.trim().toUpperCase();
  if (!code) return { ok: false, error: 'Enter a promo code.' };
  const promo = PROMOS.find((p) => p.code === code);
  if (!promo) return { ok: false, error: `“${code}” isn’t a valid code. Check the spelling and try again.` };
  if (promo.expired) return { ok: false, error: `“${code}” expired on ${promo.expired}.` };
  return { ok: true, promo };
}

/* -------------------------------- Quote --------------------------------- */

export function buildQuote(cart: CartState): Quote {
  const cur = cart.currency;
  const months = cart.cycle;
  const term = cycleLabel(months);
  const every = months === 1 ? 'every month' : `every ${months} months`;
  const lines: LineItem[] = [];

  // 1. Hosting
  const base = hostingBase(cart);
  const preview = cyclePreview(cart, months);
  const includes = ['Standard SSL', 'Standard DDoS protection'];
  lines.push({
    id: 'hosting',
    kind: 'hosting',
    title: base.title,
    details: [...base.details, `Includes ${includes.join(' & ')}`],
    termLabel: term,
    dueToday: preview.total,
    regularPrice: roundIn(preview.regularMonthly * months, cur),
    renewal: { amount: roundIn(preview.regularMonthly * months, cur), label: every },
    badge: preview.discount > 0 ? `Save ${Math.round(preview.discount * 100)}%` : undefined,
    removable: false,
    autoRenew: true,
  });

  // Recurring add-on helper: flat monthly price × months, renews at the same price.
  const monthlyLine = (id: string, title: string, monthlyUsd: number, details: string[], removable = true) => {
    const amount = roundIn(convert(monthlyUsd, cur) * months, cur);
    lines.push({
      id,
      kind: 'addon',
      title,
      details,
      termLabel: term,
      dueToday: amount,
      regularPrice: amount,
      renewal: { amount, label: every },
      removable,
      autoRenew: true,
    });
  };

  // 2. Product-specific extras
  if (cart.category === 'vps' && cart.vps.os === 'windows') {
    const os = OS_OPTIONS.find((o) => o.id === 'windows')!;
    monthlyLine('addon:windows', 'Windows Server licence', os.monthly, [`${os.name} ${os.version} · change OS to remove`], false);
  }
  if (cart.category === 'dedicated') {
    const bw = BANDWIDTH_PACKAGES.find((b) => b.id === cart.dedicated.bandwidthId)!;
    if (bw.monthly > 0) monthlyLine('addon:bandwidth', `Bandwidth: ${bw.name}`, bw.monthly, ['Replaces the included 10 TB package']);
  }
  if (cart.category === 'cloud' && cart.cloud.kubernetes) {
    monthlyLine('addon:k8s', 'Managed Kubernetes', K8S_PRICING.controlPlane, ['Control plane, upgrades & monitoring']);
    if (cart.cloud.k8sLoadBalancer) monthlyLine('addon:k8s-lb', 'Kubernetes load balancer', K8S_PRICING.loadBalancer, ['1 public IP, TLS termination']);
    if (cart.cloud.k8sRegistry) monthlyLine('addon:k8s-registry', 'Container registry', K8S_PRICING.registry, ['50 GB private image storage']);
  }

  // 3. Domains — always billed yearly at registry prices.
  const freeId = freeDomainId(cart);
  for (const d of cart.domains) {
    const tld = getTld(d.tld);
    const privacyLabel = !tld?.privacy
      ? `WHOIS privacy not offered for ${d.tld}`
      : d.privacy
        ? 'WHOIS privacy: on (free)'
        : 'WHOIS privacy: off';
    if (d.mode === 'existing' || !tld) {
      lines.push({
        id: `domain:${d.id}`,
        kind: 'domain',
        title: d.name,
        details: ['Your existing domain — no charge', `Point nameservers to ${NAMESERVERS.join(' & ')}`],
        termLabel: '—',
        dueToday: 0,
        regularPrice: 0,
        renewal: null,
        badge: 'No charge',
        removable: true,
      });
      continue;
    }
    const isFree = d.id === freeId;
    const register = convert(d.mode === 'transfer' ? tld.transfer : tld.register, cur);
    lines.push({
      id: `domain:${d.id}`,
      kind: 'domain',
      title: d.name,
      details: [d.mode === 'transfer' ? 'Domain transfer · includes 1-year extension' : 'Domain registration', privacyLabel],
      termLabel: '1 year',
      dueToday: isFree ? 0 : register,
      regularPrice: register,
      renewal: { amount: convert(tld.renew, cur), label: 'every year' },
      badge: isFree ? 'Free 1st year' : undefined,
      removable: true,
      autoRenew: d.autoRenew,
    });
  }

  // 4. Value-added services
  const a = cart.addons;
  if (a.backups) monthlyLine('addon:backups', 'Daily automated backups', ADDON_PRICING.backups, ['30 days of restore points']);
  if (a.ssl !== 'free') {
    const ssl = SSL_OPTIONS.find((s) => s.id === a.ssl)!;
    monthlyLine('addon:ssl', ssl.name, ssl.monthly, ['Replaces the included Standard SSL']);
  }
  if (a.emailBoxes > 0) {
    monthlyLine('addon:email', `Professional email × ${a.emailBoxes}`, ADDON_PRICING.emailPerBox * a.emailBoxes, ['50 GB per mailbox']);
  }
  if (a.ddosAdvanced) monthlyLine('addon:ddos', 'Advanced DDoS protection', ADDON_PRICING.ddosAdvanced, ['Layer 7 filtering, up to 1 Tbps']);
  if (a.cdn) monthlyLine('addon:cdn', 'CDN', ADDON_PRICING.cdn, ['Global edge caching']);

  // 5. Totals
  const subtotal = roundIn(lines.reduce((s, l) => s + l.dueToday, 0), cur);
  const savings = roundIn(lines.reduce((s, l) => s + (l.regularPrice - l.dueToday), 0), cur);

  let promo: Quote['promo'] = null;
  if (cart.promoCode) {
    const check = checkPromo(cart.promoCode);
    if (check.ok) {
      const base = check.promo.appliesTo === 'hosting' ? lines[0].dueToday : subtotal;
      promo = { code: check.promo.code, label: check.promo.label, amount: roundIn(base * check.promo.percent, cur) };
    }
  }

  const country = getCountry(cart.country);
  const taxable = subtotal - (promo?.amount ?? 0);
  const tax = roundIn(taxable * country.taxRate, cur);
  const taxLabel =
    country.taxRate > 0
      ? `${country.taxName} ${+(country.taxRate * 100).toFixed(1)}% · ${country.name}`
      : `${country.taxName} · ${country.name} (not charged)`;

  return {
    lines,
    subtotal,
    savings,
    promo,
    taxRate: country.taxRate,
    taxLabel,
    tax,
    total: roundIn(taxable + tax, cur),
  };
}
