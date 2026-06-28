# E2E tests (Playwright, T-162)

Critical-flow end-to-end tests. They run against a **running** SWAT stack with a
seeded database — that's the operator's on-prem step, **not** part of the unit
gates (`pnpm test` runs Vitest over `src/` only; these live in `e2e/`).

## Run

```bash
# 1. Bring the stack up (dev or prod compose) + seed the admin.
# 2. Install the browser binary (one-time):
pnpm --filter @swat/web exec playwright install chromium
# 3. Point at the Nginx origin (same-origin so the session cookie flows) and run:
PLAYWRIGHT_BASE_URL=http://localhost:8088 pnpm --filter @swat/web test:e2e
```

## Auth note

The seeded admin has `mustChangePassword=true`, so a pristine DB redirects to the
forced-change screen. Specs that need a full session (`master-data`, `transactions`)
`test.skip` when they land there — run them against a stack where the password was
already rotated, or set `E2E_USER`/`E2E_PASS` to an already-activated user.

## Flows covered

- `auth.spec.ts` — bad credentials (generic message), login → dashboard/forced-change, route guard when unauthenticated.
- `master-data.spec.ts` — vehicle create→list→edit→delete; driver + SIM screen.
- `transactions.spec.ts` — transaction day → Haul Board; disposal net-weight gate.

Selectors are role/label based (Bahasa) so they survive styling changes. Expand
these into full end-to-end drives (depart → pickup → disposal → verify) when running
against real seeded data.
