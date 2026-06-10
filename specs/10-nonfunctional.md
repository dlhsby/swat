# 10 — Non-Functional Requirements

## 1. Security

### Authentication & Authorization
- **Password hashing:** Argon2 (node-argon2) or bcrypt (PBKDF2 acceptable); NO MD5, NO plaintext, NO SHA-256 alone
- **Session management:** httpOnly, Secure, SameSite=Strict cookies (NestJS Passport + express-session middleware)
- **Session storage:** Redis (Phase 1) for scalability; PostgreSQL session store acceptable for MVP if Redis unavailable
- **Forced password change:** first login (`mustChangePassword` flag); users cannot skip
- **Session expiry:** 8 hours of inactivity (sliding window); explicit logout clears session
- **Refresh token (if used):** max lifetime 30 days
- **Permission checks:** on every endpoint (apply `@UseGuards(AuthGuard, RbacGuard)` to controller class or per method)
- **Audit log:** all sensitive actions (create/update/delete user, verify trip, override fuel approval, role/permission changes); includes user ID, timestamp, action, old/new values

### Input Validation
- **All user inputs validated with zod** (frontend + backend schemas must match)
- **Server-side validation mandatory** (never trust client)
- **Parameterized queries:** Prisma ORM used exclusively (no raw SQL)
- **Rate limiting:** see [`07-api-spec.md`](./07-api-spec.md) §1.4 (login max 5 failed attempts per IP/15min with 30min account lock; other endpoints max 100 requests per IP per minute)
- **Max payload:** 10 MB (body + file upload)
- **SQL injection:** impossible with Prisma; Postgres dialect used

### XSS/CSRF/Clickjacking
- **Sanitization:** all user-generated text rendered via React (auto-escaped as JSX text); never use `dangerouslySetInnerHTML` except for admin-controlled, pre-sanitized HTML (currently none)
- **CSRF protection:** SameSite=Strict cookies sufficient for JSON API (no state-changing requests via GET/form); CSRF tokens not needed if POST/PUT/DELETE always checks CORS origin
- **X-Frame-Options:** `DENY` (set via `helmet.frameguard()` middleware in NestJS) to prevent clickjacking
- **X-Content-Type-Options:** `nosniff` (set via `helmet.contentSecurityPolicy()`) to prevent MIME-sniffing attacks
- **Content-Security-Policy:** `default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:` (Tailwind requires `unsafe-inline` for JIT CSS; wasm-unsafe-eval for Next.js runtime)

### Secrets & Environment
- **No hardcoded secrets:** API keys, DB passwords, JWT secrets in `.env` or `.env.local` (never committed)
- **Environment validation:** typed zod schema loaded on app startup (fail fast if missing keys)
- **Secrets rotation:** DB password rotation supported via managed secret store (AWS Secrets Manager / Vault in production)
- **.env.example:** committed with dummy values, guides deployment

### API Security
- **HTTPS only:** enforced via redirect in production; use TLS 1.2+ with strong ciphers
- **API versioning:** `/api/v1/` prefix optional in Phase 1; establish for Phase 2+ if schema changes require backward compatibility
- **Swagger/OpenAPI:** schema generated from NestJS decorators (`@nestjs/swagger`); exclude sensitive fields/examples, keep endpoints behind auth guard
- **Error responses:** never expose stack trace, SQL, internal schema, or paths; return generic "Terjadi kesalahan" (error occurred) with request ID for support tracing
- **Content negotiation:** accept `application/json` only; reject `application/xml`, `text/plain` (prevent XXE, unexpected parsing)
- **Request validation:** enforce max payload size (10 MB per §1); reject oversized bodies

### Dependency Scanning
- **npm audit:** CI gates on `npm audit` (fail if critical vulnerabilities)
- **Automated updates:** Dependabot PRs weekly; review + merge non-major updates
- **Pinned versions:** package-lock.json committed; no floating semver ranges on prod deps

### Database Security
- **Connection string:** not hardcoded; from env var
- **Encryption at rest:** enabled on managed PostgreSQL (AWS RDS, GCP Cloud SQL)
- **Backups:** daily, 30-day retention, tested restore monthly
- **Access control:** separate read-replica user (for reports, Phase 3) with limited permissions
- **Row-level security:** TBD (Phase 2) for multi-tenancy if needed; currently single-tenant

---

## 2. Testing Strategy

