# Backend — Django REST API

Django 5 + Django REST Framework + PostgreSQL. It is the single source of truth for the catalog, prices, quotes, domain availability, accounts and orders.

## Run locally

```bash
docker compose up -d                      # PostgreSQL on :5432 (from the repo root)
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
python manage.py migrate
python manage.py seed                     # catalog + demo user (demo@cloudoon.com / Demo1234!)
python manage.py runserver                # http://localhost:8000/api/v1/
pytest                                    # engine + API tests
```

Admin: `python manage.py createsuperuser`, then http://localhost:8000/admin/ to edit plans, prices, TLDs and promos.

## Apps

| App | Responsibility |
|---|---|
| `catalog` | Models for every product, price, currency, country/tax rate and promo; the priced catalog endpoint; `seed` command |
| `pricing` | `engine.py`: pure-Python `Decimal` pricing (no Django imports) · quote and promo endpoints |
| `domains` | Domain availability (simulated registry, deterministic) |
| `accounts` | Register, login, logout, me, password reset, simulated OAuth, address lookup |
| `orders` | Order creation (re-priced server-side, idempotent), simulated payment gateway, receipts |

## API — `/api/v1/`

| Method | Path | Notes |
|---|---|---|
| GET | `catalog/?currency=KES&cycle=12` | Everything the configurator shows, priced for display, plus the default cart |
| POST | `quote/` | Cart → line items, renewals, savings, promo, tax, total, per-cycle prices |
| POST | `promos/validate/` | `{code}` → label, or 400 with the reason (invalid / expired) |
| GET | `domains/check/?q=` | Exact name + the other extensions |
| GET | `addresses/?q=` | Address suggestions |
| POST | `auth/register/` · `auth/login/` · `auth/oauth/{google,github,sso}/` | → `{token, user}`; send `Authorization: Token <token>` afterwards |
| POST | `auth/logout/` · GET `auth/me/` | Authenticated |
| POST | `auth/password-reset/` | Always 202 (no account enumeration) |
| POST | `orders/` | Header `Idempotency-Key`; body `{cart, billing, payment, accept_terms}` → 201, or 200 for a repeated key, 402 if declined |
| GET | `orders/{reference}/` | Owner only (guest orders by their unguessable reference) |

Money is always returned as a string (`"86.28"`), never a float.

## Design notes

- **Money**: stored in USD as `NUMERIC`; converted and rounded per line in the target currency with `ROUND_HALF_UP`, so lines always sum to the total. A parity check against the original TypeScript engine (3,000 random carts) matched in 2,972 cases; the other 28 were half-cent cases where floating point rounded *down* incorrectly (e.g. 201.555 → 201.55) — `Decimal` gives 201.56.
- **Never trust the client's total**: `POST /orders/` re-prices the cart before charging.
- **Idempotency**: a unique `idempotency_key` per order means a refresh, double click or retry can't charge twice (also safe under a race, via the unique constraint).
- **Authentication vs authorization**: tokens prove *who* you are; queryset filtering decides *what* you may read (your own orders only).
- **Simulated integrations** (clearly marked in code and responses): registrar, payments (Stripe-style test tokens `tok_visa` / `tok_chargeDeclined`, M-Pesa, PayPal), OAuth providers and address lookup. Each sits behind one function so a real SDK can replace it without touching views.
