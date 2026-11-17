import { useState } from 'react';
import * as v from '../../lib/validation';
import { useStore } from '../../state/store';
import type { Account, AuthMode } from '../../types';
import { Check, GitHubMark, GoogleMark, Key } from '../../components/icons';
import { Button, Notice, Segmented, TextButton, TextField, cx } from '../../components/ui';

/** Demo identities returned by the mocked OAuth / login calls. */
export const DEMO_PROFILE = {
  name: 'Amina Wanjiru',
  email: 'demo@cloudoon.com',
  phone: '+254 712 345 678',
  address: 'Westlands Road, The Mirage Tower 2',
  city: 'Nairobi',
  postalCode: '00800',
  country: 'KE',
};
export const DEMO_PASSWORD = 'Demo1234!';

interface AuthPanelProps {
  mode: AuthMode;
  setMode: (m: AuthMode) => void;
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  showErrors: boolean;
  loginError: string;
  loggingIn: boolean;
  onLogin: () => void;
}

/** Signs the demo user in and pre-fills empty billing fields. The cart is untouched. */
export function useSignIn() {
  const { checkout, setAccount, setBilling } = useStore();
  return (provider: Account['provider'], email = DEMO_PROFILE.email) => {
    setAccount({ name: DEMO_PROFILE.name, email, provider });
    const b = checkout.billing;
    setBilling({
      fullName: b.fullName || DEMO_PROFILE.name,
      email,
      phone: b.phone || DEMO_PROFILE.phone,
      address: b.address || DEMO_PROFILE.address,
      city: b.city || DEMO_PROFILE.city,
      postalCode: b.postalCode || DEMO_PROFILE.postalCode,
      country: b.address ? b.country : DEMO_PROFILE.country,
    });
  };
}

