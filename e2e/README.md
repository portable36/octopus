# End-to-end tests ([Playwright](https://playwright.dev/))

Smoke and UI flows against the Next.js frontend (`frontend/`, port **3001**).

## Setup

```powershell
npm.cmd install
npx.cmd playwright install chromium
```

Install all browsers (optional): `npx.cmd playwright install`

## Run

Build frontend once (webServer uses `next start`):

```powershell
npm.cmd run build:frontend
npm.cmd run test:e2e
```

Or against an already-running `npm.cmd run dev:frontend`:

```powershell
npx.cmd playwright test
```

Useful flags:

```powershell
npx.cmd playwright test --headed
npx.cmd playwright test --ui
npx.cmd playwright show-report
```

## Layout

| Path                   | Role                                   |
| ---------------------- | -------------------------------------- |
| `playwright.config.ts` | baseURL, Chromium project, `webServer` |
| `e2e/*.spec.ts`        | specs (role/label locators)            |

`PLAYWRIGHT_BASE_URL` overrides the default `http://127.0.0.1:3001`.