### Test-Driven Development (TDD)
**Mandatory workflow per feature/fix:**
1. Write test (RED) — describe expected behavior; test must fail initially
   - Unit tests: pure function inputs/outputs, edge cases
   - Integration tests: API endpoint happy path + error cases
   - E2E tests: user-visible flows (login → action → verify)
2. Run test — confirm it fails (proves test is not passing by accident)
3. Write minimal implementation (GREEN) — just enough to pass the test
4. Run test — confirm it passes
5. Refactor (IMPROVE) — clean up code, extract utilities, ensure immutability
6. Verify coverage ≥80% on the changed files (report via `coverage/lcov-report/`)

**CI/CD gates (enforced on every PR):**
- `npm run test` must pass (unit + integration)
- `npm run test:cov` ≥80% line coverage on changed modules
- Build must succeed (`npm run build`)
- **Pre-commit hook** (optional, can be local): lint + type check must pass

### Test Pyramid

#### Unit tests (60% of tests)
- **Framework:** Vitest (fast, ESM-native)
- **Scope:** individual functions, pure utilities (format.ts, validation schemas)
- **Mocking:** vi.mock() for external dependencies
- **Speed:** <1ms per test
- **Files:** `src/__tests__/unit/` or co-located `*.test.ts`
- **Example:** test zod schema validation, formatters, error mapping

#### Integration tests (25% of tests)
- **Framework:** Jest + Supertest (NestJS integration)
- **Setup:** testcontainers-node for disposable PostgreSQL instance per test suite, or shared fixture with transaction rollback between tests for speed
- **Scope:** API endpoints (auth, CRUD operations), database operations, business logic with DB interactions
- **Database:** seeded with factories (in `apps/backend/test/factories/`) providing realistic test data for each entity type
- **Examples:** test login (correct/wrong password), vehicle CRUD with cascade delete, fuel quota approval workflow, weight validation on disposal trips
- **Cleanup:** rollback transaction per test for isolation; or drop/recreate schema per suite for more thorough cleanup
- **Real data note:** the provided snapshot is master-data-only; production has 10+ years of transactional data (see [`12-scalability-archiving.md`](./12-scalability-archiving.md) §1). Integration tests should simulate realistic volumes via fixture generation.

#### E2E tests (15% of tests)
- **Framework:** Playwright (full browser)
- **Scope:** critical user flows (login → create vehicle → list → edit → delete, haul board workflow)
- **Environment:** staging DB (separate from integration tests)
- **Speed:** slower, run nightly or on release branch
- **Headless:** by default; `--headed` for debugging
- **Files:** `apps/web/tests/e2e/`
- **Example:** test login → navigate to vehicle list → create vehicle → verify in DB

### Test Data & Fixtures

**Important caveat:** The initial DB snapshot is a **master-data-only dump** (reference data: vehicles, sites, drivers, fuel types, etc.). **The LIVE production system since 2013 contains tens of millions of transactional rows** (`Trip`, `Haul`, `HaulAssignment`, `TpaInboundLog`) and a multi-TB image corpus. Test fixtures simulate realistic data volumes for integration tests (see also [`12-scalability-archiving.md`](./12-scalability-archiving.md) §1 for data-growth sizing).

**Factories** (Prisma factory pattern):
```typescript
// apps/backend/test/factories/vehicle.factory.ts
export function createVehicle(overrides?: Partial<Vehicle>) {
  return vehicleRepository.create({
    plateNumber: `B-${randomInt()}-XX`,
    status: VehicleStatus.GOOD,
    ...overrides
  })
}
```

**Seed file:** `apps/backend/test/seed.ts` runs before each integration test suite; populates reference data (sites, fuel categories, waste sources) and sample master entities.

### Coverage Requirements

- **Minimum 80% line coverage** (enforced by CI gate; measured via `npm run test:cov` output)
- **Critical paths 100%:** auth, trip workflow, weight calculation
- **Coverage report:** HTML + LCOV (uploaded to Codecov / SonarQube in Phase 2)

### What to test per layer

| Layer | What | How | Example |
|-------|------|-----|---------|
| **Services** | Business logic, edge cases, errors | Unit + integration | `calculateNetWeight(-1) throws`, `createHaul() on non-existent vehicle throws` |
| **Controllers** | HTTP contract, error status codes | Integration + E2E | `POST /vehicles` returns 400 on invalid plate |
| **Schemas** | Zod validation, field constraints | Unit | `vehiclePlateSchema.parse('invalid')` throws |
| **Database** | Constraints, cascades, unique | Integration | `delete vehicle` cascades to hauls |
| **UI** | Critical flows, error states, validation | E2E + component tests | login → dashboard visible, form validation on blur |

