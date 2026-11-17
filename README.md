# Frontend — React checkout

React 19 + TypeScript + Tailwind CSS. A thin client: every product, price, discount, tax amount, domain result and order comes from the Django API (`../backend`). The only logic here is presentation and form-level validation; the server re-validates everything.

**Flow:** `1 Configure product → 2 Account & billing → 3 Payment & confirmation`

## Run

```bash
npm install
VITE_API_URL=http://localhost:8000 npm run dev    # API from ../backend; defaults to the deployed API
npm run build                                     # type-check + production build
npm run lint                                      # ESLint (TypeScript + Rules of Hooks)
npm run format                                    # Prettier
```

It also runs unchanged in **Google AI Studio**: the `index.html` import map loads React from a CDN, and Tailwind runs from its browser build.

## Structure

```
src/
  api/client.ts          the only module that calls the backend (typed functions, ApiError)
  api/types.ts           API request/response types (snake_case, money as decimal strings)
  api/paymentProvider.ts simulated card tokenization (stands in for Stripe.js)
  state/store.tsx        cart (localStorage), catalog + quote from the API, checkout (sessionStorage)
  lib/                   formatting, validation, safe storage helpers
  components/ui/         design-system primitives (Button, RadioCard, TextField, Switch, ...)
  components/            header/stepper, order summary, boot screen, icons
  steps/configure/       step 1: hosting (one file per product type), billing period, domain, add-ons
  steps/account/         step 2: inline auth (guest / sign-up / login / OAuth), billing, address lookup
  steps/payment/         step 3: payment method + itemised review
  steps/Confirmation.tsx receipt (survives a refresh; the cart is emptied after payment)
  DesignSystem.tsx       tokens, every UI state, 375px / 1440px frames (open /#design-system)
```

## How the brief is met

| Requirement | Where |
|---|---|
| Domain search / register / transfer / use existing, TLD pricing, auto-renew, WHOIS privacy | `DomainPanel.tsx` (availability from `GET /domains/check/`) |
| Shared, VPS (managed, OS, sliders), Dedicated (hardware, data center, bandwidth), Cloud (sizes, autoscaling, Kubernetes) | `hosting/*` (catalog from `GET /catalog/`) |
| Backups, SSL, email, DDoS, CDN | `AddonsPanel.tsx` |
| Currency switcher → real-time recalculation incl. tax | header select → new catalog + `POST /quote/` |
| Billing cycles with "Save X%", monthly vs upfront | `BillingCycleSection.tsx` (`quote.cycle_options`) |
| Inline guest / sign-up / login without losing the cart; OAuth Google, GitHub, SSO | `AuthPanel.tsx`, `AccountStep.tsx` |
| Real-time validation, inline errors, password strength, address autocomplete | `lib/validation.ts`, `AddressAutocomplete.tsx` |
| Sticky summary / mobile drawer with term changes, domains, promo, tax, deletions | `OrderSummary.tsx` |
| Initial term vs renewal, all terms stated before payment | summary lines + `PaymentStep.tsx` review (dates, promo first-term note, cloud hourly rate) |
| Max 3 steps · all interaction states · 1440 / 375 · ≥ 44px targets | `App.tsx`, `components/ui/`, `DesignSystem.tsx` |

## Design decisions

- **Progressive disclosure**: Hosting and Billing period are always open; the optional Domain and Add-ons sections are one-line summaries until opened. On phones only the selected plan lists its features.
- **One conversion colour**: solid amber (`#E7A403`) only on the Continue / Pay button; discount and promo flags use a light amber tint. Primary blue (`#395AF4`) for actions, selection and navigation.
- **Intuitive defaults** come from the API (`default_cart`): WordPress plan, 12 months, free SSL, standard DDoS, M-Pesa pre-selected for Kenya.
- **Honest pricing**: renewal price on every line, server-calculated totals, nothing added at the payment step.
- **Type scale**: 12 / 13 / 14 / 16 / 20 / 24 px, weights 400 / 500 / 600. Controls 40px on desktop, 44px on phones.

## Demo data

| What | Value |
|---|---|
| Promo codes | `WELCOME10` (10% off first term), `HOSTING25` (25% off hosting), `SUMMER24` (expired) |
| Cards | `4242 4242 4242 4242` succeeds · `4000 0000 0000 0002` is declined (any future expiry, any CVC) |
| Returning customer | `demo@cloudoon.com` / `Demo1234!` |
| Taken domains | `google`, `amazon`, `safaricom`, `cloudoon` … and about 1 in 4 other names |
| Address lookup | Type `Westlands`, `Waiyaki`, `Ngong`, `Baker`, `Fifth Avenue` … |
| Out of stock | AMD EPYC 9354P in Nairobi |

The first load after the free-tier API has been idle can take up to a minute while the server starts; the page says so.
