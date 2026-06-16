# Dependency Modernization (2026-06)

Full sweep to latest majors with `pnpm audit` = **0**. Executed as ordered,
independently-verified phases (one commit each); each phase ran typecheck + lint +
tests before landing. Baseline was `pnpm audit` = 48 (then 30 after the first
transitive-override pass in `753af5e`).

## What changed

| Area | From → To | Notes |
| --- | --- | --- |
| ESLint | 8 → **9** (flat config) | Shared `@swat/eslint-config` rewritten to flat; every `.eslintrc.cjs` → `eslint.config.mjs`; web lints via `eslint .` with `@next/eslint-plugin-next` + react-hooks (no `next lint`). Backend keeps type-aware parsing so `consistent-type-imports` honours `emitDecoratorMetadata`. |
| Test stack | Vitest 2 → **4** (+ Vite 7, @vitejs/plugin-react 5, jsdom 29), Jest 29 → **30** | Configs unchanged. Web vitest can flake under concurrent CPU load (turbo runs all suites at once); it is reliably green run in isolation. |
| Tooling | turbo 2.9, TypeScript **5.9**, prettier 3.8, lint-staged 17, commitlint 21, @types/node 24 | TS 6 deferred (typescript-eslint/ts-jest peers not ready). |
| NestJS | 10 → **11** (Express 5) | `@nestjs/swagger` 7→11, `schedule` 4→6, `config` 3→4; platform-express 11 brings Express 5 + multer 2. No code changes (`forRoutes('*')` still matches; upload uses buffer only). |
| Prisma | 5 → **7** | Driver adapters: `@prisma/adapter-pg` + `pg`; URL moved to `prisma.config.ts`; the removed `$use` audit middleware reimplemented as a `$extends` client extension returned from the `PrismaService` constructor (soft-delete + stamping + AuditLog) — keeps the 88 `@prisma/client` import sites unchanged (kept `prisma-client-js` generator). Scripts use a shared pg-adapter + script env loader. |
| Zod | 3 → **4** | `@hookform/resolvers` 5. Only fix: a form used `z.number()` instead of `z.coerce.number()` (Zod 4 types coerce input as `unknown`). |
| Web | Next 14 → **16**, React 18 → **19**, next-intl 3 → **4** | `createNavigation`; async `params` in `[locale]` layout/page; global `JSX` namespace shim (React 19 moved JSX → `React.JSX`); single `@types/react` 19 via override; `typedRoutes` moved out of `experimental`. Middleware now reported as "Proxy" (deprecation only). |
| Styling | Tailwind 3 → **4**, recharts 2 → **3**, lucide 0.456 → **1** | `@import "tailwindcss"` + `@config` to keep the JS design-token config; `@tailwindcss/postcss` (autoprefixer bundled); `tailwind-merge` 3; recharts Tooltip `formatter` value is now `ValueType` (coerced). |

## Retained `pnpm.overrides` (root `package.json`)

`pnpm audit` reports advisories whose only patched release is in a newer
within-major (or, for a few, a newer major) than transitive dependents pin. These
overrides floor them to patched versions and **must stay** until the dependents
catch up (re-check on the next `pnpm audit`):

- Within-major security floors: `form-data`, `tmp`, `qs`, `postcss`, `webpack`,
  `js-yaml`, `lodash`, and scoped `ajv@>=7 <8.18`, `glob@>=10.2 <10.5`,
  `picomatch@>=4 <4.0.4`, `esbuild@<0.28.1`, `@hono/node-server@<1.19.13`,
  `uuid@<11.1.1`.
- Single-version pins: `@types/react`/`@types/react-dom` @19 (forces one React
  type copy across Radix/etc. — required for React 19 JSX typing).

## Deferred (too new for the ecosystem)

- **ESLint 10**, **TypeScript 6**, **Vite 8** + `@vitejs/plugin-react` 6 — latest
  but their peers (eslint-config-next, typescript-eslint, ts-jest, vitest) don't
  support them yet. Revisit when the toolchain catches up.

## Gotchas for the next session

- After any dependency change run **`pnpm install` then `pnpm dedupe`** (overrides
  re-fork `eslint-plugin-import`, breaking lint, until deduped).
- Prisma client regenerates to a hashed pnpm path; the editor LSP often shows
  stale `@prisma/client has no exported member` errors after a reinstall — trust
  `tsc`, not the LSP.
- A clean `rm -rf node_modules && pnpm install` clears orphaned `@types/*` copies
  that otherwise cause dual-React-types JSX errors.
