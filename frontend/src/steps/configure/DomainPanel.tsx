import { useState, type FormEvent } from 'react';
import { ApiError, api } from '../../api/client';
import type { DomainItem, DomainMode, DomainResult } from '../../api/types';
import * as v from '../../lib/validation';
import { useStore } from '../../state/store';
import { useMoney } from '../../state/useMoney';
import { Alert, Check, Search } from '../../components/icons';
import { Button, ListGroup, Notice, Segmented, Skeleton, Switch, TextButton, TextField, cx, inputClass } from '../../components/ui';

const MODES: { value: DomainMode; label: string }[] = [
  { value: 'register', label: 'Register' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'existing', label: 'Use my own' },
];

/** Domain options. Rendered inside a collapsible section on step 1 (progressive disclosure). */
export function DomainPanel() {
  const { cart } = useStore();
  const [mode, setMode] = useState<DomainMode>('register');
  const [prefill, setPrefill] = useState('');

  return (
    <div>
      <Segmented label="Domain option" value={mode} onChange={(m) => { setMode(m); setPrefill(''); }} options={MODES} fullWidth />
      <div className="mt-4">
        {mode === 'register' && <RegisterPanel onTransfer={(name) => { setPrefill(name); setMode('transfer'); }} />}
        {mode === 'transfer' && <TransferPanel key={prefill} initial={prefill} />}
        {mode === 'existing' && <ExistingPanel />}
      </div>
      {cart.domains.length > 0 && (
        <div className="mt-5 space-y-2">
          <p className="text-xs font-medium tracking-wide text-gray-500 uppercase">In your order</p>
          {cart.domains.map((d) => <DomainCard key={d.name} domain={d} />)}
        </div>
      )}
    </div>
  );
}

/** One-line summary shown while the domain section is collapsed. */
export function useDomainSummary() {
  const { cart, quote } = useStore();
  if (cart.domains.length) return cart.domains.map((d) => d.name).join(', ');
  return quote?.free_domain.eligible ? 'Add a domain — the first year is free with this plan' : 'Optional · register, transfer or use your own';
}

/* ------------------------------- Register ------------------------------ */

function RegisterPanel({ onTransfer }: { onTransfer: (name: string) => void }) {
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ exact: DomainResult; suggestions: DomainResult[] } | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const local = v.domainLabel(query.trim().toLowerCase().split('.')[0]);
    if (local) return setError(local);
    setLoading(true);
    setResults(null);
    try {
      setResults(await api.checkDomain(query));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Search failed. Try again.');
    } finally {
      setLoading(false);
    }
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
              onChange={(e) => { setQuery(e.target.value); setError(''); }}
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
  const { cart, catalog, quote, addDomain, removeLine } = useStore();
  const { fmt } = useMoney();
  const tld = catalog.tlds.find((t) => t.tld === result.tld)!;
  const inCart = cart.domains.find((d) => d.name === result.name);
  const free = !!quote?.free_domain.eligible && !quote.free_domain.applied_to && tld.free_with_hosting;

  return (
    <div className={cx('flex items-center justify-between gap-3 px-3 py-2.5', highlight && cx('rounded-lg border', result.available ? 'border-green-600/40 bg-green-50/60' : 'border-gray-200 bg-gray-50'))}>
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-x-2 text-sm font-medium break-all text-gray-950">
          {result.name}
          {highlight && (result.available ? <span className="text-xs font-medium text-green-700">Available</span> : <span className="text-xs font-medium text-gray-500">Taken</span>)}
        </p>
        <p className="text-xs text-gray-500 tabular-nums">
          {result.available
            ? free
              ? <><span className="font-medium text-green-700">Free 1st year</span>, then {fmt(tld.renew)}/yr</>
              : <>{fmt(tld.register)} 1st year, then {fmt(tld.renew)}/yr</>
            : 'Registered by someone else'}
        </p>
      </div>
      {result.available ? (
        inCart ? (
          <span className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-[13px] font-medium text-green-700"><Check size={14} /> Added</span>
            <TextButton tone="muted" onClick={() => removeLine(`domain:${inCart.name}`)} aria-label={`Remove ${result.name}`}>Remove</TextButton>
          </span>
        ) : (
          <Button size="sm" variant={highlight ? 'primary' : 'secondary'} onClick={() => addDomain({ name: result.name, mode: 'register', auto_renew: true, privacy: tld.privacy_supported })}>
            Add
          </Button>
        )
      ) : onTransfer ? (
        <TextButton onClick={() => onTransfer(result.name)}>Transfer it</TextButton>
      ) : (
        <span className="text-xs text-gray-500">Unavailable</span>
      )}
    </div>
  );
}

/* ------------------------------- Transfer ------------------------------ */