### CI Gates

All of the following must pass before merge:
- **Lint:** `eslint . && prettier --check .`
- **Type check:** `tsc` (backend + frontend)
- **Tests:** `npm run test` (unit + integration); coverage ≥80%
- **Build:** `npm run build` (backend + frontend)
- **E2E (on main branch only):** nightly scheduled run
- **Secrets scanning:** detect and block hardcoded secrets (pre-commit hook via `detect-secrets` or `git-secrets`)

---

## 3. Observability

### Logging

**Framework:** pino (structured JSON logs)

**Config:**
```typescript
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: { target: 'pino-pretty' } // dev only
})
```

**Fields:**
- Request ID (UUID, auto-generated, passed in X-Request-ID header)
- User ID (if authenticated)
- Timestamp (ISO 8601 UTC)
- Level (debug, info, warn, error)
- Message + context object (never log sensitive data: passwords, tokens, full credit cards)

**Example:**
```typescript
logger.info({
  action: 'trip_recorded',
  tripId: 123,
  userId: 45,
  haulId: 67,
  grossWeight: 5000 // OK: operational data
})
```

### Request Tracing

- **Correlation ID:** passed in X-Request-ID header; generated if missing
- **Propagate:** to backend logs, error tracking
- **Support ticket:** include correlation ID for debugging

### Health & Readiness Endpoints

- **GET `/health`:** returns `{ status: "ok" }` (always succeeds if app is running)
- **GET `/ready`:** returns `{ status: "ready" }` if DB connection is healthy; waits up to 5s

### Error Tracking

**Phase 1:** structured logging to stdout/file
**Phase 2:** Sentry integration (error sampling, source maps, releases)

**Config:**
```typescript
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1 // 10% of requests
})
```

### Basic Metrics (Phase 2)

- API response time (p50, p95, p99)
- Error rate per endpoint
- DB query latency
- Active sessions count
- Heap memory usage

---

## 4. Performance

### Pagination

- **Default:** 20 rows per page
- **Max:** 100 rows (hard limit)
- **URL param:** `?page=1&limit=20` (1-indexed)
- **Response:** includes `meta: { total, page, limit }`
- **All list endpoints:** paginated (no unbounded queries)
- **See also:** [`07-api-spec.md`](./07-api-spec.md) §1.1 for authoritative pagination parameters

### Database Indexes

Per data model spec ([`03-data-model.md`](./03-data-model.md)) and partitioning strategy ([`12-scalability-archiving.md`](./12-scalability-archiving.md) §2):

**Partition keys** (enable partition pruning for daily operations; local to each partition):
- `Trip.operationDate` (monthly range partitions)
- `Haul.operationDate` (monthly)
- `HaulAssignment.operationDate` (monthly)
- `TpaInboundLog.date` (monthly)
- `DisposalPermit.validFrom` (yearly)

**Secondary indexes within partitions** (speed status/date range filtering):
- `Trip(operationDate, status)` (for filtering IN_PROGRESS/DONE/VERIFIED within a date range)
- `DisposalPermit(vehicleId, validFrom, validTo)` (for active-permit lookups)
- `TpaInboundLog(date, plateNumber)` (for weighbridge reconciliation by date and vehicle)
- `TransactionDay(date)` unique (daily operations)
- `DailyTonnage(date)` unique (daily aggregates)
- Foreign key columns (auto-indexed by PostgreSQL)

### N+1 Prevention

**Prisma relation loading:**
```typescript
// BAD: N+1 — selects 1 trip + N vehicles
const trips = await prisma.trip.findMany()
for (const trip of trips) {
  const haul = await prisma.haul.findUnique({
    where: { id: trip.haulId }
  })
}

// GOOD: 1 query with relation
const trips = await prisma.trip.findMany({
  include: { haulAssignment: { include: { haul: true } } }
})
```

**Code review checklist:** always include relations upfront; Prisma `select` / `include` is explicit.

### Caching Strategy

**CANONICAL SOURCE: [`12-scalability-archiving.md`](./12-scalability-archiving.md) §5**

All caching decisions are defined in [`12-scalability-archiving.md`](./12-scalability-archiving.md) §5 (layered table: HTTP/CDN, client, reference-data, dashboard aggregates, report artifacts, session/rate-limit). This section highlights key Phase 1 layers only.

**Key principle:** Operational/transactional reads are **never cached server-side** (correctness > speed); speed comes from partitioning + indexes. Aggregated/historical reads are cached aggressively.

