# Cloudoon Checkout

A three-step checkout for web hosting: shared, VPS, dedicated and cloud hosting, plus domains and add-ons. It has multi-currency pricing, billing cycles of 1, 12, 24 or 36 months, sign-in on the same page, and an order summary that stays on screen.

**Try it:** [cloudoon-checkout.onrender.com](https://cloudoon-checkout.onrender.com) · **API:** [cloudoon-checkout-api.onrender.com/api/v1/health/](https://cloudoon-checkout-api.onrender.com/api/v1/health/)

| Try | Use |
|---|---|
| Card (Stripe test mode) | `4242 4242 4242 4242`, any future date, any CVC · declined: `4000 0000 0000 0002` |
| Returning customer | `demo@cloudoon.com` / `Demo1234!`, or Google / GitHub sign-in |
| Promo codes | `WELCOME10`, `HOSTING25`, `SUMMER24` (expired) |

## How it's built

| Part | Stack | Folder |
|---|---|---|
| Frontend | React 19, TypeScript, Tailwind | [`frontend/`](frontend/) |
| Backend | Django 5, Django REST Framework, PostgreSQL | [`backend/`](backend/) |

- **The backend owns all data and every calculation:** catalog, prices, tax, promos, quotes and orders. The browser has no prices; it shows what the API returns.
- **Money is `Decimal`** on the server and a string in JSON. It is never a float.
- **Orders are re-priced on the server and idempotent.** The `Idempotency-Key` header and a unique database constraint make sure a double click or a retry can never charge twice.
- More detail: [architecture](docs/ARCHITECTURE.md), [backend and API](backend/README.md), [frontend and design decisions](frontend/README.md), [contributing](CONTRIBUTING.md).

## Integrations

| What | Provider | Code |
|---|---|---|
| Card payments | Stripe (test mode): Elements in the browser, PaymentIntents on the server | `backend/orders/payments/card.py` |
| M-Pesa | Safaricom Daraja: STK push, callback and status query | `backend/orders/payments/mpesa.py` |
| PayPal | PayPal Orders v2 | `backend/orders/payments/paypal.py` |
| Sign-in | Google, GitHub and Google Workspace SSO (OAuth 2.0) | `backend/accounts/oauth.py` |
| Domain availability | The registries: RDAP, with WHOIS for `.ke` | `backend/domains/registry.py` |
| Address suggestions | OpenStreetMap (Photon) | `backend/accounts/address_lookup.py` |

Each provider is switched on by its API keys. The checkout only offers the ones that are configured (`GET /api/v1/config/`).

## Quality checks

- **CI** ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)):
  - Backend: Ruff, Django checks, a migration check, and about 830 tests on PostgreSQL.
  - Frontend: ESLint, then the type-check and build.
- **Postman:** import [`docs/postman/`](docs/postman/) and click **Run collection**. Every endpoint has status-code and body checks.
- **Google AI Studio:** AI Studio imports an app from the root of a repository's `main` branch, so [`cloudoon-checkout-web`](https://github.com/FranklinMburu/cloudoon-checkout-web) holds `frontend/` on its own. Update it with `git subtree split --prefix frontend -b web-only && git push <web repo> web-only:main`.

## Run locally

```bash
docker compose up -d                                  # PostgreSQL
cd backend && pip install -r requirements-dev.txt
export DEBUG=True && python manage.py migrate && python manage.py seed && python manage.py runserver
cd ../frontend && npm install && VITE_API_URL=http://localhost:8000 npm run dev
```

The API runs on Render's free tier. A scheduled ping keeps it awake; if it has been idle, the first request can take about 50 seconds.
