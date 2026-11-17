import { useState, type FormEvent } from 'react';
import { NAMESERVERS } from '../../data/catalog';
import { searchDomains, type DomainResult } from '../../lib/domainSearch';
import { freeDomainEligible, freeDomainId, getTld } from '../../lib/pricing';
import * as v from '../../lib/validation';
import { useStore } from '../../state/store';
import { useMoney } from '../../state/useMoney';
import type { DomainItem, DomainMode } from '../../types';
import { Alert, Check, Search } from '../../components/icons';
import { Badge, Button, ListGroup, Notice, Section, Segmented, Skeleton, Switch, TextButton, TextField, cx, inputClass } from '../../components/ui';

const MODES: { value: DomainMode; label: string }[] = [
  { value: 'register', label: 'Register' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'existing', label: 'Use my own' },
];

export function DomainSection() {
  const { cart } = useStore();
  const [mode, setMode] = useState<DomainMode>('register');
  const [prefill, setPrefill] = useState('');

  return (
    <Section
      id="domain"
      title="Domain"
      description="Optional. You can also add one later."
      aside={freeDomainEligible(cart) ? <Badge tone="success">Free 1st year</Badge> : undefined}
    >
      <Segmented label="Domain option" value={mode} onChange={(m) => { setMode(m); setPrefill(''); }} options={MODES} fullWidth />

      <div className="mt-4">
        {mode === 'register' && <RegisterPanel onTransfer={(name) => { setPrefill(name); setMode('transfer'); }} />}
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
      <form onSubmit={submit} role="search" aria-label="Domain search">
        <label htmlFor="domain-q" className="mb-1.5 block text-[13px] font-medium text-gray-900">Find a domain</label>
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" />
            <input
              id="domain-q"
              value={query}
              onChange={(e) => { setQuery(e.target.value); if (touched) setTouched(false); }}
              placeholder="yourbrand.com"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              aria-invalid={!!error || undefined}
              aria-describedby={error ? 'domain-q-error' : undefined}
              className={inputClass(!!error, 'pl-9')}
            />
          </div>
          <Button type="submit" variant="secondary" loading={loading}>Search</Button>
        </div>
        {error && (
          <p id="domain-q-error" role="alert" className="mt-1.5 flex items-start gap-1.5 text-[13px] text-red-700"><Alert size={14} className="mt-0.5 shrink-0" />{error}</p>
        )}
      </form>

      <div aria-live="polite" aria-busy={loading}>
        {loading && <ResultsSkeleton />}
        {results && !loading && (
          <div className="mt-4 space-y-3">
            <ResultRow result={results.exact} highlight onTransfer={onTransfer} />
            <div>
              <p className="mb-1.5 text-xs font-medium tracking-wide text-gray-500 uppercase">Other extensions</p>
              <div className="divide-y divide-gray-200 rounded-lg border border-gray-200">
                {results.suggestions.map((r) => <ResultRow key={r.name} result={r} />)}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ResultsSkeleton() {
  return (
    <div className="mt-4 space-y-3">
      <Skeleton className="h-16 w-full rounded-lg" />
      <div className="divide-y divide-gray-100 rounded-lg border border-gray-100">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center justify-between gap-4 px-3 py-3">
            <div className="space-y-1.5"><Skeleton className="h-3.5 w-36" /><Skeleton className="h-3 w-24" /></div>
            <Skeleton className="h-8 w-16 rounded-lg" />
          </div>
        ))}
      </div>
      <span className="sr-only">Checking availability…</span>
    </div>
  );
}

function ResultRow({ result, highlight, onTransfer }: { result: DomainResult; highlight?: boolean; onTransfer?: (name: string) => void }) {
  const { cart, addDomain, removeLine } = useStore();
  const { usd } = useMoney();
  const inCart = cart.domains.find((d) => d.name === result.name);
  const free = freeDomainEligible(cart) && result.tld.freeWithHosting && !freeDomainId(cart);

  return (
    <div className={cx('flex items-center justify-between gap-3 px-3 py-2.5', highlight && cx('rounded-lg border', result.available ? 'border-green-600/40 bg-green-50/60' : 'border-gray-200 bg-gray-50'))}>
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-x-2 text-sm font-medium break-all text-gray-950">
          {result.name}
          {highlight && (result.available ? <span className="text-xs font-medium text-green-700">Available</span> : <span className="text-xs font-medium text-gray-500">Taken</span>)}
        </p>
        <p className="text-xs text-gray-500 tabular-nums">
          {result.available ? (
            free ? <><span className="font-medium text-green-700">Free 1st year</span>, then {usd(result.tld.renew)}/yr</> : <>{usd(result.tld.register)} 1st year, then {usd(result.tld.renew)}/yr</>
          ) : 'Registered by someone else'}
        </p>
      </div>
      {result.available ? (
        inCart ? (
          <span className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-[13px] font-medium text-green-700"><Check size={14} /> Added</span>
            <TextButton tone="muted" onClick={() => removeLine(`domain:${inCart.id}`)} aria-label={`Remove ${result.name}`}>Remove</TextButton>
          </span>
        ) : (
          <Button size="sm" variant={highlight ? 'primary' : 'secondary'} onClick={() => addDomain({ name: result.name, tld: result.tld.tld, mode: 'register', autoRenew: true, privacy: result.tld.privacy })}>
            Add
          </Button>
        )
      ) : onTransfer ? (
        <TextButton onClick={() => onTransfer(result.name)}>Transfer it</TextButton>
      ) : (
        <span className="text-xs text-gray-400">Unavailable</span>
      )}
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
  const domainError = v.fullDomain(domain) || (name && !tld ? 'We can transfer .com, .net, .org, .co.ke, .africa, .io, .dev and .store.' : '') ||
    (cart.domains.some((d) => d.name === name) ? 'This domain is already in your order.' : '');
  const codeError = code.trim().length >= 6 ? '' : code ? 'Auth codes are at least 6 characters.' : 'Enter the auth code from your current registrar.';

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
          label="Domain"
          value={domain}
          onChange={setDomain}
          onBlur={() => setTouched((t) => ({ ...t, domain: true }))}
          placeholder="yourbrand.com"
          autoCapitalize="none"
          spellCheck={false}
          error={touched.domain ? domainError : ''}
          hint={tld ? `${usd(tld.transfer)}, includes 1 extra year` : undefined}
        />
        <TextField
          label="Auth (EPP) code"
          value={code}
          onChange={setCode}
          onBlur={() => setTouched((t) => ({ ...t, code: true }))}
          autoComplete="off"
          spellCheck={false}
          error={touched.code ? codeError : ''}
          hint="From your current registrar"
        />
      </div>
      <p className="text-xs text-gray-500">Unlock the domain at your registrar first. Transfers take 5–7 days; your site stays online.</p>
      <Button type="submit" variant="secondary" loading={loading}>Add transfer</Button>
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
    <form onSubmit={submit} noValidate>
      <div className="flex items-start gap-2">
        <TextField
          label="Your domain"
          className="min-w-0 flex-1"
          value={domain}
          onChange={setDomain}
          onBlur={() => setTouched(true)}
          placeholder="yourbrand.com"
          autoCapitalize="none"
          spellCheck={false}
          error={touched ? error : ''}
          hint={<>Stays with your registrar. Point it to <span className="font-mono">{NAMESERVERS[0]}</span> and <span className="font-mono">{NAMESERVERS[1]}</span>.</>}
        />
        <Button type="submit" variant="secondary" className="mt-[26px]">Use</Button>
      </div>
    </form>
  );
}

/* ------------------------------ Domain list ---------------------------- */

const MODE_LABEL: Record<DomainMode, string> = { register: 'Registration', transfer: 'Transfer', existing: 'External domain' };

function DomainList() {
  const { cart } = useStore();
  return (
    <div className="mt-5 space-y-2">
      <p className="text-xs font-medium tracking-wide text-gray-500 uppercase">In your order</p>
      {cart.domains.map((d) => <DomainCard key={d.id} domain={d} />)}
    </div>
  );
}

function DomainCard({ domain: d }: { domain: DomainItem }) {
  const { cart, updateDomain, removeLine } = useStore();
  const { usd } = useMoney();
  const tld = getTld(d.tld);
  const isFree = freeDomainId(cart) === d.id;

  return (
    <ListGroup>
      <div className="flex items-center justify-between gap-3 py-2.5">
        <div className="min-w-0">
          <p className="text-sm font-medium break-all text-gray-950">{d.name}</p>
          <p className="text-xs text-gray-500 tabular-nums">
            {MODE_LABEL[d.mode]}
            {d.mode !== 'existing' && tld && <> · {isFree ? 'Free 1st year' : usd(d.mode === 'transfer' ? tld.transfer : tld.register)}, then {usd(tld.renew)}/yr</>}
            {d.mode === 'existing' && ' · No charge'}
          </p>
        </div>
        <TextButton tone="muted" onClick={() => removeLine(`domain:${d.id}`)} aria-label={`Remove ${d.name}`}>Remove</TextButton>
      </div>
      {d.mode !== 'existing' && (
        <>
          <Switch
            checked={d.autoRenew}
            onChange={(autoRenew) => updateDomain(d.id, { autoRenew })}
            label="Auto-renew"
            description={d.autoRenew ? 'Renews every year' : 'Expires after 1 year'}
          />
          <Switch
            checked={tld?.privacy ? d.privacy : false}
            disabled={!tld?.privacy}
            onChange={(privacy) => updateDomain(d.id, { privacy })}
            label="WHOIS privacy"
            description={tld?.privacy ? 'Hides your contact details · Free' : `Not offered by the ${d.tld} registry`}
          />
        </>
      )}
      {d.mode === 'transfer' && <div className="py-2.5"><Notice>Transfer starts after payment. We’ll email you if the registrar needs approval.</Notice></div>}
    </ListGroup>
  );
}
