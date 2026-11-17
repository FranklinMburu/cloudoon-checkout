// "Continue with Google / GitHub / SSO": the provider's page opens in a popup, so the
// checkout (and the cart) stay exactly where they are. The backend parks the result
// under a one-time nonce and we poll for it; see backend/accounts/oauth.py.

import { ApiError, api } from '../api/client';
import type { Account, SignInMethod } from '../api/types';

const POLL_MS = 1500;
const GIVE_UP_MS = 10 * 60 * 1000; // matches how long the backend keeps the result

export interface PopupSignIn {
  result: Promise<Account>;
  cancel: () => void;
}

export function signInWithPopup(method: SignInMethod, email?: string): PopupSignIn {
  const nonce = randomNonce();
  const popup = window.open(api.oauthStartUrl(method, nonce, email), 'cloudoon-sign-in', popupFeatures());
  let cancelled = false;

  const result = (async () => {
    if (!popup) throw new ApiError(0, 'Your browser blocked the sign-in window. Allow pop-ups for this site and try again.');
    const started = Date.now();
    while (!cancelled && Date.now() - started < GIVE_UP_MS) {
      await new Promise((resolve) => setTimeout(resolve, POLL_MS));
      if (cancelled) break;
      const account = await api.oauthResult(nonce);
      if (account) return account;
    }
    throw new ApiError(0, cancelled ? '' : 'Sign-in timed out. Please try again.');
  })();

  return {
    result,
    cancel: () => {
      cancelled = true;
      popup?.close();
    },
  };
}

function randomNonce() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function popupFeatures() {
  const width = 480;
  const height = 640;
  const left = window.screenX + Math.max(0, (window.outerWidth - width) / 2);
  const top = window.screenY + Math.max(0, (window.outerHeight - height) / 2);
  return `popup,width=${width},height=${height},left=${left},top=${top}`;
}
