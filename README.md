# Cloudoon — Hosting Checkout Prototype

A high-fidelity, interactive prototype of Cloudoon's end-to-end ordering flow for web hosting, VPS, dedicated servers, cloud infrastructure and domains. It is built on Steve Krug's *Don't Make Me Think* principle: one obvious path, sensible defaults, plain language and no surprises at payment.

**Flow:** `1 Configure product → 2 Account & billing → 3 Payment & confirmation`

---

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # type-check + production build to /dist
```

You can also open the project in **Google AI Studio** (Build → import from GitHub). The `index.html` import map lets it run there without a bundler.

**Tip for reviewers:** open **Design system & UI states** from the footer (or go to `/#design-system`). It shows every component state side by side and renders the live app inside **375px and 1440px breakpoint frames**.

---

## Demo data

| What | Value |
|---|---|
| Valid promo codes | `WELCOME10` (10% off the first term), `HOSTING25` (25% off hosting) |
| Expired promo code | `SUMMER24` (shows the "expired" error) |
| Card that succeeds | `4242 4242 4242 4242`, any future expiry, any CVC |
| Card that is declined | `4000 0000 0000 0002` |
| Existing customer login | `demo@cloudoon.com` / `Demo1234!` |
| Taken domains | `google`, `amazon`, `safaricom`, `cloudoon`, … (about 1 in 4 other names) |
| Address lookup | Type `Westlands`, `Waiyaki`, `Baker`, `Fifth Avenue`, `Rivoli` … |
| Out-of-stock server | AMD EPYC 9354P in Nairobi |

Use **Reset prototype** in the footer to clear the saved cart.

---

## How each requirement is met

### 1. Product catalog & configurator
| Requirement | Implementation |
|---|---|
| Domain search / register / transfer / use existing | `DomainSection.tsx`: three tabs. Search shows a skeleton while loading, then availability across 8 TLDs. Transfer asks for the auth/EPP code. "Use my own" shows the nameservers to point at. |
| TLD pricing, auto-renew, WHOIS privacy | Registration and renewal prices are shown for every result. Each domain has its own auto-renew and privacy switches. Privacy is **disabled with a reason** for `.co.ke`, where the registry doesn't allow it. |
| Shared: Web, WordPress, WooCommerce | Three plan cards. WordPress is pre-selected as "Most popular". |
| VPS: managed/unmanaged, OS, CPU/RAM/NVMe sliders | Choosing Windows enforces its minimums (2 vCPU, 4 GB) and adds the licence as a separate summary line. |
| Dedicated: hardware, data center, bandwidth | 3 servers × 5 locations, with stock per location and 4 bandwidth packages. Setup is free and says so. |
| Cloud: sizing, autoscaling, Kubernetes add-ons | 4 sizes and 3 autoscaling presets, with the hourly cost of extra instances stated explicitly. Managed Kubernetes reveals load-balancer and registry add-ons only once it is switched on (progressive disclosure). |
| Backups, SSL, email, DDoS, CDN | `AddonsSection.tsx`. Standard SSL and DDoS protection are included and labelled that way. |

### 2. Multi-currency & billing cycles
- A **currency switcher** in the header (USD, EUR, GBP, KES) recalculates every price, add-on, tax and total immediately.
- **Billing period** cards for 1 / 12 / 24 / 36 months. Each shows a dynamic **"Save X%" badge**, the effective **monthly** price and the **upfront total billed today**.
- All money logic lives in one pure module, `src/lib/pricing.ts`. Each line is rounded in the target currency, so the line items always add up to the total exactly.

### 3. Authentication & account state
- **Inline** on step 2: switch between **New account**, **Guest** and **Log in** without leaving the page. The cart lives in global state and `localStorage`, so it is never lost.
- **One-click Google, GitHub and company SSO** (simulated). Signing in pre-fills any billing fields that are still empty.
- **Real-time validation**: a field is checked when you leave it, then re-checked live as you type. Errors say how to fix the problem. There is a **password strength meter** with a checklist, an **address autocomplete** combobox (keyboard accessible), and focus moves to the first error when you submit.

### 4. Cart persistence & summary
- A **sticky sidebar** on desktop. On mobile it becomes a **bottom bar plus a slide-up drawer**. Both update live for term changes, domains, promo codes, tax and removals.
- Each line shows **today's charge vs. the renewal rate** ("Renews at $107.88 every 12 months"). Step 3 repeats this as a table with actual renewal **dates**.
- The total briefly highlights whenever it changes, and the change is announced to screen readers (`aria-live`).

### UX acceptance criteria
| Criterion | How |
|---|---|
| No ambiguous icons or hidden fees | Every icon has a visible text label. Included items are labelled "Included" and renewal terms are shown before payment. The terms checkbox restates that services auto-renew. |
| Maximum 3 steps | Configure → Account & billing → Payment. The confirmation is the result of step 3, not an extra step. |
| Full state coverage | Hover, active, focus-visible, disabled, validation error, valid, loading/spinner, skeleton, declined payment and success screen. They are all shown together on the design-system page. |
| Responsive | Tested at 1440px and 375px. Every touch target is **≥ 44px**, verified by an automated audit. Inputs are 16px on mobile to prevent iOS zoom. |
| WCAG AA | Primary `#395AF4` with white text is 5.3:1. The accent `#E7A403` is always paired with near-black text (9.3:1), because white on amber fails AA. Other features: semantic landmarks, native radios behind the cards (arrow keys work), `role="switch"`, a skip link, focus moved to each new step's heading, and `prefers-reduced-motion` respected. |

---

## Design decisions

- **One conversion colour.** The amber accent is used only for the single "continue / pay" action on each screen and for savings badges. Everything else uses the primary blue, so the next step is never in doubt.
- **Intuitive defaults.** WordPress Hosting, a 12-month term (a real discount plus the free domain), free SSL and standard DDoS protection are pre-selected. A customer can finish step 1 without touching anything.
- **Honest pricing.** Strikethrough regular prices, the renewal price on every line, the hourly burst rate for cloud, and the Windows licence and bandwidth upgrades as separate lines.
- **Local payment.** M-Pesa is offered, and pre-selected for Kenyan customers, next to card and PayPal.
- **No unnecessary dependencies.** The only runtime dependencies are React and Tailwind. There is no router, state library or UI kit.

## Project structure

```
index.html                 Tailwind v4 theme (brand tokens), fonts, import map
src/
  main.tsx, App.tsx        Layout, step routing, sticky summary
  types.ts                 Shared types
  data/catalog.ts          All products, prices, TLDs, currencies, taxes — edit prices here
  lib/pricing.ts           Pure pricing engine (quote, cycles, promo, tax)
  lib/validation.ts        Field validators, card/Luhn, password strength
  lib/domainSearch.ts      Mock availability API
  state/store.tsx          Cart + checkout state, persisted to localStorage
  components/              Design-system primitives, header/stepper, order summary
  steps/configure/         Step 1 sections
  steps/account/           Step 2: auth panel, billing, address autocomplete
  steps/payment/           Step 3: payment + review
  steps/Confirmation.tsx   Success screen
  DesignSystem.tsx         Tokens, all UI states, breakpoint frames
```

## Notes

- All back-end calls (domain search, OAuth, login, payment, address lookup) are **simulated** with realistic delays. There is no real network or payment.
- Tailwind runs from its browser build so the project works in AI Studio unchanged. For a production deployment, it can be switched to the `@tailwindcss/vite` plugin with no change to the class names.
