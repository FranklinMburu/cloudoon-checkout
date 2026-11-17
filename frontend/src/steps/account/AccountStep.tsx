import { useState, type FormEvent } from 'react';
import { ApiError, api } from '../../api/client';
import type { BillingDetails } from '../../api/types';
import * as v from '../../lib/validation';
import { useStore } from '../../state/store';
import { Check } from '../../components/icons';
import { Notice, Section, SelectField, Switch, TextButton, TextField } from '../../components/ui';
import { AddressAutocomplete } from './AddressAutocomplete';
import { AuthPanel, useSignIn, type AuthMode } from './AuthPanel';

export const CHECKOUT_FORM_ID = 'checkout-form';

const PROVIDER_LABEL: Record<string, string> = { google: 'Google', github: 'GitHub', sso: 'company SSO', password: 'email' };

type BillingKey = 'full_name' | 'phone' | 'address' | 'city' | 'postal_code' | 'company';

function billingErrors(b: BillingDetails): Partial<Record<BillingKey, string>> {
  return {
    full_name: v.fullName(b.full_name),
    phone: v.phone(b.phone),
    address: v.required('street address')(b.address),
    city: v.required('city or town')(b.city),
    postal_code: v.required('postal code')(b.postal_code),
    company: b.is_business ? v.required('company name')(b.company) : '',
  };
}

/** Step 2 — who is buying. Auth and billing share one screen, so nothing is lost when switching. */
export function AccountStep({ onModeChange }: { onModeChange?: (m: AuthMode) => void }) {
  const { catalog, checkout, setAccount, setBilling, setStep } = useStore();
  const signIn = useSignIn();
  const b = checkout.billing;
  const account = checkout.account;

  const [mode, setModeState] = useState<AuthMode>('signup');
  const [password, setPassword] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<BillingKey, boolean>>>({});
  const [loginError, setLoginError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [busy, setBusy] = useState(false);

  const setMode = (m: AuthMode) => {
    setModeState(m);
    onModeChange?.(m);
  };

  const errors = billingErrors(b);
  const err = (k: BillingKey) => (touched[k] || showErrors ? errors[k] : '') || '';
  const touch = (k: BillingKey) => () => setTouched((t) => ({ ...t, [k]: true }));

  const login = async () => {
    setLoginError('');
    if (v.email(b.email) || !password) {
      setShowErrors(true);
      return;
    }
    setBusy(true);
    try {
      signIn(await api.login(b.email, password));
      setPassword('');
      setShowErrors(false);
      setMode('signup');
    } catch (e) {
      setLoginError(e instanceof ApiError ? e.message : 'Login failed. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const focusFirstError = () =>
    requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    if (!account && mode === 'login') return login();
    const authInvalid = !account && (!!v.email(b.email) || (mode === 'signup' && !!v.password(password)));
    if (authInvalid || Object.values(errors).some(Boolean)) {
      setShowErrors(true);
      return focusFirstError();
    }
    if (!account) {
      if (mode === 'guest') {
        setAccount({ name: b.full_name, email: b.email.trim(), provider: 'guest' });
      } else {
        setBusy(true);
        try {
          signIn(await api.register(b.email.trim(), password, b.full_name));
          setPassword('');
        } catch (e2) {
          setSubmitError(e2 instanceof ApiError ? e2.message : 'We couldn’t create your account. Try again.');
          setBusy(false);
          return;
        }
        setBusy(false);
      }
    }
    setStep(3);
  };

  return (
    <form id={CHECKOUT_FORM_ID} onSubmit={submit} noValidate aria-busy={busy} className="space-y-3 sm:space-y-4">
      <Section title="Account">
        {account ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 p-3">
            <div className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-600 text-white"><Check size={16} /></span>
              <div>
                <p className="text-sm font-medium text-gray-950">
                  {account.provider === 'guest' ? 'Checking out as a guest' : account.provider === 'signup' ? 'Account created' : `Signed in as ${account.name}`}
                </p>
                <p className="text-[13px] text-gray-600">{account.email}{PROVIDER_LABEL[account.provider] && ` · via ${PROVIDER_LABEL[account.provider]}`}</p>
              </div>
            </div>
            <TextButton onClick={() => { if (account.token) api.logout().catch(() => null); setAccount(null); }}>
              {account.provider === 'guest' ? 'Change' : 'Switch account'}
            </TextButton>
          </div>
        ) : (
          <AuthPanel
            mode={mode}
            setMode={(m) => { setMode(m); setLoginError(''); setShowErrors(false); }}
            email={b.email}
            setEmail={(email) => { setBilling({ email }); setLoginError(''); }}
            password={password}
            setPassword={(pw) => { setPassword(pw); setLoginError(''); }}
            showErrors={showErrors}
            loginError={loginError}
            loggingIn={busy}
            onLogin={login}
          />
        )}
        {submitError && <Notice tone="error" className="mt-3">{submitError}</Notice>}
      </Section>

      {(account || mode !== 'login') && (
        <Section title="Billing details" description="Shown on your invoice. Your country sets the tax rate.">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Full name" autoComplete="name" value={b.full_name} onChange={(full_name) => setBilling({ full_name })} onBlur={touch('full_name')} error={err('full_name')} valid={touched.full_name && !errors.full_name} />
            <TextField label="Phone" type="tel" inputMode="tel" autoComplete="tel" value={b.phone} onChange={(phone) => setBilling({ phone })} onBlur={touch('phone')} error={err('phone')} hint="Include your country code, e.g. +254" placeholder="+254 712 345 678" />
            <SelectField
              label="Country"
              autoComplete="country"
              className="sm:col-span-2"
              value={b.country}
              onChange={(country) => setBilling({ country })}
              options={catalog.countries.map((c) => ({ value: c.code, label: c.name }))}
              hint={(() => {
                const c = catalog.countries.find((x) => x.code === b.country);
                if (!c) return undefined;
                const rate = Number(c.tax_rate);
                return rate ? `${c.tax_name} of ${+(rate * 100).toFixed(2)}% applies.` : `No ${c.tax_name.toLowerCase()} is charged.`;
              })()}
            />
            <div className="sm:col-span-2">
              <AddressAutocomplete
                value={b.address}
                onChange={(address) => setBilling({ address })}
                onBlur={touch('address')}
                error={err('address')}
                onSelect={(s) => {
                  setBilling({ address: s.line, city: s.city, postal_code: s.postal_code, country: s.country });
                  setTouched((t) => ({ ...t, address: true, city: true, postal_code: true }));
                }}
              />
            </div>
            <TextField label="City / town" autoComplete="address-level2" value={b.city} onChange={(city) => setBilling({ city })} onBlur={touch('city')} error={err('city')} />
            <TextField label="Postal code" autoComplete="postal-code" value={b.postal_code} onChange={(postal_code) => setBilling({ postal_code })} onBlur={touch('postal_code')} error={err('postal_code')} />
          </div>

          <div className="mt-4">
            <Switch bordered checked={b.is_business} onChange={(is_business) => setBilling({ is_business })} label="Buying for a business" description="Add a company name and tax ID to the invoice" />
            {b.is_business && (
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <TextField label="Company name" autoComplete="organization" value={b.company} onChange={(company) => setBilling({ company })} onBlur={touch('company')} error={err('company')} />
                <TextField label="VAT / KRA PIN" optional value={b.tax_id} onChange={(tax_id) => setBilling({ tax_id: tax_id.toUpperCase() })} hint="Printed on your invoice." />
              </div>
            )}
          </div>
        </Section>
      )}
    </form>
  );
}
