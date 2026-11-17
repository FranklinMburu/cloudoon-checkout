# Cloudoon Checkout

End-to-end web hosting product selection and checkout: shared, VPS, dedicated and cloud hosting, domains, add-ons, multi-currency billing cycles, inline authentication and a persistent order summary.

| Part | Stack | Folder |
|---|---|---|
| Frontend | React + TypeScript + Tailwind (runs in Google AI Studio or Vite) | [`frontend/`](frontend/) |
| Backend | Django + Django REST Framework + PostgreSQL | [`backend/`](backend/) |

The backend is the single source of truth: the catalog, prices, currencies, tax rates, promo codes, quotes, domain availability, accounts and orders all come from the API. The frontend only displays what the API returns.

- Frontend details, design decisions and demo data: [`frontend/README.md`](frontend/README.md)
- Backend API, setup and design notes: [`backend/README.md`](backend/README.md)
- How the pieces fit together: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- Working on the code: [`CONTRIBUTING.md`](CONTRIBUTING.md)

## Status

- [x] Frontend: 3-step checkout, all UI states, 375px & 1440px
- [x] Backend: Django REST API, PostgreSQL schema, token auth, idempotent orders
- [x] Frontend reads everything from the API (no product or price data in the browser)
- [x] CI: Ruff, Django checks, migration check, tests on PostgreSQL, ESLint, frontend type-check and build
- [x] Deployed on Render: [checkout](https://cloudoon-checkout.onrender.com) · [API](https://cloudoon-checkout-api.onrender.com/api/v1/) (free tier: the first request after idle takes ~50 s)

## Google AI Studio

AI Studio imports an app from the root of a branch, so the [`ai-studio`](../../tree/ai-studio) branch mirrors `frontend/`. A GitHub Action rebuilds it on every push to `main`. In AI Studio, choose **Import from GitHub**, pick this repository and the `ai-studio` branch.

## Quick start

```bash
docker compose up -d                                   # PostgreSQL
cd backend && pip install -r requirements-dev.txt
export DEBUG=True                                      # settings default to production-safe
python manage.py migrate && python manage.py seed && python manage.py runserver
cd ../frontend && npm install && VITE_API_URL=http://localhost:8000 npm run dev
```

## Integrations

| What | Provider | Code |
|---|---|---|
| Card payments | Stripe (test mode): Stripe.js Elements in the browser, PaymentIntents on the server | `backend/orders/payments/card.py` |
| M-Pesa | Safaricom Daraja sandbox: STK push, callback, status query | `backend/orders/payments/mpesa.py` |
| PayPal | PayPal Orders v2 sandbox | `backend/orders/payments/paypal.py` |
| Sign-in | Google, GitHub and Google Workspace SSO (OAuth 2.0 authorization code) | `backend/accounts/oauth.py` |
| Domain availability | The registries themselves: RDAP, WHOIS for `.ke` | `backend/domains/registry.py` |
| Address suggestions | OpenStreetMap (Photon) | `backend/accounts/address_lookup.py` |

Each provider is switched on by its keys (see `render.yaml`); the checkout only offers what is configured (`GET /api/v1/config/`). Tests replace every provider at its boundary, so CI never calls them.

## API tests in Postman

Import [`docs/postman/`](docs/postman/) (collection + environment) and click **Run collection**: every endpoint, with status-code and body checks.
