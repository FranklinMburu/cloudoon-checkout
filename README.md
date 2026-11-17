# Cloudoon Checkout

End-to-end web hosting product selection and checkout: shared, VPS, dedicated and cloud hosting, domains, add-ons, multi-currency billing cycles, inline authentication and a persistent order summary.

| Part | Stack | Folder |
|---|---|---|
| Frontend | React + TypeScript + Tailwind (runs in Google AI Studio or Vite) | [`frontend/`](frontend/) |
| Backend | Django + Django REST Framework + PostgreSQL | [`backend/`](backend/) |

The backend is the single source of truth: the catalog, prices, currencies, tax rates, promo codes, quotes, domain availability, accounts and orders all come from the API. The frontend only displays what the API returns.

- Frontend details, design decisions and demo data: [`frontend/README.md`](frontend/README.md)
- Architecture and build plan: [`docs/PLAN.md`](docs/PLAN.md)

## Status

- [x] Frontend: 3-step checkout, all UI states, 375px & 1440px
- [x] Backend: Django REST API, PostgreSQL schema, token auth, idempotent orders
- [x] Frontend reads everything from the API (no product or price data in the browser)
- [x] CI: Django checks, migration check, 811 tests on PostgreSQL, frontend type-check and build
- [ ] Deployment (Render: API + PostgreSQL + static frontend)

## Quick start

```bash
docker compose up -d                                   # PostgreSQL
cd backend && pip install -r requirements-dev.txt
python manage.py migrate && python manage.py seed && python manage.py runserver
cd ../frontend && npm install && VITE_API_URL=http://localhost:8000 npm run dev
```

Simulated integrations (clearly marked in code and API responses): domain registry, payment gateway, OAuth providers and address lookup. Each sits behind a single backend function, so a real provider can replace it without touching the rest.