export function AuthPanel(p: AuthPanelProps) {
  const completeSignIn = useSignIn();
  const [oauthLoading, setOauthLoading] = useState<Account['provider'] | null>(null);
  const [ssoOpen, setSsoOpen] = useState(false);
  const [ssoEmail, setSsoEmail] = useState('');
  const [ssoTouched, setSsoTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [pwTouched, setPwTouched] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const signIn = (provider: Account['provider'], email = DEMO_PROFILE.email) => {
    setOauthLoading(provider);
    // Simulated OAuth pop-up round-trip: no page change, so the cart stays put.
    setTimeout(() => {
      completeSignIn(provider, email);
      setOauthLoading(null);
    }, 900);
  };

  const emailErr = v.email(p.email);
  const showEmailErr = (emailTouched || p.showErrors) && !!emailErr;
  const pwErr = p.mode === 'signup' ? v.password(p.password) : p.password ? '' : 'Enter your password.';
  const showPwErr = (pwTouched || p.showErrors) && !!pwErr;
  const ssoErr = v.email(ssoEmail);

  const oauth = (
    <div>
      <div className="grid gap-2 sm:grid-cols-3">
        <Button variant="secondary" loading={oauthLoading === 'google'} disabled={!!oauthLoading} onClick={() => signIn('google')}>
          {oauthLoading !== 'google' && <GoogleMark size={16} />} Google
        </Button>
        <Button variant="secondary" loading={oauthLoading === 'github'} disabled={!!oauthLoading} onClick={() => signIn('github')}>
          {oauthLoading !== 'github' && <GitHubMark size={16} />} GitHub
        </Button>
        <Button variant="secondary" disabled={!!oauthLoading} onClick={() => setSsoOpen((o) => !o)} aria-expanded={ssoOpen}>
          <Key size={16} /> SSO
        </Button>
      </div>
      {ssoOpen && (
        <div className="mt-2 flex items-start gap-2 rounded-lg bg-gray-50 p-3">
          <TextField
            label="Work email"
            className="min-w-0 flex-1"
            type="email"
            autoComplete="email"
            value={ssoEmail}
            onChange={setSsoEmail}
            onBlur={() => setSsoTouched(true)}
            error={ssoTouched ? ssoErr : ''}
            hint="We’ll open your company’s sign-in page."
            placeholder="you@company.com"
          />
          <Button
            className="mt-[26px]"
            loading={oauthLoading === 'sso'}
            onClick={() => { setSsoTouched(true); if (!ssoErr) signIn('sso', ssoEmail.trim()); }}
          >
            Continue
          </Button>
        </div>
      )}
      <div className="mt-4 flex items-center gap-3 text-xs text-gray-500" aria-hidden="true">
        <span className="h-px flex-1 bg-gray-200" /> or with email <span className="h-px flex-1 bg-gray-200" />
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <Segmented
        label="How do you want to check out?"
        fullWidth
        value={p.mode}
        onChange={(m) => { p.setMode(m); setPwTouched(false); setResetSent(false); }}
        options={[
          { value: 'signup', label: 'New customer' },
          { value: 'guest', label: 'Guest' },
          { value: 'login', label: 'Log in' },
        ]}
      />

      {p.mode === 'guest' && <p className="text-[13px] text-gray-600">No password now. We’ll email your receipt and a link to finish setting up your account.</p>}
      {p.mode !== 'guest' && oauth}

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Email"
          type="email"
          inputMode="email"
          autoComplete={p.mode === 'login' ? 'username' : 'email'}
          value={p.email}
          onChange={p.setEmail}
          onBlur={() => setEmailTouched(true)}
          error={showEmailErr ? emailErr : ''}
          valid={emailTouched && !emailErr && p.mode !== 'login'}
          placeholder="name@company.com"
          className={p.mode === 'guest' ? 'sm:col-span-2' : undefined}
        />
        {p.mode !== 'guest' && (
          <div>
            <TextField
              label={p.mode === 'signup' ? 'Create password' : 'Password'}
              type={showPw ? 'text' : 'password'}
              autoComplete={p.mode === 'signup' ? 'new-password' : 'current-password'}
              value={p.password}
              onChange={p.setPassword}
              onBlur={() => setPwTouched(true)}
              error={showPwErr ? pwErr : ''}
              trailing={
                <button type="button" onClick={() => setShowPw((s) => !s)} className="min-h-11 rounded-md px-3 text-[13px] font-medium text-brand-700 hover:bg-brand-50 focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:outline-none sm:min-h-8" aria-label={showPw ? 'Hide password' : 'Show password'}>
                  {showPw ? 'Hide' : 'Show'}
                </button>
              }
            />
            {p.mode === 'signup' && <StrengthMeter value={p.password} />}
          </div>
        )}
      </div>

      {p.mode === 'login' && (
        <div className="space-y-3">
          {p.loginError && <Notice tone="error">{p.loginError}</Notice>}
          {resetSent && <Notice tone="success">If an account exists for {p.email}, a reset link is on its way.</Notice>}
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" onClick={p.onLogin} loading={p.loggingIn}>Log in</Button>
            <TextButton onClick={() => { setEmailTouched(true); if (!emailErr) setResetSent(true); }}>Forgot password?</TextButton>
          </div>
          <p className="text-xs text-gray-500">Demo: <span className="font-mono">{DEMO_PROFILE.email}</span> / <span className="font-mono">{DEMO_PASSWORD}</span></p>
        </div>
      )}
    </div>
  );
}

const BAR_COLORS = ['bg-gray-200', 'bg-red-600', 'bg-accent-400', 'bg-brand-600', 'bg-green-600'];
const LABEL_COLORS = ['text-gray-600', 'text-red-700', 'text-accent-800', 'text-brand-700', 'text-green-700'];

export function StrengthMeter({ value }: { value: string }) {
  const s = v.passwordStrength(value);
  if (!value) return <p className="mt-1.5 text-xs text-gray-500">At least 8 characters, mixing letters, numbers and symbols.</p>;
  return (
    <div className="mt-2" aria-live="polite">
      <div className="flex gap-1" aria-hidden="true">
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className={cx('h-1.5 flex-1 rounded-full transition-colors', i <= s.score ? BAR_COLORS[s.score] : 'bg-gray-200')} />
        ))}
      </div>
      <p className="mt-1 text-[13px] text-gray-700">
        Strength: <span className={cx('font-medium', LABEL_COLORS[s.score])}>{s.label}</span>
      </p>
      <ul className="mt-1 grid grid-cols-1 gap-x-3 gap-y-0.5 text-xs sm:grid-cols-2">
        {s.checks.map((c) => (
          <li key={c.label} className={cx('flex items-center gap-1', c.met ? 'text-green-700' : 'text-gray-600')}>
            {c.met ? <Check size={14} /> : <span className="inline-block h-3.5 w-3.5 rounded-full border border-gray-400" aria-hidden="true" />}
            <span>{c.label}<span className="sr-only">{c.met ? ' — done' : ' — not yet'}</span></span>
          </li>
        ))}
      </ul>
    </div>
  );
}
