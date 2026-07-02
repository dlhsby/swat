# Panduan SWAT — Documentation Site

Public user manual for **SWAT** (Sistem Pengangkutan Sampah & Retribusi, DLH Kota
Surabaya), built with [Docusaurus](https://docusaurus.io). Bilingual: **Bahasa
Indonesia** (default) + **English**. Builds to fully static HTML/CSS/JS served by a
tiny nginx container — no app/runtime coupling.

This is a **standalone npm project** (its own `package-lock.json`), intentionally kept
**outside** the pnpm/Turborepo workspace: Docusaurus pins React 18 while the app is on
React 19. Run `npm`, not `pnpm`, here.

## Local preview

```bash
cd revamp/docs
npm ci
npm start                 # http://localhost:3002  (Bahasa Indonesia)
npm start -- --locale en  # English preview
npm run build && npm run serve   # production build + broken-link check
```

## Structure

```
docs/                 # Bahasa Indonesia content (source of truth for structure)
  memulai/            # hand-curated "Getting Started" (login, dashboard, roles)
  ...                 # feature guides, one folder per app section
i18n/en/…/current/    # English translations mirroring docs/
static/img/web/       # captured app screenshots (see scripts/capture-web.mjs)
scripts/              # extract-app-model.mjs, capture-web.mjs, content-map.json
generated/app-model.json  # machine-readable app model (from the live code)
```

Adding a page = drop a `.md` in `docs/` with front matter (`title`,
`sidebar_position`); the sidebar auto-generates from the folder tree +
`_category_.json` order files. Mirror it under `i18n/en/…/current/` for English.

## Keeping content in sync with the app

The guide is authored **from the live code** (the source of truth); `specs/` is used
only as guidance since it can drift. Two scripts support this:

```bash
npm run extract-model   # parse nav/routes/permissions/API → generated/app-model.json
                        # + print a DRIFT report vs the committed model
npm run capture-web -- https://swat.wahyutrip.com   # refresh screenshots
```

Re-run `extract-model` after app changes; the drift report tells you which guide pages
need refreshing. See `scripts/README.md`.

## Environment variables (build time)

| Var             | Default                           | Purpose                         |
| --------------- | --------------------------------- | ------------------------------- |
| `DOCS_URL`      | `https://docs.swat.wahyutrip.com` | canonical site origin           |
| `DOCS_BASE_URL` | `/`                               | base path (`/` for a subdomain) |
| `APP_URL`       | `https://swat.wahyutrip.com`      | "Buka Aplikasi" link target     |
| `DOCS_PORT`     | `3002`                            | dev/serve port                  |

## Deployment

Staging: Docker image → ECR (`swat-docs`) → the shared AWS Caddy routes
`docs.swat.wahyutrip.com` to the container (see `revamp/infra/Caddyfile.staging`,
`revamp/infra/compose.staging.yml`, and the "Build & push docs" step in
`.github/workflows/deploy-staging.yml`). On-prem prod: a commented `docs` service stub
in `revamp/infra/docker-compose.prod.yml`.
