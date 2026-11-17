import { useEffect, useRef, useState } from 'react';
import { ApiError, api } from '../../api/client';
import type { Account, SignInMethod } from '../../api/types';
import { signInWithPopup, type PopupSignIn } from '../../lib/oauthPopup';
import * as v from '../../lib/validation';
import { useStore } from '../../state/store';
import { Check, GitHubMark, GoogleMark, Key } from '../../components/icons';
import { Button, Notice, Segmented, TextButton, TextField, cx } from '../../components/ui';

export type AuthMode = 'signup' | 'guest' | 'login';

/** Shown so reviewers can try the returning-customer path; the account is created by `manage.py seed`. */
export const DEMO_LOGIN = { email: 'demo@cloudoon.com', password: 'Demo1234!' };

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

/** Stores the signed-in account and fills empty billing fields from it. The cart is untouched. */
export function useSignIn() {
  const { checkout, setAccount, setBilling } = useStore();
  return (account: Account) => {
    setAccount(account);
    setBilling({ email: account.email, full_name: checkout.billing.full_name || (account.name !== account.email ? account.name : '') });
  };
}

export function AuthPanel(p: AuthPanelProps) {
  const completeSignIn = useSignIn();
  const { config } = useStore();
  const [oauthLoading, setOauthLoading] = useState<SignInMethod | null>(null);
  const [oauthError, setOauthError] = useState('');
  const [ssoOpen, setSsoOpen] = useState(false);
  const [ssoEmail, setSsoEmail] = useState('');
  const [ssoTouched, setSsoTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [pwTouched, setPwTouched] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  // The provider's page opens in a popup, so this page (and the cart) never reloads.
  const popup = useRef<PopupSignIn | null>(null);
  useEffect(() => () => popup.current?.cancel(), []);

  const signIn = async (method: SignInMethod, email?: string) => {
    popup.current?.cancel();
    const attempt = signInWithPopup(method, email);
    popup.current = attempt;
    setOauthLoading(method);
    setOauthError('');
    try {
      completeSignIn(await attempt.result);
    } catch (err) {
      if (popup.current !== attempt) return; // replaced by a newer attempt
      setOauthError(err instanceof ApiError ? err.message : 'Sign-in failed. Try again.');
    } finally {
      if (popup.current === attempt) {
        popup.current = null;
        setOauthLoading(null);
      }
    }
  };

  const cancelSignIn = () => {
    popup.current?.cancel();
    popup.current = null;
    setOauthLoading(null);
  };

  const emailErr = v.email(p.email);
  const showEmailErr = (emailTouched || p.showErrors) && !!emailErr;
  const pwErr = p.mode === 'signup' ? v.password(p.password) : p.password ? '' : 'Enter your password.';
  const showPwErr = (pwTouched || p.showErrors) && !!pwErr;
  const ssoErr = v.email(ssoEmail);

  const methods = config?.sign_in ?? [];
  const oauth = methods.length > 0 && (
    <div>
      <div className={cx('grid gap-2', methods.length === 3 && 'sm:grid-cols-3', methods.length === 2 && 'sm:grid-cols-2')}>
        {methods.includes('google') && (
          <Button variant="secondary" loading={oauthLoading === 'google'} disabled={!!oauthLoading} onClick={() => signIn('google')}>
            {oauthLoading !== 'google' && <GoogleMark size={16} />} Google
          </Button>
        )}
        {methods.includes('github') && (
          <Button variant="secondary" loading={oauthLoading === 'github'} disabled={!!oauthLoading} onClick={() => signIn('github')}>
            {oauthLoading !== 'github' && <GitHubMark size={16} />} GitHub
          </Button>
        )}
        {methods.includes('sso') && (
          <Button variant="secondary" disabled={!!oauthLoading} onClick={() => setSsoOpen((o) => !o)} aria-expanded={ssoOpen}>
            <Key size={16} /> SSO
          </Button>
        )}
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
            hint="For companies that use Google Workspace."
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
      {oauthLoading && (
        <p className="mt-2 text-[13px] text-gray-600" role="status">
          Finish signing in in the pop-up window. <TextButton onClick={cancelSignIn}>Cancel</TextButton>
        </p>
      )}
      {oauthError && <Notice tone="error" className="mt-2">{oauthError}</Notice>}
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
            <TextButton onClick={async () => { setEmailTouched(true); if (!emailErr) { await api.passwordReset(p.email).catch(() => null); setResetSent(true); } }}>Forgot password?</TextButton>
          </div>
          <p className="text-xs text-gray-500">Demo account: <span className="font-mono">{DEMO_LOGIN.email}</span> / <span className="font-mono">{DEMO_LOGIN.password}</span></p>
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