**Phase 1 layers:**
- **HTTP/CDN:** static assets (JS, CSS, fonts) with `Cache-Control: max-age=31536000, immutable` (use content hashing for filenames: Next.js does this by default)
- **Operational API responses:** `Cache-Control: no-store` (never cached); always fresh for data entry
- **Client (React Query):** `staleTime: 60000` (60s) for list endpoints, `staleTime: 300000` (5 min) for reference data (sites, vehicles, drivers); invalidate on mutation
- **Redis (Phase 1):** sessions, rate-limit counters, reference-data cache (TTL 1 hour); invalidate on write
- **Dashboard KPIs (Phase 2):** monitoring aggregates via Redis, backed by rollup tables (TTL 15 min); invalidate when a trip is verified
- **Report artifacts (Phase 3):** generated Excel/PDF in object storage; cache key = (report type, filters, data version); expire 7 days

### Payload Limits

- **Request body:** 10 MB (file uploads)
- **Response JSON:** keep <1 MB per request (paginate if needed)
- **Gzip:** enabled by default (Next.js + NestJS)

---

## 5. Reliability

### Database Backups

- **Frequency:** daily at 02:00 UTC (off-hours, local peak from Jakarta is 09:00 WIB)
- **Retention:** 30 days rolling
- **Storage:** AWS S3 / Google Cloud Storage (geographic replication) or managed PostgreSQL automated backups
- **Restore test:** monthly dry-run (restore to test DB, validate critical tables: `Trip`, `Vehicle`, `User`, `Role`)
- **Recovery time:** <1 hour (RTO)
- **Backup strategy:** use managed PostgreSQL automatic backups (AWS RDS, GCP Cloud SQL) when available; for self-hosted, use `pg_dump` compressed to object storage

### Database Migrations

- **Tool:** Prisma Migrate (for Prisma-managed changes); raw SQL for partitioning/specialized DDL
- **Workflow (schema changes):**
  1. Write `.prisma` schema changes in `apps/backend/prisma/schema.prisma`
  2. `prisma migrate dev --name add_field` (creates migration SQL in `prisma/migrations/`)
  3. Review generated migration and commit to git
  4. `prisma migrate deploy` (production, applies pending migrations in order)
- **Workflow (partitioning & DDL):** create raw SQL migrations using `prisma migrate resolve` for manual steps (PostgreSQL `PARTITION BY RANGE`, `pg_partman` config); document in migration commit
- **Rollback:** revert to previous migration state via `prisma migrate resolve` (mark as rolled back); test thoroughly before production
- **Zero-downtime:** design migrations backward-compatible (add column nullable, drop in later migration); test on staging before production deploy

### Graceful Shutdown

- **Timeout:** 30s
- **On SIGTERM:** close HTTP server, drain in-flight requests, close DB connection
- **Health check:** `GET /health` returns 503 after shutdown signal (load balancer removes from pool)

### Monitoring & Alerts (Phase 2)

- **Error rate** > 1% → Slack alert
- **Response time p95** > 2s → Slack alert
- **DB connection pool** > 80% → Slack alert
- **Disk space** < 10% → Slack alert
- **Weekly digest:** error trends, slowest endpoints, most-errored routes

---

## 6. Coding Standards

Echo user's global rules (see `/home/wahyutrip/.claude/rules/coding-style.md`):

### Immutability

**NEVER mutate objects; always create new ones:**

```typescript
// WRONG
function updateUser(user, name) {
  user.name = name
  return user
}

// CORRECT
function updateUser(user, name) {
  return { ...user, name }
}
```

**Prisma:** all queries return new objects; immutable by nature.

### File Organization

- **Small files > few large files:** 200–400 lines typical, 800 max
- **High cohesion, low coupling:** group by domain/feature, not by type
- **Example:**
  - `src/vehicles/vehicle.service.ts` (business logic)
  - `src/vehicles/vehicle.controller.ts` (HTTP routes)
  - `src/vehicles/vehicle.dto.ts` (request/response schemas)
  - `src/vehicles/__tests__/vehicle.service.test.ts`

### Error Handling

**Comprehensive error handling everywhere:**

```typescript
try {
  const result = await riskyOperation()
  return result
} catch (error) {
  // Log with context (for debugging), but not to client
  logger.error({
    operation: 'riskyOp',
    userId: user.id,
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined
  })
  // Return user-friendly error message (never expose internals)
  throw new BadRequestException('User-friendly message')
}
```

