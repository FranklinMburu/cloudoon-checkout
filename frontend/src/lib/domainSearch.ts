// Mock domain availability API. Deterministic so the prototype behaves the
// same on every run: well-known brands and some hashed names are "taken".

import { TLDS, type Tld } from '../data/catalog';

export interface DomainResult {
  name: string;
  label: string;
  tld: Tld;
  available: boolean;
}

const TAKEN = new Set(['google', 'facebook', 'amazon', 'cloudoon', 'safaricom', 'microsoft', 'apple', 'test', 'shop']);

function hash(s: string) {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

function isAvailable(label: string, tld: string) {
  if (TAKEN.has(label)) return tld === '.africa' || tld === '.store';
  return hash(label + tld) % 4 !== 0; // roughly 1 in 4 names is taken
}

/** Split "mybrand.co.ke" into label + known TLD; defaults to .com. */
export function parseQuery(query: string) {
  const q = query.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '');
  const tld = [...TLDS].sort((a, b) => b.tld.length - a.tld.length).find((t) => q.endsWith(t.tld));
  if (tld) return { label: q.slice(0, -tld.tld.length), tld: tld.tld };
  return { label: q.split('.')[0], tld: '.com' };
}

export async function searchDomains(query: string, delayMs = 700): Promise<{ exact: DomainResult; suggestions: DomainResult[] }> {
  await new Promise((r) => setTimeout(r, delayMs));
  const { label, tld } = parseQuery(query);
  const make = (t: Tld): DomainResult => ({ name: label + t.tld, label, tld: t, available: isAvailable(label, t.tld) });
  const exactTld = TLDS.find((t) => t.tld === tld)!;
  return {
    exact: make(exactTld),
    suggestions: TLDS.filter((t) => t.tld !== tld).map(make),
  };
}
