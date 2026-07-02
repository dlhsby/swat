# Docs content & screenshot tooling

Two scripts keep the SWAT user guide honest against the **live app** (the source of
truth — `specs/` is guidance only, since it drifts).

## `extract-app-model.mjs` — app feature model + drift report

```bash
npm run extract-model
```

Parses the real app into `generated/app-model.json`:

- **nav / IA** + route slugs + i18n labels (`apps/web/src/lib/nav.ts` + `messages/*`)
- **permissions** per screen (the `permission` keys on each nav leaf)
- **route inventory** (`apps/web/src/app/[locale]/(app)/*`)
- **API surface** (Nest `*.controller.ts` base paths + HTTP routes)
- **spec hints** (`specs/09-modules/*` filenames — titles only, not truth)

It also prints a **drift report** vs the committed model (routes / permissions / nav
keys added or removed) so you know which guide pages to refresh. Re-run after app
changes and re-commit `generated/app-model.json`.

## `capture-web.mjs` — real dashboard screenshots

```bash
# Against staging (default), id-ID locale:
npm run capture-web

# Against a specific origin / locale:
node scripts/capture-web.mjs https://swat.wahyutrip.com id-ID
node scripts/capture-web.mjs http://localhost:4021 en-US
```

Logs in as the seed admin (`admin` / `Password123!` — dev/staging only; override with
`DOCS_SHOT_USER` / `DOCS_SHOT_PASS`) and writes `static/img/web/<name>.png`. Screenshot
names match the `shot` fields in `content-map.json`, so guide pages reference them as
`/img/web/<name>.png`. SWAT routes are locale-prefixed, so paths are visited under
`/<locale>/…`.

Requires the browser binary once: `npx playwright install chromium` (Playwright is a
devDependency of this workspace).

## `content-map.json`

Maps each guide page → the screen it documents, target doc path, sidebar order, and the
screenshot it embeds. Extend it as coverage grows; keep it aligned with the drift report.
