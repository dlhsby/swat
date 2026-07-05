# 16 — User Manual (Public Docs Site)

The public, bilingual **user manual** at **docs.swat.wahyutrip.com** — how it is built,
kept in sync with the app, and deployed. Deployment mechanics (subdomain, image, ECR, IAM)
are in [`15-deployment.md`](./15-deployment.md); this doc is the subsystem's own spec.

## Purpose & scope

- A **public, static** end-user guide for SWAT operators (no auth, no session, no DB).
- **Bilingual**: Bahasa Indonesia (default) + English — mirrors the app locales
  (`id-ID` / `en-US`); see [`08-frontend-spec.md`](./08-frontend-spec.md).
- Out of scope: API reference (that is [`07-api-spec.md`](./07-api-spec.md) / Swagger) and
  internal runbooks (`docs/CUTOVER-RUNBOOK.md`, `ROLLBACK-PLAN.md`).

## Location & isolation

- Lives in **`revamp/apps/docs/`** as a **standalone npm project** (own `package-lock.json`),
  intentionally **outside** the pnpm/Turborepo workspace: Docusaurus pins **React 18** while
  the app is on React 19. Use `npm` there, not `pnpm`.
- Stack: **Docusaurus 3.10** (docs-only, `routeBasePath: '/'`), offline search
  (`@easyops-cn/docusaurus-search-local`), emerald brand theme mirroring the app tokens.
- `onBrokenLinks: 'throw'` — a broken internal link fails the build, keeping the manual honest.

## Content model — code-driven, spec-guided

The **live application is the source of truth**; specs are guidance only (they drift). The
guide is authored from what the app actually ships, not from prose that can go stale.

- **`scripts/extract-app-model.mjs`** parses the real app into `generated/app-model.json`:
  nav/IA + route slugs + i18n labels (`apps/web/src/lib/nav.ts` + `messages/*`), the
  `permission` gating per screen, the route inventory, and the NestJS controller/route
  surface. It also prints a **drift report** (routes / permissions / nav keys added or
  removed vs the committed model).
- **`scripts/content-map.json`** maps each screen → guide page + section + sidebar order +
  screenshot name.
- Pages are **authored markdown** (committed, reviewable), one section per app area
  (Memulai, Pemantauan, Data Master, Pengangkutan, Pengguna & Akses, Pengaturan & Akun, FAQ),
  in `id` under `docs/` and `en` under `i18n/en/docusaurus-plugin-content-docs/current/`.
- **Vocabulary is authoritative** per [`01-glossary.md`](./01-glossary.md): in id-ID,
  `Haul` → "Pengangkutan Sampah", `Trip` → "Perjalanan", `Levy` → "Retribusi"; never surface
  raw English entity names in id-ID prose.
- **MDX caveat**: a raw `<` immediately followed by a digit is parsed as a JSX tag — write
  `&lt;` or reword.

## Screenshots

- **`scripts/capture-web.mjs`** (Playwright, `npx playwright install chromium` once) logs in
  to a running app as the seed admin over the **locale-prefixed** routes and writes
  `static/img/web/<name>.png` (names match `content-map.json`). Defaults to staging.
- **`scripts/gen-placeholders.mjs`** seeds branded placeholders for any missing shot so the
  build never references a missing image; real captures overwrite them.

## Nav integration

- The app sidebar links out to the manual via a `NavLeaf.externalUrl` leaf (renders a plain
  `<a target="_blank">`, bypassing the locale-aware `Link`); label `Dokumentasi` /
  `Documentation`. URL is `NEXT_PUBLIC_DOCS_URL` (default `https://docs.swat.wahyutrip.com`).

## Build, serve & deploy

- Build: `npm run build` → fully static HTML in `build/` (both locales). Served by a tiny
  **nginx** container (`nginx.conf`): gzip, fingerprinted-asset caching, clean-URL
  `try_files … =404` (unknown URLs return a real **404** with the styled Docusaurus page).
- Image `swat-docs` (multi-stage: Node 24 build → nginx). Site URLs are **build-time** args
  (`DOCS_URL`, `DOCS_BASE_URL`, `APP_URL`) so one source builds for staging / prod / local.
- **Staging**: shared AWS Caddy fronts `docs.swat.wahyutrip.com` (`infra/Caddyfile.staging`,
  `infra/compose.staging.yml`); the "Build & push docs" step + smoke test are in
  `deploy-staging.yml`. **On-prem prod**: `docs` service in `docker-compose.prod.yml` + a
  `docs.` vhost in `nginx.prod.conf` (fill `server_name`/URLs at cutover). See
  [`15-deployment.md`](./15-deployment.md).

## Maintenance workflow

1. After app changes (nav, routes, permissions, screens), re-run
   `node scripts/extract-app-model.mjs` and read the **drift report** — it names which guide
   pages to refresh. Re-commit `generated/app-model.json`.
   - Known limitation: the drift diff compares the flat set of nav keys/routes/permissions,
     so a screen **moving between sidebar groups** (same keys) is **not** auto-flagged —
     eyeball `nav.ts` grouping when re-syncing.
2. Refresh screenshots with `npm run capture-web` against staging (or local dev).
3. Extend `content-map.json` + author the new/changed pages in **both** locales; `npm run
   build` must pass (broken links throw).
