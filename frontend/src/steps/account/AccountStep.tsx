import { useState, type FormEvent } from 'react';
import { COUNTRIES } from '../../data/catalog';
import * as v from '../../lib/validation';
import { useStore } from '../../state/store';
import type { AuthMode, BillingDetails } from '../../types';
import { Check } from '../../components/icons';
import { Section, SelectField, Switch, TextButton, TextField } from '../../components/ui';
import { AddressAutocomplete } from './AddressAutocomplete';
import { AuthPanel, DEMO_PASSWORD, DEMO_PROFILE, useSignIn } from './AuthPanel';

export const CHECKOUT_FORM_ID = 'checkout-form';

const PROVIDER_LABEL = { google: 'Google', github: 'GitHub', sso: 'company SSO', password: 'email', guest: 'guest', signup: 'new account' } as const;

type BillingKey = 'fullName' | 'phone' | 'address' | 'city' | 'postalCode' | 'company';

function billingErrors(b: BillingDetails): Partial<Record<BillingKey, string>> {
  return {
    fullName: v.fullName(b.fullName),
    phone: v.phone(b.phone),
    address: v.required('street address')(b.address),
    city: v.required('city or town')(b.city),
    postalCode: v.required('postal code')(b.postalCode),
    company: b.isBusiness ? v.required('company name')(b.company) : '',
  };
}

/** Step 2 — who is buying. Auth and billing live on one screen, so nothing is lost. */
export function AccountStep() {
  const { checkout, setAccount, setBilling, setStep } = useStore();
  const signIn = useSignIn();
  const b = checkout.billing;
  const account = checkout.account;

  const [mode, setMode] = useState<AuthMode>('signup');
  const [password, setPassword] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<BillingKey, boolean>>>({});
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  const errors = billingErrors(b);
  const err = (k: BillingKey) => (touched[k] || showErrors ? errors[k] : '') || '';
  const touch = (k: BillingKey) => () => setTouched((t) => ({ ...t, [k]: true }));

  const login = () => {
    setLoginError('');
    if (v.email(b.email) || !password) {
      setShowErrors(true);
      return;
    }
    setLoggingIn(true);
    setTimeout(() => {
      setLoggingIn(false);
      if (b.email.trim().toLowerCase() === DEMO_PROFILE.email && password === DEMO_PASSWORD) {
        signIn('password', DEMO_PROFILE.email);
        setPassword('');
        setShowErrors(false);
      } else {
        setLoginError('That email and password don’t match. Check them and try again, or reset your password.');
      }
    }, 900);
  };

  const focusFirstError = () =>
    requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!account) {
      if (mode === 'login') return login();
      const authInvalid = !!v.email(b.email) || (mode === 'signup' && !!v.password(password));
      if (authInvalid || Object.values(errors).some(Boolean)) {
        setShowErrors(true);
        return focusFirstError();
      }
      setAccount({ name: b.fullName, email: b.email.trim(), provider: mode });
      setPassword('');
    } else if (Object.values(errors).some(Boolean)) {
      setShowErrors(true);
      return focusFirstError();
    }
    setStep(3);
  };

  return (
    <form id={CHECKOUT_FORM_ID} onSubmit={submit} noValidate className="space-y-3 sm:space-y-4">
      <Section title="Account">
        {account ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 p-3">
            <div className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-600 text-white"><Check size={16} /></span>
              <div>
                <p className="text-sm font-medium text-gray-950">
                  {account.provider === 'guest' ? 'Checking out as a guest' : account.provider === 'signup' ? 'New account details saved' : `Signed in as ${account.name}`}
                </p>
                <p className="text-[13px] text-gray-600">{account.email}{['google', 'github', 'sso', 'password'].includes(account.provider) && ` · via ${PROVIDER_LABEL[account.provider]}`}</p>
              </div>
            </div>
            <TextButton onClick={() => setAccount(null)}>
              {account.provider === 'guest' || account.provider === 'signup' ? 'Change' : 'Switch account'}
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
            loggingIn={loggingIn}
            onLogin={login}
          />
        )}
      </Section>

      {(account || mode !== 'login') && (
        <Section title="Billing details" description="Shown on your invoice. Your country sets the tax rate.">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Full name" autoComplete="name" value={b.fullName} onChange={(fullName) => setBilling({ fullName })} onBlur={touch('fullName')} error={err('fullName')} valid={touched.fullName && !errors.fullName} />
            <TextField label="Phone" type="tel" inputMode="tel" autoComplete="tel" value={b.phone} onChange={(phone) => setBilling({ phone })} onBlur={touch('phone')} error={err('phone')} hint="Include your country code, e.g. +254" placeholder="+254 712 345 678" />
            <SelectField
              label="Country"
              autoComplete="country"
              className="sm:col-span-2"
              value={b.country}
              onChange={(country) => setBilling({ country })}
              options={COUNTRIES.map((c) => ({ value: c.code, label: c.name }))}
              hint={(() => {
                const c = COUNTRIES.find((x) => x.code === b.country)!;
                return c.taxRate ? `${c.taxName} of ${+(c.taxRate * 100).toFixed(1)}% applies.` : `No ${c.taxName.toLowerCase()} is charged.`;
              })()}
            />
            <div className="sm:col-span-2">
              <AddressAutocomplete
                value={b.address}
                onChange={(address) => setBilling({ address })}
                onBlur={touch('address')}
                error={err('address')}
                onSelect={(s) => {
                  setBilling({ address: s.line, city: s.city, postalCode: s.postalCode, country: s.country });
                  setTouched((t) => ({ ...t, address: true, city: true, postalCode: true }));
                }}
              />
            </div>
            <TextField label="City / town" autoComplete="address-level2" value={b.city} onChange={(city) => setBilling({ city })} onBlur={touch('city')} error={err('city')} />
            <TextField label="Postal code" autoComplete="postal-code" value={b.postalCode} onChange={(postalCode) => setBilling({ postalCode })} onBlur={touch('postalCode')} error={err('postalCode')} />
          </div>

          <div className="mt-4">
            <Switch bordered checked={b.isBusiness} onChange={(isBusiness) => setBilling({ isBusiness })} label="Buying for a business" description="Add a company name and tax ID to the invoice" />
            {b.isBusiness && (
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <TextField label="Company name" autoComplete="organization" value={b.company} onChange={(company) => setBilling({ company })} onBlur={touch('company')} error={err('company')} />
                <TextField label="VAT / KRA PIN" optional value={b.taxId} onChange={(taxId) => setBilling({ taxId: taxId.toUpperCase() })} hint="Printed on your invoice." />
              </div>
            )}
          </div>
        </Section>
      )}
    </form>
  );
}
