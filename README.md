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

- [x] Frontend prototype (3-step checkout, all UI states, 375px & 1440px)
- [ ] Backend API, database schema, auth and tests
- [ ] Frontend reading from the API
- [ ] Deployment (Render: API + PostgreSQL)
