# Backend — Django REST API

Django 5 + Django REST Framework + PostgreSQL. It is the single source of truth for the catalog, prices, quotes, domain availability, accounts and orders.

## Run locally

```bash
docker compose up -d                      # PostgreSQL on :5432 (from the repo root)
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
export DEBUG=True                         # Windows: set DEBUG=True — settings default to DEBUG off
python manage.py migrate
python manage.py seed                     # catalog + demo user (demo@cloudoon.com / Demo1234!); skips the catalog if one exists
python manage.py seed --reset             # reload the catalog fixture, discarding admin edits
python manage.py runserver                # http://localhost:8000/api/v1/
pytest                                    # engine + API tests
ruff check . && ruff format --check .     # lint + format (same as CI)
```

Admin: `python manage.py createsuperuser`, then http://localhost:8000/admin/ to edit plans, prices, TLDs and promos.

## Apps

| App | Responsibility |
|---|---|
| `catalog` | Models for every product, price, currency, country/tax rate and promo; the priced catalog endpoint; `seed` command |
| `pricing` | `catalog.py` (catalog data as plain dataclasses) and `engine.py` (pure-Python `Decimal` pricing, no Django imports) · `loader.py` reads the catalog from the database with a short cache cleared on every admin edit · quote and promo endpoints |
| `domains` | Domain availability from the registries (RDAP, WHOIS fallback), cached for ten minutes |
| `accounts` | Register, login, logout, me, password reset, Google / GitHub / SSO sign-in (`oauth.py`), address suggestions (`address_lookup.py`) |
| `orders` | `services.place_order` (re-price → reserve → charge → mark paid); `payments/` has one module per provider (Stripe, M-Pesa, PayPal); views are thin HTTP wrappers |

## API — `/api/v1/`

| Method | Path | Notes |
|---|---|---|
| GET | `catalog/?currency=KES&cycle=12` | Everything the configurator shows, priced for display, plus the default cart |
| POST | `quote/` | Cart → line items, renewals, savings, promo, tax, total, per-cycle prices |
| POST | `promos/validate/` | `{code}` → label, or 400 with the reason (invalid / expired) |
| GET | `domains/check/?q=` | Exact name + the other extensions |
| GET | `config/` | Which sign-in and payment options are switched on, and the public keys the browser SDKs need |
| GET | `addresses/?q=&country=KE` | Address suggestions, billing country first |
| POST | `auth/register/` · `auth/login/` | → `{token, user}`; send `Authorization: Token <token>` afterwards |
| GET | `auth/oauth/{google,github,sso}/start/?nonce=` | Opened in a popup; redirects to the provider |
| POST | `auth/oauth/result/` | `{nonce}` → 202 while signing in, then `{token, user}` once |
| POST | `auth/logout/` · GET `auth/me/` | Authenticated |
| POST | `auth/password-reset/` | Always 202 (no account enumeration) |
| POST | `orders/` | Header `Idempotency-Key`; body `{cart, billing, payment, accept_terms}` → 201 paid · 202 waiting for M-Pesa · 200 repeated key (current status) · 402 declined · 409 domain just taken |
| POST | `payments/paypal/orders/` | `{cart}` → `{id}` of the PayPal order to approve |
| POST | `payments/mpesa/callback/<token>/` | Called by Safaricom |
| GET | `orders/{reference}/` | Signed-in owner only. Guest receipts are returned once, by `POST /orders/` |

Money is always returned as a string (`"86.28"`), never a float.

## Design notes

- **Money**: stored in USD as `NUMERIC`; converted and rounded per line in the target currency with `ROUND_HALF_UP`, so lines always sum to the total. A parity check against the original TypeScript engine (3,000 random carts) matched in 2,972 cases; the other 28 were half-cent cases where floating point rounded *down* incorrectly (e.g. 201.555 → 201.55) — `Decimal` gives 201.56.
- **Never trust the client's total**: `POST /orders/` re-prices the cart before charging.
- **Persist before charging**: the order is written as `pending`, the gateway is charged with the same idempotency key, then the order becomes `paid`, all in one transaction. A decline rolls everything back and returns 402, so the same key can be retried.
- **Database guards**: check constraints keep totals non-negative and reconciled (`total = subtotal − discount + tax`), and VPS pricing is a single-row table.
- **Idempotency**: a unique `idempotency_key` per order means a refresh, double click or retry can't charge twice (also safe under a race, via the unique constraint).
- **Authentication vs authorization**: tokens prove *who* you are; queryset filtering decides *what* you may read (your own orders only).
- **Integrations are switched on by keys** (`STRIPE_*`, `MPESA_*`, `PAYPAL_*`, `GOOGLE_*`, `GITHUB_*`); unconfigured ones are simply not offered. Tests stub each provider at its HTTP boundary.
- **M-Pesa is asynchronous**: the order stays `pending` until Safaricom's callback; if the callback is lost, polling the same `Idempotency-Key` triggers an STK status query (at most every 10 s).
