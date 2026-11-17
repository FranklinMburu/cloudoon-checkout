# Postman collection — Cloudoon Checkout API

## Import and run

1. Postman → **Import** both files in this folder:
   - `Cloudoon-Checkout.postman_collection.json`
   - `Cloudoon-Production.postman_environment.json`
2. Select the **Cloudoon Production** environment (top-right).
3. Postman → Settings → General → **Request timeout**: `0` (or at least `120000` ms). The API is on Render's free plan and the first request can take **~50 s** while the instance wakes up.
4. Collection → **Run collection**, folders in order 1 → 7 (later folders use variables saved by earlier ones).

Command line: `newman run Cloudoon-Checkout.postman_collection.json -e Cloudoon-Production.postman_environment.json --timeout-request 120000`

Auth is DRF **TokenAuthentication**: `Authorization: Token {{token}}` (not `Bearer`, not JWT).

## What each folder proves

| Folder | Proves |
|---|---|
| 1 · Health & config | The API is up; `/config/` lists payment methods and sign-in options (includes `github`). |
| 2 · Catalog & pricing | Catalog is priced per currency (KES has 0 decimals), money is always a string, the default cart is saved as `cart`; quotes reconcile (`total = subtotal − discount + tax`, lines sum to subtotal), promo `WELCOME10` applies. |
| 3 · Domains & addresses | Live registry lookup (free name available, `google.com` taken, URL input normalised); address suggestions. |
| 4 · Accounts | Register (random email) → 201; demo login saves `token`; `me`; password reset is always 202; OAuth start redirects (302) to GitHub/Google; OAuth poll returns 202 `waiting`; logout revokes the token (old token → 401); log back in. |
| 5 · Orders | Card order with Stripe test `pm_card_visa` → 201 `paid`, owned by the demo user; same `Idempotency-Key` → 200 with the same reference (no second charge); `pm_card_chargeDeclined` → 402; the owner can read the order back. |
| 6 · Error handling | Validation: bad currency/cycle, expired/unknown promo, invalid cart, invalid domain, missing `Idempotency-Key`, terms not accepted, one-word name, billing/tax country mismatch, wrong password (all 400). Authentication: no token → 401. Authorization: another user's token on the demo order → 404. |
| 7 · Optional | M-Pesa (KES) → 202 `pending` and PayPal order creation → 200 `{id}` when sandbox keys are set on the server; the tests also accept the "not configured / unreachable" answers (402/400/503) and say so. |

Variables written by scripts: `cart`, `token`, `revoked_token`, `signup_email`, `signup_password`, `signup_token`, `oauth_nonce`, `idempotency_key`, `order_reference`, `order_number`, `sign_in_methods`, `payment_methods`.