**Error mapping (NestJS):**
- Use custom `GlobalExceptionFilter` to catch all exceptions and map to HTTP status codes
- Never return stack traces, SQL, or internal paths to clients
- Always include a `requestId` in error responses for support tracing (see Observability §3)

**Never:**
- Swallow exceptions silently (always log at minimum)
- Expose stack traces, SQL, paths, or schema details to clients
- Log passwords, tokens, API keys, PII, or full request/response bodies

### Input Validation

**Always validate with zod:**

```typescript
import { z } from 'zod'

const CreateVehicleDto = z.object({
  plateNumber: z.string().min(5).max(10),
  modelId: z.number().int().positive(),
  status: z.enum(Object.values(VehicleStatus))
})

// Usage
const validated = CreateVehicleDto.parse(req.body)
```

### Code Quality Checklist

Before marking code complete:
- ✅ Readable names, clear intent
- ✅ Functions < 50 lines
- ✅ Files < 800 lines
- ✅ No nesting > 4 levels
- ✅ Proper error handling
- ✅ **No console.log** (use logger.info)
- ✅ No hardcoded values (constants at top, env vars)
- ✅ **Immutable patterns** (no mutations)
- ✅ Tests pass, coverage ≥80%

### Git Commit Format

```
<type>: <description>

<optional body explaining why>
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`

Example:
```
feat: add fuel quota validation

Validate that vehicle has active DisposalPermit for disposal site.
Reject DISPOSAL trip if no valid fuel quota.
```

---

## 7. Internationalization (i18n) & Localization

**Phase 1: Indonesian only; framework extensible for English (Phase 2+).**

- **Framework:** `next-intl` v9+
- **Locale:** `id-ID` (Indonesian) — only locale supported in Phase 1; see [`01-glossary.md`](./01-glossary.md) for naming authority
- **UI labels:** all sourced from glossary; no hardcoded Indonesian strings in code
- **Dates:** `dd/MM/yyyy` format, displayed in Asia/Jakarta timezone (WIB); locale-aware via `date-fns` with `locale: id` option
- **Numbers & money:** IDR with comma thousands separator (Intl.NumberFormat with `locale: 'id-ID'`); never use floats for currency
- **Message files:** `apps/web/src/messages/id-ID.json` (can split into namespaces if needed)
- **Code:** English only in source (variable names, comments, function signatures); Indonesian only in message JSON and UI rendering

### Configuration in `apps/web/src/i18n.ts`
```typescript
export const locales = ['id-ID'] as const
export const defaultLocale = 'id-ID'
```

---

## 8. Accessibility (target WCAG AA)

Frontend must conform to **WCAG 2.1 AA** standards for accessibility:

- **Color contrast:** 4.5:1 minimum for text, 3:1 for graphics (verify with axe DevTools in component tests)
- **Keyboard navigation:** all interactive elements reachable via Tab; focus visible; modal focus trap
- **Form labels:** every input has `<label>` (not placeholder-only)
- **ARIA:** `role="alert"` for toasts, `aria-label` for icon buttons, `aria-disabled` for disabled state
- **Semantic HTML:** use `<button>`, `<a>`, `<table>` (not `<div>`); `<fieldset>` for form groups
- **Screen reader:** skip-to-main link; logical heading hierarchy (h1 once per page)
- **Testing:** axe-core in component tests; manual accessibility review of critical flows during E2E

---

## 9. Browser Support & Responsive Design

- **Target:** desktop (kiosk, weighbridge terminal)
- **Browsers:** Chrome/Edge 90+, Safari 14+, Firefox 88+
- **Mobile:** responsive CSS (grid layout), but not primary target
- **PWA:** installable on Android, installable on desktop (via manifest)
- **No IE 11 support** (modern ES2020 syntax OK)

---

## 10. Summary: Gate Criteria for Phase 1 Completion

| Criterion | Status |
|-----------|--------|
| 80% test coverage (unit + integration) | Must pass CI |
| All endpoints have @UseGuards(AuthGuard, RbacGuard) | Code review |
| All zod schemas shared (backend + frontend) | Sync check |
| All error messages user-friendly (no stack traces) | Code review |
| Health/readiness endpoints working | E2E test |
| Migrations are reversible | Reviewed |
| Service worker app-shell caching enabled | E2E test |
| All list endpoints paginated | Code review |
| Audit log entries for sensitive actions | Integration test |
| No hardcoded secrets | Pre-commit hook |
| WCAG AA accessibility (critical flows) | Manual + axe |
| CI gates all green | Pre-merge requirement |
