# 11 — Development Plan

The **executable implementation plan** for the SWAT rebuild (legacy CodeIgniter 2 / PHP 5 / MySQL →
NestJS + Next.js + PostgreSQL/Prisma). It graduated from a single file into this folder because each
phase is now a self-contained, turnkey execution doc.

> **Turnkey:** every task names the **exact files** to create/modify (paths from
> [`../05-architecture.md`](../05-architecture.md)) and has **acceptance criteria** a developer or
> Claude Code can verify before moving on. Work it **top to bottom, epic by epic, task by task**.

## Phase files

| Phase | File | Goal | Detail level |
|-------|------|------|--------------|
| 0 | [`phase-0.md`](./phase-0.md) | Foundation: monorepo, tooling, DB+partitioning, storage, Redis, CI | Turnkey (task-level) |
| 1 | [`phase-1.md`](./phase-1.md) | MVP: auth/RBAC, all master CRUD, core transactions, data+image migration & cutover | Turnkey (task-level) |
| 2 | [`phase-2.md`](./phase-2.md) | Monitoring: rollups, dashboards, aggregate caching, archiving job | Turnkey (task-level) |
| 3 | [`phase-3.md`](./phase-3.md) | Reporting: Excel/PDF exports, levy management | Turnkey (task-level) |
| 4 | [`phase-4.md`](./phase-4.md) | Weighbridge integration: TPA desktop-app API, kitir match, ingest | Turnkey (task-level) |
| 5 | [`phase-5.md`](./phase-5.md) | Field/mobile + GPS: offline PWA capture, live tracking | Turnkey (task-level) |

> **Backlog / not-yet-committed:** see [`../14-proposals/`](../14-proposals/). An accepted RFC
> graduates into a `../09-modules/` spec and a new phase/epic here.

## How to execute (read before starting)

1. **Order:** phases are sequential; within a phase, epics may parallelize where marked. Respect each
   task's **Depends on**.
2. **TDD loop per task** (mandatory — see [`../10-nonfunctional.md`](../10-nonfunctional.md)):
   RED (write failing test) → GREEN (minimal code) → REFACTOR → verify coverage ≥ 80% (services/flows
   ≥ 90% where noted).
3. **Definition of Done (every task):** acceptance criteria all checked; tests pass; lint + typecheck
   clean (`pnpm lint && pnpm typecheck`); coverage gate met; conventional-commit message; PR reviewed.
4. **Phase gate:** a phase is complete only when its **Exit Criteria** (bottom of each phase file)
   all pass.

## Task format (used in every phase file)

Each phase groups tasks into epics (## Epic N.M), with individual tasks (#### T-NNN) under each epic.

```markdown
## Epic N.M — <name> (Size: S/M/L/XL)

**Parallel group:** <id> [or sequential if none noted]

#### T-NNN. <Task title>

- **Size:** S/M/L · **Coverage:** ≥X%
- **Depends on:** T-..., T-...
- **Files:**
  - `apps/backend/src/modules/<domain>/<file>.ts` (create|modify) — <what>
  - `packages/schemas/src/<x>.schema.ts` (create) — <what>
  - `apps/backend/test/<x>.e2e-spec.ts` (create) — <what>
- **Steps:** <concise build steps; test-first>
- **Acceptance criteria:**
  - [ ] <verifiable outcome 1>
  - [ ] <verifiable outcome 2 — endpoint/contract/business rule>
  - [ ] tests pass; coverage ≥ X%; lint+typecheck clean
```

**Task ID scheme:** Unique across all phases:
- Phase 0 = T-0xx (T-001 … T-026)
- Phase 1 = T-1xx (T-101 … T-169)
- Phase 2 = T-2xx (T-201 … T-2xx)
- Phase 3+ follow similarly

Enables cross-file dependency references (e.g., T-405 depends on T-101).

## Canonical monorepo file map (paths all tasks use)

Authoritative tree is in [`../05-architecture.md`](../05-architecture.md) §1. Quick reference:

```
swat/
├── apps/backend/            # NestJS — src/{main.ts,app.module.ts,common/,config/,prisma/,modules/<domain>/}
│   ├── prisma/{schema.prisma, migrations/}
│   └── test/                # integration / e2e (Supertest)
├── apps/web/                # Next.js — app/(auth|admin|public), src/{components,lib,i18n}, public/{manifest,sw}
├── packages/{schemas,types,prisma-client,eslint-config,tsconfig}/
├── infra/                   # docker-compose.yml, Dockerfile.*, nginx.conf
├── scripts/                 # migrate-discovery.ts, migrate-legacy.ts, migrate-images.ts, verify-migration.ts, seed.ts
└── .github/workflows/       # lint.yml, test.yml, deploy.yml
```
Per-domain backend module = `apps/backend/src/modules/<domain>/` containing
`<domain>.controller.ts`, `<domain>.service.ts`, `<domain>.repository.ts`, `dto/`,
`<domain>.module.ts`, and co-located `*.spec.ts` unit tests.

## Risk & mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **Snapshot dump is master-data-only; LIVE data is huge (since 2013)** | Underestimated volume → migration/runtime too slow. | Migration discovery on live DB first (`../04-migration.md` §0); batched/streamed load into **partitioned** tables; size from real numbers (`../12-scalability-archiving.md` §1). |
| **Multi-TB image corpus** | Slow/failed migration; storage cost; DB bloat. | Object storage + streamed image migration (`../04-migration.md` §10); no bytes in PG; lifecycle tiers. |
| **MD5 password hashes in legacy** | Can't migrate passwords securely. | Random unusable Argon2id hash + `mustChangePassword`; out-of-band temp credentials. |
| **High `jatahkitir` / GPS volume** | Query/ingest performance. | Indexes on (vehicleId, validFrom, validTo, status); partition + downsample time-series. |
| **Trip state ↔ verification coupling** | State-machine bugs cause data loss. | TDD on transitions; integration tests; immutable audit log; verified rows locked. |
| **Daily-init job on large schedule** | Slow startup, missed hauls. | Bulk insert, transaction boundaries, idempotent per date; monitor runtime. |
| **Timezone bugs (WIB vs UTC)** | Wrong report dates. | Store `timestamptz` (UTC); display Asia/Jakarta; test date boundaries. |
| **Weighbridge desktop-app dependency** | TPA can't post weights until Phase 4. | Phase 1 uses manual entry; deliver Phase 4 API early if needed. |

## Milestone schedule (effort, not calendar)

| Milestone | Phases | Deliverables | Effort (weeks) |
|-----------|--------|--------------|----------------|
| Infrastructure ready | 0 | Monorepo, Docker (PG/Redis/MinIO), schema+partitioning, CI | 1–2 |
| MVP v1 (auth + master CRUD) | 1 (first half) | User/role mgmt; vehicle/driver/site/route/crew/fuel CRUD | 3–4 |
| MVP v2 (transactions + migration) | 1 (second half) | Daily init, trip recording/verification, data+image migration, cutover | 5–6 |
| Monitoring | 2 | Rollups, dashboards, aggregate caching, archiving job | 2–3 |
| Reporting | 3 | Excel/PDF exports, levy mgmt | 2 |
| Weighbridge | 4 | TPA API, kitir resolution, post-weighing ingest | 2–3 |
| Field/GPS | 5 | Offline PWA, live tracking, push notifications | 3–4 |

**To MVP (Phases 0–1): ~15–18 weeks. To full Phase 5: ~25–30 weeks.**
