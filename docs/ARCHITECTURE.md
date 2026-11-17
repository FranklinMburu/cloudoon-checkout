# Architecture

```
Browser (React)                 Django REST API                         PostgreSQL
───────────────                 ───────────────                         ──────────
api/client.ts ── GET  /catalog ──▶ catalog.presenter ◀── pricing.loader ◀── catalog tables
              ── POST /quote   ──▶ pricing.engine.build_quote
              ── GET  /domains ──▶ domains.service.check
              ── POST /auth/*  ──▶ accounts.views ────────────────────────▶ users, tokens
              ── POST /orders  ──▶ orders.services.place_order ───────────▶ orders, order items
                                       └── orders.payments.charge ──▶ Stripe · M-Pesa · PayPal
```

## Principles

1. **The backend owns the data.** The browser holds no product names, prices, tax rates or promo rules. It renders what the API returns and sends back the shopper's choices (the *cart*).
2. **One pricing engine.** `backend/pricing/engine.py` is plain Python with `Decimal` arithmetic and no Django imports. The quote endpoint, the order endpoint and the tests all call the same `build_quote(catalog, cart, ...)`. Each line is rounded in the target currency before summing, so the lines always add up to the total.
3. **Catalog as data.** `pricing.loader.load_catalog()` reads every catalog table into `pricing.catalog.Catalog` (frozen dataclasses) and caches it for 60 s. Any save or delete in the admin clears the cache (`catalog/apps.py`).
4. **Orders are re-priced and idempotent.** `orders.services.place_order` ignores the client's totals and re-prices the cart. Then, inside one transaction, it:
   - writes a `pending` order;
   - charges the payment using the request's `Idempotency-Key`;
   - marks the order `paid`.

   A repeated key returns the existing order (HTTP 200). A declined payment rolls the transaction back (HTTP 402), so the same key can be retried.
5. **Each integration sits behind one module** (`orders/payments/`, `accounts/oauth.py`, `domains/registry.py`, `accounts/address_lookup.py`), switched on by its keys. Swapping a provider touches only that module, and tests stub it at that boundary.

## Frontend state

| Where | What | Lifetime |
|---|---|---|
| `state/store.tsx`, `cart` | the shopper's choices | `localStorage`: survives reloads and new tabs |
| `state/store.tsx`, `checkout` | step, billing details, auth token, last order | `sessionStorage`: this tab only |
| `catalog`, `quote` | API responses | in memory; refetched when the currency, cycle or cart changes |

Quote requests are debounced, and the latest request always wins, so dragging a slider never leaves stale totals on screen.

## Common changes

- **A new plan or TLD:** add it in the Django admin (or in the fixture, then run `seed --reset`). No code change.
- **A new billing cycle (e.g. 6 months):** add it to `CYCLES` in `pricing/engine.py` and add a matching `CycleDiscount` row. The frontend reads the available cycles from `quote.cycle_options`.
