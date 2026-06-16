# 00 — Overview

## Problem statement

DLH Kota Surabaya operates a large municipal garbage-collection fleet (≈1,460 vehicle records,
≈316 drivers, ≈930 sites, ≈4,900 routes in the legacy data). The current system, **SWAT**, runs on
**CodeIgniter 2.1.4 / PHP 5 / MySQL 5.6** — an end-of-life stack with serious problems:

- **Insecure:** passwords stored as **MD5**, login query is string-concatenated
  (`pengguna_password=MD5("$password")`), no rate limiting, latin1 charset.
- **Unmaintainable:** 71 controllers / 68 models with heavy duplication, SOAP/NuSOAP web services,
  jQuery + Bootstrap 3 views, FPDF/PHPExcel reports.
- **Hard to extend:** no API standard, no tests, no CI, tightly coupled UI and data access.

We are rebuilding SWAT on a modern, secure, testable stack while **preserving the proven business
process** and **migrating the existing data**.

## Stakeholders

| Stakeholder | Interest |
|-------------|----------|
| DLH operations staff (Administrasi Data, Checker) | Daily data entry: schedules, pickups, disposals, fuel |
| Pool operators (Operator Pool) | Vehicle/driver readiness, depart/return logging |
| Weighbridge operators (Petugas TPA) | Record gross/tare/net weight per load (via separate desktop app) |
| Supervisors / management (Kepala Dinas, Kepala Bidang/Seksi Angkutan) | Monitoring dashboards, tonnage/fuel reports |
| City leadership (Walikota, Sekda) | High-level reports |
| Vendor — **PT. Surveyor Indonesia** | Operates the TPA sanitary landfill; consumes weighing data |
| IT / maintainers | Operate, secure, and extend the system |

## Business goals & success metrics

1. **Security:** eliminate MD5; enforce strong hashing, RBAC, validated input. → 0 plaintext/MD5 secrets.
2. **Operational continuity:** preserve the daily pickup→disposal→weighing workflow with no loss of
   capability. → feature parity for Phase 1 (MVP) modules.
3. **Data fidelity:** migrate all existing data with quality improvements. → 100% of populated
   legacy tables reconciled (row counts + FK integrity), with a migration report.
4. **Maintainability:** typed, tested, modular code. → ≥80% test coverage; CI green gate.
5. **Usability:** faster data entry, installable PWA, clear Indonesian UI.

## Capability map (modules)

| Module | Legacy origin | Phase |
|--------|---------------|-------|
| Auth & RBAC | `home`, `auth.php`, `hakakses`, `menu` | 1 ✅ |
| Master — Fleet (vehicles, models, applications, fuel) | `masterdata/vehicles…` | 1 ✅ |
| Master — Personnel (drivers, licenses) | `masterdata/drivers…` | 1 ✅ |
| Master — Geography (sites, routes) | `masterdata/spot, rute` | 1 ✅ |
| Master — Waste sources | `masterdata/kategorisumbersampah…` | 1 ✅ |
| Scheduling (crew schedules, trip templates, fuel quota) | `mastertrayek`, `jatahkitir`, `penjadwalan` | 1 ✅ |
| Transactions (daily init, pickup, disposal/weighing, fuel) | `transaksi/*` | 1 ✅ |
| Refuel log, Vehicle inspection, Maintenance | `transaksi/pengisianbahanbakar`, `pemeriksaankendaraan`, `riwayatperawatan` | 1 ✅ |
| Monitoring dashboards (tonnage, fuel, routes) | `monitoring/*` | 2 🔜 |
| Reporting & exports (Excel/PDF), levies | `laporan/*`, `retribusi` | 3 🔜 |
| Weighbridge integration (kitir match + weight post, TPA log ingest) | `webservice/*` (SOAP) | 4 🔜 |
| Field / mobile capture + GPS | (new) | 5 🔜 |

## In scope (this rebuild)

**Phase 0 (infrastructure):**
- Monorepo setup (pnpm workspaces + Turborepo), Docker Compose (PostgreSQL, Redis, MinIO).
- Database schema + partitioning, Prisma migrations.
- CI/CD pipeline.

**Phase 1 (MVP):**
- Authentication, permission-based RBAC, user management.
- Full CRUD for all master/reference data.
- The core transaction flow: initiate a transaction day → record pickups → record
  disposals/weighing → record fuel, with the trip/haul state machines.
- Data migration of all populated legacy tables (with quality fixes).

## Out of scope (later phases / explicitly deferred)

- 🔜 Monitoring dashboards and analytics (Phase 2).
- 🔜 Excel/PDF report parity and levy/retribusi management (Phase 3).
- 🔜 **Weighbridge integration**: the TPA "Jembatan Timbang" uses a **separate desktop app** that
  captures CCTV + scale weight; an operator matches the plate number to the **kitir** code and posts
  the weighing to the server *before* sanitary-landfill dumping (landfill run by **PT. Surveyor
  Indonesia**). The new system will expose a modern API for this (replacing legacy SOAP
  `getKitir`/`getBkosong`/weight-post). The contract is **documented now** (see
  [`09-modules/integration-weighbridge.md`](./09-modules/integration-weighbridge.md)) but
  **built in Phase 4**.
- 🔜 Field/driver mobile app and live GPS tracking (Phase 8).

## Legacy → new stack summary

| Concern | Legacy | New |
|---------|--------|-----|
| Web framework | CodeIgniter 2.1.4 (PHP 5) | NestJS (backend) + Next.js (frontend) |
| UI | jQuery, Bootstrap 3, jTable, Flot/Morris | React, Tailwind, shadcn/ui, Recharts |
| DB | MySQL 5.6 (latin1) | PostgreSQL (UTF-8) via Prisma |
| API | SOAP (NuSOAP) + server-rendered pages | REST (OpenAPI), JSON `ApiResponse<T>` |
| Auth | MD5 + CI sessions | Argon2/bcrypt + httpOnly cookie sessions |
| AuthZ | menu-grant table | permission-based RBAC |
| Reports | FPDF / PHPExcel | server-side PDF + ExcelJS (Phase 3) |
| Packaging | Apache/XAMPP, `.bat` cron | Docker Compose, scheduled jobs |
| Tests/CI | none | Jest/Vitest + Supertest + Playwright, CI gates |

## Design

The UI is fully designed (hi-fi). The **canonical design source** is the vendored bundle in
[`../designs/`](../designs/) (tokens, 28 components, 21 screens, illustrations); the engineering-facing
mirror is [`13-design/`](./13-design/) (design system, wireframes, hi-fi spec). On any conflict, the
bundle wins. Components are reusable shadcn/ui extensions built from the token layer; dark mode ships
as a token layer in Phase 1 (visual QA in Phase 2).

## Next

Read [`01-glossary.md`](./01-glossary.md) for naming, then
[`02-domain-model.md`](./02-domain-model.md) for the business process and entities.
