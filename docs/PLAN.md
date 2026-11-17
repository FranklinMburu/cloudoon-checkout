# Architecture & build plan

## 1. Goal

Move every piece of business data and logic out of the frontend into a Django backend backed by PostgreSQL. The frontend becomes a thin client that renders what the API returns. Integrations we cannot connect to in a prototype (payments, OAuth providers, the domain registry) are **simulated on the backend**, behind the same interfaces a real integration would use, and are labelled as simulated.

## 2. Repository layout

```
frontend/                 React + TypeScript + Tailwind (AI Studio / Vite)
  src/api/                typed API client — the only place that talks to the backend
backend/
  config/                 Django project (settings split: base / local / production)
  catalog/                products, plans, TLDs, add-ons, locations, currencies, countries, promos
  pricing/                quote engine (pure Python, Decimal) + /quote endpoint
  domains/                availability check (simulated registry)
  accounts/               registration, login, logout, session user, simulated OAuth
  orders/                 order creation (re-priced server-side, idempotent), payment (simulated)
  manage.py
  requirements.txt
docker-compose.yml        local PostgreSQL
render.yaml               deployment: web service + PostgreSQL
```

## 3. Data model (PostgreSQL)

All money is stored as `Decimal` in **USD** (`NUMERIC(10,2)`); conversion happens at quote time.

| Model | Key fields | Notes |
|---|---|---|
| `Currency` | code (PK, ISO 4217), name, symbol, rate_per_usd `NUMERIC(12,4)`, decimals | KES has 0 decimals |
| `Country` | code (PK, ISO 3166), name, tax_name, tax_rate `NUMERIC(5,4)`, default_currency → Currency | |
| `BillingCycle` | months (PK: 1, 12, 24, 36) | |
| `ProductCategory` | slug (shared, vps, dedicated, cloud), name, tagline, sort_order | |
| `CycleDiscount` | category → ProductCategory, cycle → BillingCycle, percent | unique (category, cycle) |
| `SharedPlan` | slug, name, description, monthly_usd, features (JSON), is_popular | |
| `VpsPricing` | per_cpu, per_ram_gb, per_storage_gb, managed_fee, limits | singleton row |
| `OperatingSystem` | slug, name, version, monthly_usd, min_cpu, min_ram_gb | |
| `DataCenter` | slug, city, country | |
| `DedicatedServer` | slug, name, cpu, ram, storage, monthly_usd | |
| `ServerStock` | server → DedicatedServer, datacenter → DataCenter, in_stock | unique (server, datacenter) |
| `BandwidthPackage` | slug, name, monthly_usd | |
| `CloudSize` / `ScalingPreset` | sizes: cpu, ram, storage, monthly_usd · presets: min, max, cpu_threshold | |
| `AddOn` | slug (backups, cdn, ddos_advanced, email_box, k8s, k8s_lb, k8s_registry), name, monthly_usd, unit | |
| `SslOption` | slug, name, description, monthly_usd | |
| `Tld` | tld (unique), register_usd, renew_usd, transfer_usd, privacy_supported, free_with_hosting | |
| `Promo` | code (unique), label, percent, applies_to (all/hosting), valid_until | expired → clear error |
| `User` | Django `AbstractUser`, email unique, login by email | |
| `Order` | id (UUID), user → User (nullable for guest), email, status, currency, totals, billing address fields, idempotency_key (unique), created_at | |
| `OrderItem` | order → Order, kind, title, details, term_months, due_today, renewal_amount, renewal_label, auto_renew | snapshot of the quote at purchase time |

Catalog data is loaded from a fixture (`catalog/fixtures/catalog.json`) so every environment starts identical; edits go through Django admin.

## 4. API (Django REST Framework, JSON, `/api/v1/`)

| Method & path | Purpose | Auth |
|---|---|---|
| `GET /catalog/` | Everything the configurator needs (categories, plans, OS, servers + stock, bandwidth, cloud sizes, presets, add-ons, SSL, TLDs, currencies, countries, cycles + discounts) | public, cacheable |
| `POST /quote/` | Cart in → line items, subtotal, savings, promo, tax, total, renewals (server is the source of truth for money) | public |
| `POST /promos/validate/` | Code → label / error (`invalid`, `expired`) | public |
| `GET /domains/check/?q=` | Availability for the exact name + other TLDs (simulated registry, deterministic) | public, rate-limited |
| `GET /addresses/?q=` | Address suggestions (simulated lookup) | public, rate-limited |
| `POST /auth/register/` | Email + password (Django password validators) | public |
| `POST /auth/login/` · `POST /auth/logout/` | Session cookie (HttpOnly, Secure, SameSite) + CSRF | public / user |
| `POST /auth/oauth/{google,github,sso}/` | Simulated provider callback → session | public |
| `GET /auth/me/` | Current user or 401 | user |
| `POST /orders/` | Cart + billing + payment method + `Idempotency-Key` header → re-price, create order, simulated charge | user or guest email |
| `GET /orders/{id}/` | Order receipt | owner only |

**Authentication** = who you are (session login). **Authorization** = what you may do (e.g. `GET /orders/{id}` only for the order's owner; admin for catalog edits).

## 5. Pricing rules (ported from `frontend/src/lib/pricing.ts`)

- Hosting intro price = regular monthly × (1 − cycle discount for the category); renews at the regular monthly rate.
- Each line is converted and **rounded in the target currency** before summing, so lines always add up to the total.
- Add-ons: flat monthly × months, same price at renewal. Windows licence, bandwidth upgrades and Kubernetes add-ons are separate lines.
- Domains: yearly. One free registration (first year) for Shared Hosting on 12+ months with an eligible TLD.
- Promo applies to the first term only (all items, or hosting only). Tax is charged on the amount after promo, at the billing country's rate.
- The existing frontend fuzz invariants (lines sum to subtotal; subtotal − promo + tax = total; correct precision) become pytest tests.

## 6. Frontend changes

- Delete `src/data/catalog.ts`, `src/lib/pricing.ts` and `src/lib/domainSearch.ts`; add `src/api/` (typed client, `VITE_API_URL`).
- Load the catalog once (skeleton while loading, error state with retry); request a quote on every cart change (debounced; keep the last total visible while recalculating).
- Login / sign-up / OAuth / orders call the API; keep cart state client-side and persisted.
- Store only the cart locally; billing details stay in memory/sessionStorage.

## 7. Frontend follow-ups (from review)

1. Progressive disclosure on step 1: Domain and Add-ons collapse to one-line rows until opened.
2. Amber only on the conversion button; discount badges in a light amber variant.
3. Replace `text-gray-400` text with `text-gray-500` (contrast).
4. Hosting line removable from the summary (empty state, Continue disabled).
5. Payment step states the cloud burst rate and "promo applies to the first term only".
6. Validate/migrate persisted cart on load + error boundary; clear cart after a placed order.
7. Plan card prices aligned; SSL options as list rows; OAuth buttons in one row on mobile.
8. One CTA on the Log in tab; tax labelled "Estimated" until billing country is set.
9. Locale-aware money formatting per currency.
10. README refresh after the API migration.

## 8. Deployment

Render: one web service (`gunicorn config.wsgi`, `collectstatic`, `migrate`, `loaddata catalog`) + a managed PostgreSQL instance. `CORS_ALLOWED_ORIGINS` / `CSRF_TRUSTED_ORIGINS` include the AI Studio app origin and localhost. The frontend reads the API base URL from `VITE_API_URL`.
