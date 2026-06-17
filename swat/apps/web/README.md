# @swat/web — SWAT Web (PWA)

Next.js 16 (App Router) + React 19 + Tailwind 4 + next-intl 4 (id-ID default) +
Radix/shadcn tokens. Offline-capable PWA. Part of the [`swat/`](../../README.md)
monorepo — prefer the root **`./scripts/setup.sh`** / **`./scripts/start.sh`** for the
full stack. This README covers running the web app on its own.

## Prerequisites

- Node ≥ 20 · pnpm 9 — install deps once from the repo root: `pnpm install`
- A running backend (see [`../backend/README.md`](../backend/README.md)); the web is just a client

## Environment (.env)

The web targets the backend via **`NEXT_PUBLIC_API_BASE_URL`** (the api-client appends
`/api/v1`). With `./scripts/start.sh`, this is derived from the repo-root `.env.local`
automatically — you only edit `apps/web/.env.local` when running the web **standalone**.

```bash
# from the repo root (swat/)
cp apps/web/.env.example apps/web/.env.local
# set NEXT_PUBLIC_API_BASE_URL to your backend, e.g. http://localhost:3000
```

> Port: the web runs on `WEB_PORT` (a **shell** var Next reads before .env; default
> **3001**). Override per-run: `WEB_PORT=4001 pnpm --filter @swat/web dev`.

## Run

```bash
# via the orchestrator (recommended — wires WEB_PORT + API base from root .env.local):
./scripts/start.sh                       # backend + web

# or standalone (ensure NEXT_PUBLIC_API_BASE_URL points at a live backend):
pnpm --filter @swat/web dev              # http://localhost:3001  → redirects to /id-ID
```

- Login: **`admin` / `Password123!`** (demo seed). Locale switch + theme are in **Settings**.

## Build & test

```bash
pnpm --filter @swat/web build            # next build (standalone output)
pnpm --filter @swat/web start            # serve the production build
pnpm --filter @swat/web test             # Vitest (components, hooks, lib)
pnpm --filter @swat/web test:e2e         # Playwright (needs the app + backend running) — see e2e/README.md
pnpm --filter @swat/web typecheck
pnpm --filter @swat/web lint
pnpm --filter @swat/web icons            # regenerate PWA icons
```

## Layout & conventions

```
apps/web/
├── src/app/[locale]/        routes: (app) authed shell · (auth) login/etc · (dev) component gallery
├── src/components/          ui/ (shadcn tokens) · domain components (transactions, monitoring, …)
├── src/lib/                 api clients, nav (IA), i18n, theme, formatters, cn()
├── src/i18n/                next-intl routing/config (default id-ID, localeDetection:false)
├── public/                  manifest, service worker, icons
└── e2e/                     Playwright specs (auth, master-data, transactions)
```

- **Routes use English slugs** under `[locale]` (`/vehicles`, `/transaction-days`, …); **UI labels are
  localized** via next-intl. IA lives in `src/lib/nav.ts`.
- **Forms:** field errors render inline under the field; submit success/failure go to a toast
  (`notify.success`/`notify.error`) — not an inline `Alert`.
- **Design tokens** are CSS variables in `src/app/globals.css` (light + `.dark`), ported from
  [`../../../designs/`](../../../designs/) — the visual source of truth.
- **Tailwind 4**: `globals.css` uses `@import "tailwindcss"` + `@config "../../tailwind.config.ts"`;
  PostCSS is `@tailwindcss/postcss`. Keep the `fontSize` token list in `src/lib/cn.ts` in sync.
