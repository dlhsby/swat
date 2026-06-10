# SWAT Rebuild — Specifications

**SWAT** ("Solid Waste Transportation") is the operational system of **DLH Kota Surabaya**
(Dinas Lingkungan Hidup — the city Environment Agency) for managing municipal garbage-collection
transportation: a fleet of trucks collects waste from TPS sites and hauls it to the TPA landfill,
where each load is weighed. The city tracks tonnage, fuel, routes, drivers, and fees from this data.

This folder is the **specification + development plan** to rebuild the legacy CodeIgniter 2 / PHP 5 /
MySQL system on a modern stack:

| Layer | Technology |
|-------|-----------|
| Web / UI | **Next.js** (App Router), installable **PWA**, Indonesian UI |
| Backend | **NestJS** (REST), English domain code |
| Database | **PostgreSQL** via **Prisma** |
| Monorepo | pnpm workspaces + Turborepo, lives in `../swat/` |

> ⚠️ These are specs only. No application code is written yet. Implementation follows the phased
> roadmap in [`11-development-plan/README.md`](./11-development-plan/README.md).

## How to read these specs

Read in order for the full picture; jump to a module spec when implementing a feature.

| Doc | Purpose | Primary audience |
|-----|---------|------------------|
| [`00-overview.md`](./00-overview.md) | Problem, stakeholders, scope, capability map | Everyone |
| [`01-glossary.md`](./01-glossary.md) | **Authoritative** ID→EN naming + UI labels | Everyone (source of truth) |
| [`02-domain-model.md`](./02-domain-model.md) | Entities, lifecycle state machines, ERD, business rules | Backend, QA |
| [`03-data-model.md`](./03-data-model.md) | PostgreSQL/Prisma target schema | Backend, DBA |
| [`04-migration.md`](./04-migration.md) | Legacy MySQL → PostgreSQL ETL ("migrate everything, improve") | Backend, DBA |
| [`05-architecture.md`](./05-architecture.md) | Monorepo, NestJS, Next.js, infra | All engineers |
| [`06-auth-rbac.md`](./06-auth-rbac.md) | Authentication + permission model | Backend, Frontend |
| [`07-api-spec.md`](./07-api-spec.md) | REST conventions + endpoint catalog | Backend, Frontend |
| [`08-frontend-spec.md`](./08-frontend-spec.md) | IA, screens, PWA, i18n (engineering) | Frontend |
| [`09-modules/`](./09-modules/) | Functional spec per domain module | Feature teams, QA |
| [`10-nonfunctional.md`](./10-nonfunctional.md) | Security, testing, observability, performance | All engineers |
| [`11-development-plan/README.md`](./11-development-plan/README.md) | Phased roadmap + task breakdown | PM, all engineers |
| [`12-scalability-archiving.md`](./12-scalability-archiving.md) | **Data growth (since 2013), partitioning, archiving, caching, object storage** | Backend, DBA, DevOps |
| [`13-design/`](./13-design/) | UI/UX: brief, **design system (28 components, light+dark)**, wireframes, hi-fi (21 screens) — **complete**, mirrors [`../designs/`](../designs/) | Frontend |
| [`14-proposals/`](./14-proposals/) | **Future-feature RFCs & backlog** (not-yet-committed ideas) | PM, architects |

> **Design is done.** The canonical visual source is the vendored Claude Design bundle in
> [`../designs/`](../designs/) (tokens `swat-tokens.css`, 28 components, 21 hi-fi screens,
> illustrations, brand marks). `13-design/` mirrors it and binds it to the glossary, data model, and
> phases. On any conflict, **the bundle wins**. Implementation ports `swat-tokens.css` verbatim and
> builds the component library first (dev-plan Phase 0 T-016 + Phase 1 Epic 1.8.5).

> **Migration scope note:** [`04-migration.md`](./04-migration.md) covers **both** the data
> migration (legacy MySQL → PostgreSQL) **and** the application cutover (old PHP app → new stack):
> strategy, parallel run, rollback, and acceptance. Read it together with
> [`12-scalability-archiving.md`](./12-scalability-archiving.md), because the live system has
> years of high-volume transactional data + images to move and keep performant.

## Adding future features

- **Committed/scheduled** work → a functional spec in [`09-modules/`](./09-modules/) (marked with
  its phase) **plus** a phase/epic in [`11-development-plan/README.md`](./11-development-plan/README.md).
- **Proposed/exploratory** ideas (revamps, new integrations, anything with new entities or infra) →
  an RFC in [`14-proposals/`](./14-proposals/). When accepted and scheduled, it *graduates* into a
  module spec + phase. See [`14-proposals/README.md`](./14-proposals/README.md) for the lifecycle and
  template. Small tweaks to an existing module need no RFC — just edit that module spec.

## File vs folder convention

Not everything is a folder — and that's intentional:

- **Single `NN-name.md` file** when the doc is **one cohesive topic** (overview, glossary, data
  model, architecture, …). Most docs are this.
- **`NN-name/` folder** only when the section is a **collection of sibling docs**:
  [`09-modules/`](./09-modules/) (one file per domain module), [`13-design/`](./13-design/) (brief +
  system + wireframes + hi-fi), [`14-proposals/`](./14-proposals/) (one RFC per idea).
- A single file may **graduate to a folder** if it outgrows itself (e.g. an RFC that needs a deep
  design + session notes — see `14-proposals/RFC-0002-…/`). Keep numbering continuous either way.

So: don't fold a cohesive doc into a folder for uniformity's sake; use a folder when you genuinely
have multiple peer documents under one heading.

## Conventions (apply across all specs and code)

- **Language split:** code + database identifiers in **English**; all user-facing UI text in
  **Indonesian** (see the glossary). Never mix.
- **Database:** Tables and columns are snake_case via Prisma `@@map`/`@map`; model names are
  PascalCase, field names are camelCase. All primary keys are UUID v7 (`String @id @db.Uuid @default(uuid(7))`).
  `legacyId` (Int/BigInt) is the numeric bridge for legacy data migration.
- **Units:** weight in **kilograms (kg)**, odometer/distance in **kilometers (km)**, fuel in
  **liters (L)**, money in **IDR** (stored as integer rupiah; format with thousands separators in UI).
- **Dates/times:** stored as `timestamptz` (UTC); displayed in **Asia/Jakarta (WIB, UTC+7)**.
- **Status legend** for spec items: ✅ in this rebuild · 🔜 later phase · 🗑️ dropped (with reason).
- **Naming:** REST resources kebab-case plural; DB tables snake_case; TS types PascalCase;
  variables camelCase.

## Source material

- Legacy code: `../old_swat/` (CodeIgniter 2.1.4).
- Legacy DB dump: `../old_swat/db_backup/dkp_swat_2026_05_18_{structure,data}.sql`
  (database `dkp_swat`, MySQL 5.6, latin1).
  > ⚠️ This dump is a **partial / master-data snapshot**: the core transaction tables
  > (`transaksiangkutsampah`, `detailtransaksiangkutsampah`, `trayek`) are empty in it. The **live
  > production system has been running since 2013** and accumulates **thousands of transaction rows
  > and trip photos every day**. The real migration must target the live DB + image store, not this
  > snapshot — see [`04-migration.md`](./04-migration.md) and
  > [`12-scalability-archiving.md`](./12-scalability-archiving.md).
