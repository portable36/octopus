# End-to-end tests ([Playwright](https://playwright.dev/))

Smoke and UI flows against the Next.js frontend (`frontend/`, port **3001**).

## Setup

```powershell
npm.cmd install
npx.cmd playwright install chromium
```

Install all browsers (optional): `npx.cmd playwright install`

## Run

**Shop/store SSR pages** call the Nest API during render. Start dependencies and the API before E2E when exercising `/shops/*`, `/stores/*`, or data-dependent Martvill tests:

```powershell
docker compose up -d postgres redis meilisearch minio
npm.cmd run migration:up -w backend
npm.cmd run dev -w backend
```

In another terminal (Playwright starts/reuses the frontend on **3001**):

```powershell
npm.cmd run test:e2e
```

Build frontend once for CI-style runs (webServer uses `next start`):

```powershell
npm.cmd run build:frontend
npm.cmd run test:e2e
```

Or against an already-running `npm.cmd run dev:frontend`:

```powershell
npx.cmd playwright test
```

When the API is down, Martvill 404 / data tests **skip** instead of failing; storefront smokes still run.

Useful flags:

```powershell
npx.cmd playwright test --headed
npx.cmd playwright test --ui
npx.cmd playwright show-report
```

## Layout

| Path                             | Role                                                             |
| -------------------------------- | ---------------------------------------------------------------- |
| `playwright.config.ts`           | baseURL, Chromium project, `webServer`                           |
| `e2e/smoke.spec.ts`              | Storefront + admin shell smokes (Phase 26.1 page renders)        |
| `e2e/martvill-browse.spec.ts`    | Quick view, vendor shop, store PLP (data-dependent skips)        |
| `e2e/revenue-path.spec.ts`       | Authenticated register/login + COD checkout (API + offers)       |
| `e2e/payment-path.spec.ts`       | Gateway checkout → sandbox redirect URL (mock mode; host stubbed)|
| `e2e/vendor-fulfillment.spec.ts` | COD order → vendor process/fulfill → MANUAL shipment (env-gated) |
| `e2e/refund-path.spec.ts`        | COD collect (API) → customer Request refund (env-gated)          |
| `e2e/payout-path.spec.ts`        | Vendor finance Request payout when spendable (env-gated)         |
| `e2e/helpers/`                   | API live check + auth helpers                                    |

`PLAYWRIGHT_BASE_URL` overrides the default `http://127.0.0.1:3001`.

### Payment gateway env

`e2e/payment-path.spec.ts` needs Nest API + offers. Default method is bKash sandbox-mock redirect.

| Variable             | Required | Notes                                      |
| -------------------- | -------- | ------------------------------------------ |
| `E2E_PAYMENT_METHOD` | no       | `BKASH` (default), `SSLCOMMERZ`, or `NAGAD` |

Does not complete a live capture — asserts redirect to the provider sandbox host (response stubbed).

### Vendor-gated journeys

`e2e/vendor-fulfillment.spec.ts`, `e2e/refund-path.spec.ts`, and `e2e/payout-path.spec.ts` skip unless Nest is up and:

| Variable              | Required | Notes                                              |
| --------------------- | -------- | -------------------------------------------------- |
| `E2E_VENDOR_EMAIL`    | yes      | Vendor staff for the offer’s store                 |
| `E2E_VENDOR_PASSWORD` | no       | Defaults to `E2E_PASSWORD` / auth helper default   |
| `E2E_VENDOR_ID`       | no       | Skip picker when the account has multiple vendors  |
| `E2E_STORE_ID`        | no       | Pins vendor shell store when the vendor has many   |

Refund/payout may also **collect COD via API** (and payout may wait for ledger spendable after CodCollected). Fulfillment needs indexed offers; payout needs spendable balance or a successful COD seed.
