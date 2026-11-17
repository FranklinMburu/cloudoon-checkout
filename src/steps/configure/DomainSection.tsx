import { useState, type FormEvent } from 'react';
import { NAMESERVERS } from '../../data/catalog';
import { searchDomains, type DomainResult } from '../../lib/domainSearch';
import { freeDomainEligible, freeDomainId, getTld } from '../../lib/pricing';
import * as v from '../../lib/validation';
import { useStore } from '../../state/store';
import { useMoney } from '../../state/useMoney';
import type { DomainItem, DomainMode } from '../../types';
import { Check, Globe, Search, Trash } from '../../components/icons';
import { Badge, Button, Notice, Section, Segmented, Skeleton, Switch, TextField } from '../../components/ui';

const MODES: { value: DomainMode; label: string }[] = [
  { value: 'register', label: 'Register new' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'existing', label: 'Use my own' },
];

export function DomainSection() {
  const { cart } = useStore();
  const [mode, setMode] = useState<DomainMode>('register');
  const [prefill, setPrefill] = useState('');

  const switchToTransfer = (name: string) => {
    setPrefill(name);
    setMode('transfer');
  };

  return (
    <Section
      id="domain"
      title="Domain"
      description={cart.category === 'shared' ? 'Your website’s address. Optional — you can add one later.' : 'Optional. Add a domain to point at your server.'}
      aside={freeDomainEligible(cart) ? <Badge tone="success">1st year free with this plan</Badge> : undefined}
    >
      <Segmented label="Domain option" value={mode} onChange={(m) => { setMode(m); setPrefill(''); }} options={MODES} fullWidth />

      <div className="mt-4">
        {mode === 'register' && <RegisterPanel onTransfer={switchToTransfer} />}
        {mode === 'transfer' && <TransferPanel key={prefill} initial={prefill} />}
        {mode === 'existing' && <ExistingPanel />}
      </div>

      {cart.domains.length > 0 && <DomainList />}
    </Section>
  );
}

/* ------------------------------- Register ------------------------------ */

