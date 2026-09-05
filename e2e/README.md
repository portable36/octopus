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

| Path                          | Role                                                      |
| ----------------------------- | --------------------------------------------------------- |
| `playwright.config.ts`        | baseURL, Chromium project, `webServer`                    |
| `e2e/smoke.spec.ts`           | Storefront + admin shell smokes (Phase 26.1 page renders) |
| `e2e/martvill-browse.spec.ts` | Quick view, vendor shop, store PLP (data-dependent skips) |

`PLAYWRIGHT_BASE_URL` overrides the default `http://127.0.0.1:3001`.