function TransferPanel({ initial }: { initial: string }) {
  const { cart, catalog, addDomain } = useStore();
  const { fmt } = useMoney();
  const [domain, setDomain] = useState(initial);
  const [code, setCode] = useState('');
  const [touched, setTouched] = useState({ domain: false, code: false });

  const name = v.normalizeDomain(domain);
  const tld = [...catalog.tlds].sort((a, b) => b.tld.length - a.tld.length).find((t) => name.endsWith(t.tld));
  const supported = catalog.tlds.map((t) => t.tld).join(', ');
  const domainError = v.fullDomain(domain) || (name && !tld ? `We can transfer ${supported} domains.` : '') ||
    (cart.domains.some((d) => d.name === name) ? 'This domain is already in your order.' : '');
  const codeError = code.trim().length >= 6 ? '' : code ? 'Auth codes are at least 6 characters.' : 'Enter the auth code from your current registrar.';

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTouched({ domain: true, code: true });
    if (domainError || codeError || !tld) return;
    addDomain({ name, mode: 'transfer', auto_renew: true, privacy: tld.privacy_supported });
    setDomain('');
    setCode('');
    setTouched({ domain: false, code: false });
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
          hint={tld ? `${fmt(tld.transfer)}, includes 1 extra year` : undefined}
        />
        <TextField
          label="Auth (EPP) code"
          value={code}
          onChange={setCode}
          onBlur={() => setTouched((t) => ({ ...t, code: true }))}
          autoComplete="off"
          spellCheck={false}
          error={touched.code ? codeError : ''}
          hint="From your current registrar. It’s sent to the registry, never stored."
        />
      </div>
      <p className="text-xs text-gray-500">Unlock the domain at your registrar first. Transfers take 5–7 days; your site stays online.</p>
      <Button type="submit" variant="secondary">Add transfer</Button>
    </form>
  );
}

/* ------------------------------- Existing ------------------------------ */

function ExistingPanel() {
  const { cart, catalog, addDomain } = useStore();
  const [domain, setDomain] = useState('');
  const [touched, setTouched] = useState(false);
  const name = v.normalizeDomain(domain);
  const error = v.fullDomain(domain) || (cart.domains.some((d) => d.name === name) ? 'This domain is already in your order.' : '');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (error) return;
    addDomain({ name, mode: 'existing', auto_renew: false, privacy: false });
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
          hint={<>Stays with your registrar. Point it to <span className="font-mono">{catalog.nameservers.join(' and ')}</span>.</>}
        />
        <Button type="submit" variant="secondary" className="mt-[26px]">Use</Button>
      </div>
    </form>
  );
}

/* ------------------------------ Domain card ---------------------------- */

const MODE_LABEL: Record<DomainMode, string> = { register: 'Registration', transfer: 'Transfer', existing: 'External domain' };

function DomainCard({ domain: d }: { domain: DomainItem }) {
  const { catalog, quote, updateDomain, removeLine } = useStore();
  const { fmt } = useMoney();
  const line = quote?.lines.find((l) => l.id === `domain:${d.name}`);
  const tld = [...catalog.tlds].sort((a, b) => b.tld.length - a.tld.length).find((t) => d.name.endsWith(t.tld));

  return (
    <ListGroup>
      <div className="flex items-center justify-between gap-3 py-2.5">
        <div className="min-w-0">
          <p className="text-sm font-medium break-all text-gray-950">{d.name}</p>
          <p className="text-xs text-gray-500 tabular-nums">
            {MODE_LABEL[d.mode]}
            {line && d.mode !== 'existing' && <> · {Number(line.due_today) === 0 ? 'Free 1st year' : fmt(line.due_today)}{line.renewal && <>, then {fmt(line.renewal.amount)}/yr</>}</>}
            {d.mode === 'existing' && ' · No charge'}
          </p>
        </div>
        <TextButton tone="muted" onClick={() => removeLine(`domain:${d.name}`)} aria-label={`Remove ${d.name}`}>Remove</TextButton>
      </div>
      {d.mode !== 'existing' && (
        <>
          <Switch checked={d.auto_renew} onChange={(auto_renew) => updateDomain(d.name, { auto_renew })} label="Auto-renew" description={d.auto_renew ? 'Renews every year' : 'Expires after 1 year'} />
          <Switch
            checked={tld?.privacy_supported ? d.privacy : false}
            disabled={!tld?.privacy_supported}
            onChange={(privacy) => updateDomain(d.name, { privacy })}
            label="WHOIS privacy"
            description={tld?.privacy_supported ? 'Hides your contact details · Free' : `Not offered by the ${tld?.tld ?? ''} registry`}
          />
        </>
      )}
      {d.mode === 'transfer' && <div className="py-2.5"><Notice>Transfer starts after payment. We’ll email you if the registrar needs approval.</Notice></div>}
    </ListGroup>
  );
}