function RegisterPanel({ onTransfer }: { onTransfer: (name: string) => void }) {
  const [query, setQuery] = useState('');
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ exact: DomainResult; suggestions: DomainResult[] } | null>(null);

  const label = query.trim().toLowerCase().split('.')[0];
  const error = touched ? v.domainLabel(label) : '';

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (v.domainLabel(label)) return;
    setLoading(true);
    setResults(null);
    setResults(await searchDomains(query));
    setLoading(false);
  };

  return (
    <div>
      <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row sm:items-start" role="search" aria-label="Domain search">
        <TextField
          label="Find your domain"
          className="flex-1"
          value={query}
          onChange={(val) => { setQuery(val); if (touched) setTouched(false); }}
          placeholder="e.g. mybrand or mybrand.co.ke"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          error={error}
          hint="Letters, numbers and hyphens. We’ll check popular endings too."
        />
        <Button type="submit" loading={loading} className="sm:mt-7" size="md">
          {!loading && <Search size={18} />} Search
        </Button>
      </form>

      <div aria-live="polite" aria-busy={loading}>
        {loading && <ResultsSkeleton />}
        {results && !loading && (
          <div className="mt-4 space-y-3">
            <ResultRow result={results.exact} highlight onTransfer={onTransfer} />
            <div>
              <h3 className="mb-2 text-sm font-semibold text-gray-700">More options</h3>
              <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200">
                {results.suggestions.map((r) => (
                  <li key={r.name}><ResultRow result={r} /></li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ResultsSkeleton() {
  return (
    <div className="mt-4 space-y-3" aria-label="Searching domains">
      <Skeleton className="h-20 w-full rounded-xl" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center justify-between gap-4 rounded-xl border border-gray-100 p-3">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-11 w-24 rounded-lg" />
        </div>
      ))}
      <span className="sr-only">Checking availability…</span>
    </div>
  );
}

function ResultRow({ result, highlight, onTransfer }: { result: DomainResult; highlight?: boolean; onTransfer?: (name: string) => void }) {
  const { cart, addDomain, removeLine } = useStore();
  const { usd } = useMoney();
  const inCart = cart.domains.find((d) => d.name === result.name);
  const freeEligible = freeDomainEligible(cart) && result.tld.freeWithHosting && !freeDomainId(cart);

  const add = () =>
    addDomain({ name: result.name, tld: result.tld.tld, mode: 'register', autoRenew: true, privacy: result.tld.privacy });

  return (
    <div className={highlight ? `rounded-xl border-2 p-4 ${result.available ? 'border-green-600 bg-green-50/50' : 'border-gray-200 bg-gray-50'}` : 'p-3'}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className={`break-all font-semibold text-gray-950 ${highlight ? 'text-lg' : ''}`}>{result.name}</p>
          {result.available ? (
            <p className="text-sm text-gray-700">
              {highlight && <span className="font-medium text-green-800">Available · </span>}
              {freeEligible ? (
                <><span className="font-semibold text-green-800">Free 1st year</span> <span className="text-gray-500 line-through">{usd(result.tld.register)}</span></>
              ) : (
                <span className="font-semibold text-gray-950">{usd(result.tld.register)}/yr</span>
              )}
              <span className="text-gray-600"> · renews at {usd(result.tld.renew)}/yr</span>
            </p>
          ) : (
            <p className="text-sm text-gray-600">Already registered by someone else</p>
          )}
        </div>
        {result.available ? (
          inCart ? (
            <div className="flex items-center gap-1">
              <span className="inline-flex items-center gap-1 px-2 text-sm font-semibold text-green-800"><Check size={18} /> Added</span>
              <Button variant="danger-ghost" onClick={() => removeLine(`domain:${inCart.id}`)} aria-label={`Remove ${result.name}`}>Remove</Button>
            </div>
          ) : (
            <Button variant={highlight ? 'primary' : 'secondary'} onClick={add}>Add to order</Button>
          )
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" disabled>Taken</Button>
            {onTransfer && (
              <Button variant="ghost" onClick={() => onTransfer(result.name)}>I own it — transfer</Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------- Transfer ------------------------------ */

function TransferPanel({ initial }: { initial: string }) {
  const { cart, addDomain } = useStore();
  const { usd } = useMoney();
  const [domain, setDomain] = useState(initial);
  const [code, setCode] = useState('');
  const [touched, setTouched] = useState({ domain: false, code: false });
  const [loading, setLoading] = useState(false);

  const name = v.normalizeDomain(domain);
  const tld = getTld('.' + name.split('.').slice(1).join('.'));
  const domainError = v.fullDomain(domain) || (name && !tld ? 'We can transfer .com, .net, .org, .co.ke, .africa, .io, .dev and .store domains.' : '') ||
    (cart.domains.some((d) => d.name === name) ? 'This domain is already in your order.' : '');
  const codeError = code.trim().length >= 6 ? '' : code ? 'Auth codes are at least 6 characters.' : 'Enter the auth (EPP) code from your current registrar.';

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTouched({ domain: true, code: true });
    if (domainError || codeError || !tld) return;
    setLoading(true);
    setTimeout(() => {
      addDomain({ name, tld: tld.tld, mode: 'transfer', autoRenew: true, privacy: tld.privacy, authCode: code.trim() });
      setDomain('');
      setCode('');
      setTouched({ domain: false, code: false });
      setLoading(false);
    }, 600);
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label="Domain to transfer"
          value={domain}
          onChange={setDomain}
          onBlur={() => setTouched((t) => ({ ...t, domain: true }))}
          placeholder="mybrand.com"
          autoCapitalize="none"
          spellCheck={false}
          error={touched.domain ? domainError : ''}
          valid={touched.domain && !domainError}
          hint={tld ? `Transfer ${usd(tld.transfer)} · includes 1 extra year` : undefined}
        />
        <TextField
          label="Auth / EPP code"
          value={code}
          onChange={setCode}
          onBlur={() => setTouched((t) => ({ ...t, code: true }))}
          autoComplete="off"
          spellCheck={false}
          error={touched.code ? codeError : ''}
          hint="Ask your current registrar for this code."
        />
      </div>
      <Notice>Before transferring, unlock the domain at your current registrar. Transfers usually finish within 5–7 days and your site stays online.</Notice>
      <Button type="submit" variant="primary" loading={loading}>Add transfer to order</Button>
    </form>
  );
}

/* ------------------------------- Existing ------------------------------ */

function ExistingPanel() {
  const { cart, addDomain } = useStore();
  const [domain, setDomain] = useState('');
  const [touched, setTouched] = useState(false);
  const name = v.normalizeDomain(domain);
  const error = v.fullDomain(domain) || (cart.domains.some((d) => d.name === name) ? 'This domain is already in your order.' : '');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (error) return;
    addDomain({ name, tld: '.' + name.split('.').slice(1).join('.'), mode: 'existing', autoRenew: false, privacy: false });
    setDomain('');
    setTouched(false);
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <TextField
          label="Your domain"
          className="flex-1"
          value={domain}
          onChange={setDomain}
          onBlur={() => setTouched(true)}
          placeholder="mybrand.com"
          autoCapitalize="none"
          spellCheck={false}
          error={touched ? error : ''}
          hint="Keep it with your current registrar. No charge from us."
        />
        <Button type="submit" className="sm:mt-7">Use this domain</Button>
      </div>
      <p className="text-sm text-gray-600">
        After ordering, point your domain’s nameservers to <strong className="font-mono text-gray-900">{NAMESERVERS[0]}</strong> and{' '}
        <strong className="font-mono text-gray-900">{NAMESERVERS[1]}</strong>.
      </p>
    </form>
  );
}

/* ------------------------------ Domain list ---------------------------- */

const MODE_LABEL: Record<DomainMode, string> = { register: 'New registration', transfer: 'Transfer', existing: 'Existing domain' };

function DomainList() {
  const { cart } = useStore();
  return (
    <div className="mt-6 border-t border-gray-100 pt-5">
      <h3 className="mb-3 font-semibold text-gray-950">Domains in your order ({cart.domains.length})</h3>
      <ul className="space-y-3">
        {cart.domains.map((d) => <DomainCard key={d.id} domain={d} />)}
      </ul>
    </div>
  );
}

function DomainCard({ domain: d }: { domain: DomainItem }) {
  const { cart, updateDomain, removeLine } = useStore();
  const { usd } = useMoney();
  const tld = getTld(d.tld);
  const isFree = freeDomainId(cart) === d.id;

  return (
    <li className="rounded-xl border border-gray-200 p-3 sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <Globe size={20} className="mt-0.5 shrink-0 text-brand-600" />
          <div className="min-w-0">
            <p className="break-all font-semibold text-gray-950">{d.name}</p>
            <p className="text-sm text-gray-600">
              {MODE_LABEL[d.mode]}
              {d.mode !== 'existing' && tld && (
                <> · {isFree ? 'Free 1st year' : usd(d.mode === 'transfer' ? tld.transfer : tld.register)} · renews at {usd(tld.renew)}/yr</>
              )}
            </p>
          </div>
        </div>
        <Button variant="danger-ghost" onClick={() => removeLine(`domain:${d.id}`)} aria-label={`Remove ${d.name}`}>
          <Trash size={16} /> Remove
        </Button>
      </div>

      {d.mode === 'existing' ? (
        <p className="mt-2 text-sm text-gray-600">Nameservers: <span className="font-mono">{NAMESERVERS.join(', ')}</span></p>
      ) : (
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <Switch
            checked={d.autoRenew}
            onChange={(autoRenew) => updateDomain(d.id, { autoRenew })}
            label="Auto-renew"
            description={d.autoRenew ? 'Renews yearly so you never lose it' : 'Expires after 1 year unless you renew'}
          />
          <Switch
            checked={tld?.privacy ? d.privacy : false}
            disabled={!tld?.privacy}
            onChange={(privacy) => updateDomain(d.id, { privacy })}
            label="WHOIS privacy"
            description={tld?.privacy ? 'Hides your name & address · Free' : `The ${d.tld} registry doesn’t allow privacy`}
          />
        </div>
      )}
    </li>
  );
}
