# Contributing

## Setup

See [`backend/README.md`](backend/README.md) and [`frontend/README.md`](frontend/README.md). The short version:

```bash
docker compose up -d
cd backend && pip install -r requirements-dev.txt && export DEBUG=True && python manage.py migrate && python manage.py seed && python manage.py runserver
cd frontend && npm install && VITE_API_URL=http://localhost:8000 npm run dev
```

## Before you push

CI runs exactly these. Run them locally first:

| Backend (`backend/`) | Frontend (`frontend/`) |
|---|---|
| `ruff check . && ruff format --check .` | `npm run lint` |
| `python manage.py makemigrations --check` | `npm run build` (type-check + build) |
| `pytest` | |

## Conventions

- **Money** is `Decimal` in Python and a decimal string in JSON. Never use floats.
- **Pricing rules** live only in `backend/pricing/engine.py`. Put a test beside every rule in `tests/test_engine.py`.
- **Views stay thin.** Business logic belongs in a service module (`orders/services.py`, `domains/service.py`).
- **Frontend data** comes only through `src/api/client.ts`. Don't hard-code product or price data in components.
- **UI primitives** live in `src/components/ui/`. Reuse them so focus rings, 44 px touch targets and error states stay consistent.
- **Commits** are small and focused, with an imperative subject line ("Charge after the order is persisted").
