"""Sign in with Google or GitHub: the OAuth 2.0 authorization-code flow.

1. The checkout opens a popup at `auth/oauth/<provider>/start/?origin=<checkout origin>`.
2. `authorize_url()` sends the customer to the provider with a signed `state` that
   carries the checkout's origin and expires in ten minutes. That blocks forged
   callbacks (CSRF) and redirects to sites we don't own.
3. The provider redirects back to `callback/` with a one-time `code`. We exchange it
   server-side (the client secret never reaches a browser) and read the verified email.
4. The popup hands a single-use ticket to the checkout window, which trades it for
   an API token (`POST auth/oauth/ticket/`).

Company SSO uses Google Workspace: `hd` limits the Google account picker to the
company's domain, and we check the returned `hd` claim because the picker hint alone
can be bypassed.
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass
from urllib.parse import urlencode

import requests
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core import signing
from django.core.cache import cache

TIMEOUT_SECONDS = 8
STATE_MAX_AGE = 10 * 60
TICKET_MAX_AGE = 2 * 60
PERSONAL_EMAIL_DOMAINS = {"gmail.com", "googlemail.com", "outlook.com", "hotmail.com", "yahoo.com", "icloud.com"}


class OAuthError(Exception):
    """Shown to the customer in the popup; nothing has been signed in."""


@dataclass(frozen=True)
class Provider:
    name: str
    authorize_url: str
    token_url: str
    scope: str
    client_id: str
    client_secret: str

    @property
    def configured(self) -> bool:
        return bool(self.client_id and self.client_secret)


def providers() -> dict[str, Provider]:
    return {
        "google": Provider(
            name="google",
            authorize_url="https://accounts.google.com/o/oauth2/v2/auth",
            token_url="https://oauth2.googleapis.com/token",
            scope="openid email profile",
            client_id=settings.GOOGLE_CLIENT_ID,
            client_secret=settings.GOOGLE_CLIENT_SECRET,
        ),
        "github": Provider(
            name="github",
            authorize_url="https://github.com/login/oauth/authorize",
            token_url="https://github.com/login/oauth/access_token",
            scope="read:user user:email",
            client_id=settings.GITHUB_CLIENT_ID,
            client_secret=settings.GITHUB_CLIENT_SECRET,
        ),
    }


def enabled_methods() -> list[str]:
    """What the checkout should offer: SSO rides on the Google client."""
    available = providers()
    methods = [name for name, provider in available.items() if provider.configured]
    if available["google"].configured:
        methods.append("sso")
    return methods


def authorize_url(method: str, origin: str, redirect_uri: str, work_email: str = "") -> str:
    provider = providers()["google" if method == "sso" else method]
    if not provider.configured:
        raise OAuthError("This sign-in option isn’t available right now.")

    state = {"origin": origin, "method": method}
    params = {
        "client_id": provider.client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": provider.scope,
    }
    if method == "sso":
        domain = work_email.rpartition("@")[2].lower()
        if not domain or domain in PERSONAL_EMAIL_DOMAINS:
            raise OAuthError("Company sign-in needs your work email, e.g. you@yourcompany.com.")
        state["domain"] = domain
        params.update(hd=domain, login_hint=work_email)
    elif method == "google":
        params["prompt"] = "select_account"

    params["state"] = signing.dumps(state, salt="oauth-state")
    return f"{provider.authorize_url}?{urlencode(params)}"


def read_state(state: str) -> dict:
    try:
        return signing.loads(state, salt="oauth-state", max_age=STATE_MAX_AGE)
    except signing.BadSignature as exc:
        raise OAuthError("This sign-in link has expired. Close this window and try again.") from exc


def sign_in(state: dict, code: str, redirect_uri: str):
    """Exchange the code, then find or create the customer's account."""
    method = state["method"]
    provider = providers()["google" if method == "sso" else method]
    access_token = _exchange_code(provider, code, redirect_uri)
    profile = _google_profile(access_token) if provider.name == "google" else _github_profile(access_token)

    if method == "sso" and profile.get("hd") != state["domain"]:
        raise OAuthError(f"Use your {state['domain']} Google Workspace account to sign in with SSO.")

    email = profile["email"].lower()
    first, _, last = profile.get("name", "").strip().partition(" ")
    user, created = get_user_model().objects.get_or_create(
        username=email, defaults={"email": email, "first_name": first[:150], "last_name": last[:150]}
    )
    if created:
        user.set_unusable_password()
        user.save(update_fields=["password"])
    return user


def issue_ticket(user, method: str) -> str:
    return signing.dumps({"user": user.pk, "method": method}, salt="oauth-ticket")


def redeem_ticket(ticket: str) -> tuple[int, str]:
    """Returns `(user_id, method)`. Each ticket works once, within two minutes."""
    try:
        data = signing.loads(ticket, salt="oauth-ticket", max_age=TICKET_MAX_AGE)
    except signing.BadSignature as exc:
        raise OAuthError("This sign-in has expired. Please try again.") from exc
    used_key = "oauth-ticket-used:" + hashlib.sha256(ticket.encode()).hexdigest()
    if not cache.add(used_key, True, TICKET_MAX_AGE):
        raise OAuthError("This sign-in was already used. Please try again.")
    return data["user"], data["method"]


def _exchange_code(provider: Provider, code: str, redirect_uri: str) -> str:
    try:
        response = requests.post(
            provider.token_url,
            data={
                "client_id": provider.client_id,
                "client_secret": provider.client_secret,
                "code": code,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
            headers={"Accept": "application/json"},
            timeout=TIMEOUT_SECONDS,
        )
        token = response.json().get("access_token")
    except (requests.RequestException, ValueError) as exc:
        raise OAuthError("We couldn’t reach the sign-in provider. Please try again.") from exc
    if not token:
        raise OAuthError("Sign-in was cancelled or has expired. Please try again.")
    return token


def _google_profile(access_token: str) -> dict:
    profile = _get_json("https://openidconnect.googleapis.com/v1/userinfo", access_token)
    if not profile.get("email") or not profile.get("email_verified"):
        raise OAuthError("Your Google account has no verified email address.")
    return profile


def _github_profile(access_token: str) -> dict:
    emails = _get_json("https://api.github.com/user/emails", access_token)
    email = next((e["email"] for e in emails if e.get("primary") and e.get("verified")), None)
    if not email:
        raise OAuthError("Your GitHub account has no verified primary email address.")
    user = _get_json("https://api.github.com/user", access_token)
    return {"email": email, "name": user.get("name") or ""}


def _get_json(url: str, access_token: str):
    try:
        response = requests.get(url, headers={"Authorization": f"Bearer {access_token}"}, timeout=TIMEOUT_SECONDS)
        response.raise_for_status()
        return response.json()
    except (requests.RequestException, ValueError) as exc:
        raise OAuthError("We couldn’t read your profile from the sign-in provider. Please try again.") from exc
