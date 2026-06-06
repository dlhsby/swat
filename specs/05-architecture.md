# 05 — Architecture

Monorepo structure, tech stack, module layout, deployment topology, and cross-cutting concerns.

## 1. Monorepo layout (pnpm workspaces + Turborepo)

**Root:** `../swat/` (gitroot; `.git/`, `pnpm-workspace.yaml`, `turbo.json`, `package.json`)

```
swat/
├── pnpm-workspace.yaml           # pnpm workspaces definition
├── turbo.json                     # Turborepo config
├── package.json                   # root dev deps & scripts
├── tsconfig.base.json             # base TS config (extended by all packages)
├── .env.example                   # template env vars
│
├── apps/
│   ├── backend/                   # NestJS backend
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── common/            # exception filter, validation pipe, guards
│   │   │   ├── modules/           # feature modules (see §2)
│   │   │   ├── prisma/            # Prisma client
│   │   │   └── config/            # environment & config
│   │   ├── prisma/
│   │   │   ├── schema.prisma      # data model (per 03-data-model.md)
│   │   │   └── migrations/        # schema change history
│   │   ├── test/                  # integration tests
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── web/                       # Next.js App Router PWA
│       ├── app/                   # App Router (src/app)
│       │   ├── (auth)/
│       │   ├── (admin)/           # RBAC: protected layout
│       │   ├── (public)/          # public info pages
│       │   └── api/               # route handlers (mostly proxies to backend)
│       ├── src/
│       │   ├── components/        # React components
│       │   ├── lib/               # utilities, API client, hooks
│       │   ├── types/             # re-exported from packages/schemas
│       │   └── i18n/              # Indonesian i18n config
│       ├── public/                # static + PWA manifest
│       │   ├── manifest.json
│       │   └── service-worker.ts
│       ├── package.json
│       ├── next.config.js         # PWA plugin config
│       └── tsconfig.json
│
├── packages/
│   ├── schemas/                   # Zod schemas (shared validation)
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── user.schema.ts
│   │   │   ├── vehicle.schema.ts
│   │   │   └── ... (one per domain)
│   │   └── package.json
│   │
│   ├── types/                     # TypeScript types (derived from Prisma + Zod)
│   │   ├── src/
│   │   │   └── index.ts           # re-exports all types
│   │   └── package.json
│   │
│   ├── prisma-client/             # Prisma client wrapper (optional)
│   │   ├── src/
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── eslint-config/
│   │   ├── index.js
│   │   └── package.json
│   │
│   └── tsconfig/
│       ├── base.json              # extends from root tsconfig.base.json
│       ├── next.json
│       └── package.json
│
├── infra/
│   ├── docker-compose.yml         # dev stack: postgres, adminer, reverse proxy
│   ├── Dockerfile.backend
│   ├── nginx.conf                 # reverse proxy config
│   └── .env.docker                # docker-compose env overrides
│
├── scripts/
│   ├── migrate-legacy.ts          # MySQL → PostgreSQL ETL (§4 migration)
│   ├── verify-migration.ts        # post-migration validation
│   ├── seed.ts                    # dev seed (enums, reference data, test users)
│   └── tsconfig.json
│
├── .github/
│   └── workflows/
│       ├── lint.yml
│       ├── test.yml
│       └── deploy.yml
│
└── [file] docs, configs
    ├── .gitignore
    ├── .nvmrc                     # Node.js version (18.x+)
    ├── README.md
    └── (specs/ ← this directory, outside monorepo)
```

## 2. Backend (NestJS) — module structure

**Modular by domain** (feature-first, not layer-first). Each module self-contains controller, service,
repository, DTO, and tests.

### Module organization
```
src/
├── common/                        # global
│   ├── exceptions/
│   │   └── app.exception.ts       # GlobalExceptionFilter
│   ├── guards/
│   │   ├── auth.guard.ts          # JWT or session-based
│   │   └── rbac.guard.ts          # permission-check
│   ├── pipes/
│   │   └── validation.pipe.ts     # Zod validation
│   ├── filters/
│   │   └── http-exception.filter.ts
│   ├── decorators/
│   │   ├── @CurrentUser()
│   │   └── @RequirePermissions(...)
│   ├── middleware/
│   │   └── request-logger.ts
│   └── response/
│       └── api-response.ts        # ApiResponse<T> envelope
│
├── config/                        # environment & config
│   ├── index.ts
│   └── database.config.ts
│
├── modules/
│   ├── auth/                      # auth + session (phase 1)
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.module.ts
│   │   ├── dto/
│   │   │   ├── login.dto.ts
│   │   │   └── change-password.dto.ts
│   │   ├── guards/
│   │   │   └── local.strategy.ts  # passport
│   │   └── __tests__/
│   │       └── auth.service.spec.ts
│   │
│   ├── users/                     # user CRUD + profile (phase 1)
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   ├── users.repository.ts    # Prisma queries
│   │   ├── dto/
│   │   │   ├── create-user.dto.ts
│   │   │   └── update-user.dto.ts
│   │   └── __tests__/
│   │
│   ├── roles/                     # role & permission CRUD (phase 1)
│   │   ├── roles.controller.ts
│   │   ├── roles.service.ts
│   │   └── dto/
│   │
│   ├── photos/                    # image upload/metadata (S3-compatible object storage) (phase 1)
│   │   ├── photos.controller.ts   # presigned URL generation, metadata CRUD
│   │   ├── photos.service.ts      # object storage client, lifecycle management
│   │   └── dto/
│   │
│   ├── fleet/                     # vehicles, models, applications, licenses (phase 1)
│   │   ├── vehicles/
│   │   │   ├── vehicles.controller.ts
│   │   │   ├── vehicles.service.ts
│   │   │   ├── vehicles.repository.ts
│   │   │   ├── dto/
│   │   │   │   ├── create-vehicle.dto.ts
│   │   │   │   └── update-vehicle.dto.ts
│   │   │   └── __tests__/
│   │   ├── vehicle-models/
│   │   │   └── ...
│   │   ├── applications/
│   │   │   └── ...
│   │   └── fleet.module.ts
│   │
│   ├── personnel/                 # drivers, licenses (phase 1)
│   │   ├── drivers/
│   │   │   ├── drivers.controller.ts
│   │   │   ├── drivers.service.ts
│   │   │   └── dto/
│   │   ├── licenses/
│   │   │   └── ...
│   │   └── personnel.module.ts
│   │
│   ├── geography/                 # sites, routes (phase 1)
│   │   ├── sites/
│   │   │   ├── sites.controller.ts
│   │   │   ├── sites.service.ts
│   │   │   └── dto/
│   │   ├── routes/
│   │   │   ├── routes.controller.ts
│   │   │   ├── routes.service.ts
│   │   │   └── dto/
│   │   └── geography.module.ts
│   │
│   ├── waste/                     # waste sources, vehicle assignments (phase 1)
│   │   ├── waste-sources/
│   │   │   └── ...
│   │   ├── vehicle-waste-sources/
│   │   │   └── ...
│   │   └── waste.module.ts
│   │
│   ├── scheduling/                # crew schedules, trip templates, fuel quotas (phase 1)
│   │   ├── crew-schedules/
│   │   │   ├── crew-schedules.controller.ts
│   │   │   ├── crew-schedules.service.ts
│   │   │   └── dto/
│   │   ├── trip-templates/
│   │   │   └── ...
│   │   ├── fuel-quotas/
│   │   │   └── ...
│   │   └── scheduling.module.ts
│   │
│   ├── transactions/              # transaction days, hauls, trips (phase 1)
│   │   ├── transaction-days/
│   │   │   ├── transaction-days.controller.ts
│   │   │   ├── transaction-days.service.ts
│   │   │   └── dto/
│   │   ├── hauls/
│   │   │   └── ...
│   │   ├── trips/
│   │   │   ├── trips.controller.ts
│   │   │   ├── trips.service.ts    # state machine + business rules
│   │   │   └── dto/
│   │   ├── services/
│   │   │   └── daily-init.service.ts  # scheduled job
│   │   └── transactions.module.ts
│   │
│   ├── monitoring/                # dashboards, aggregates (phase 2)
│   │   └── monitoring.module.ts   # placeholder; future work
│   │
│   ├── reports/                   # excel/pdf exports (phase 3)
│   │   └── reports.module.ts      # placeholder
│   │
│   └── integration/               # weighbridge SOAP→REST gateway (phase 4)
│       └── integration.module.ts  # placeholder
│
├── prisma/
│   └── prisma.service.ts          # PrismaClient provider
│
├── app.module.ts                  # root
└── main.ts                        # bootstrap
```

### Layered pattern (per module)
```typescript
// 1. DTO (validation via Zod schema, injected in pipe)
// In packages/schemas: define and export the schema
export const createVehicleSchema = z.object({
  plateNumber: z.string().regex(/^[A-Z]{1,2} \d{1,4} [A-Z]{1,3}$/),
  modelId: z.number().int().positive(),
  poolSiteId: z.number().int().positive(),
})
export type CreateVehicleDto = z.infer<typeof createVehicleSchema>

// 2. Controller (HTTP handler, calls service)
@Controller('vehicles')
@UseGuards(AuthGuard)
export class VehiclesController {
  constructor(private vehiclesService: VehiclesService) {}
  
  @Post()
  @RequirePermissions('vehicle:create')
  @UsePipes(new ZodValidationPipe(createVehicleSchema))
  async create(@Body() dto: CreateVehicleDto): Promise<ApiResponse<Vehicle>> {
    const data = await this.vehiclesService.create(dto)
    return { success: true, data }
  }
}

// 3. Service (business logic, calls repository)
@Injectable()
export class VehiclesService {
  constructor(private repo: VehiclesRepository) {}
  
  async create(dto: CreateVehicleDto) {
    // validation, state checks, derived fields
    return this.repo.create(dto)
  }
}

// 4. Repository (Prisma queries only)
@Injectable()
export class VehiclesRepository {
  constructor(private prisma: PrismaService) {}
  
  async create(data: CreateVehicleDto) {
    return this.prisma.vehicle.create({ data })
  }
}
```

### Global response envelope
```typescript
// common/response/api-response.ts
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  meta?: {
    total?: number
    page?: number
    limit?: number
  }
}

// Every endpoint returns ApiResponse<T>
@Get()
async list(): Promise<ApiResponse<Vehicle[]>> {
  const data = await this.vehiclesService.list()
  return { 
    success: true, 
    data,
    meta: { total: data.length }
  }
}
```

### Validation & parsing
```typescript
// pipes/validation.pipe.ts
import { z } from 'zod'

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: z.ZodSchema) {}
  
  transform(value: any) {
    const result = this.schema.safeParse(value)
    if (!result.success) {
      throw new BadRequestException(result.error.errors)
    }
    return result.data
  }
}

// Usage in controller
@Post()
@UsePipes(new ZodValidationPipe(createVehicleSchema))
async create(@Body() dto: CreateVehicleDto) { ... }
```

### Auth & RBAC
```typescript
// guards/auth.guard.ts: checks session/JWT
// guards/rbac.guard.ts: checks User.role.permissions

@Decorators()
@RequirePermissions('vehicle:create', 'vehicle:update')
@UseGuards(AuthGuard, RbacGuard)
async create() { ... }
```

### Configuration
```typescript
// config/index.ts
import { registerAs } from '@nestjs/config'

export default registerAs('app', () => ({
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV,
  database: {
    url: process.env.DATABASE_URL,
  },
  auth: {
    sessionSecret: process.env.SESSION_SECRET,
    // ...
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
}))

// app.module.ts
@Module({
  imports: [
    ConfigModule.forRoot({
      load: [appConfig],
      isGlobal: true,
    }),
    // ...
  ],
})
```

## 3. Frontend (Next.js) — App Router + PWA

### Architecture
- **Server Components** (default): data fetching on server, reduced bundle.
- **Client Components** (`'use client'`): interactive forms, React Query cache.
- **API Routes** (`app/api/*`): thin proxies to backend; authentication via cookies.
- **i18n:** `next-intl` (Indonesian-first; URL prefix `/id/` optional if monolingual).
- **PWA:** `@ducanh2912/next-pwa` or **Serwist** (manifest, service worker, offline shell).
- **Styling:** Tailwind CSS + shadcn/ui.
- **Form handling:** React Hook Form + Zod validation.
- **Client caching:** React Query (`@tanstack/react-query`).

### Structure
```
app/
├── layout.tsx                     # root layout (metadata, providers)
├── page.tsx                       # home / dashboard redirect
├── (auth)/
│   ├── login/
│   │   ├── page.tsx
│   │   └── LoginForm.tsx          # client component
│   ├── change-password/
│   │   └── page.tsx
│   └── auth-layout.tsx
├── (admin)/
│   ├── layout.tsx                 # protected by middleware; RBAC checks
│   ├── dashboard/
│   │   └── page.tsx               # server component: fetch user + aggregates
│   ├── vehicles/
│   │   ├── page.tsx               # list server component (fetch server-side)
│   │   ├── [id]/
│   │   │   ├── page.tsx           # detail page
│   │   │   └── EditForm.tsx       # client component + React Query
│   │   └── create/
│   │       └── page.tsx
│   ├── drivers/
│   │   └── ...
│   ├── geography/
│   │   ├── sites/
│   │   │   └── ...
│   │   └── routes/
│   │       └── ...
│   ├── transactions/
│   │   ├── transaction-days/
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx       # day details + trip list
│   │   │       └── CreateTripForm.tsx
│   │   └── ...
│   └── users/                     # admin-only user management
│       └── ...
├── (public)/
│   ├── page.tsx                   # public home / info
│   └── help/
│       └── page.tsx
└── api/
    ├── auth/
    │   └── [...slug]/
    │       └── route.ts           # auth proxy endpoints
    ├── vehicles/
    │   └── [...slug]/
    │       └── route.ts           # REST proxy (GET, POST, PUT, DELETE)
    └── ...
```

### Server vs. Client components
```typescript
// app/vehicles/page.tsx (server component: data fetch only)
export default async function VehiclesPage() {
  const response = await fetch(`${API_URL}/vehicles`, {
    headers: { Cookie: headers().get('cookie') }
  })
  const { data: vehicles } = await response.json()
  
  return (
    <main>
      <VehicleTable vehicles={vehicles} />
    </main>
  )
}

// components/VehicleTable.tsx (client component: interactivity)
'use client'

import { useQuery, useMutation } from '@tanstack/react-query'

export function VehicleTable({ initialVehicles }) {
  const { data: vehicles = initialVehicles } = useQuery({
    queryKey: ['vehicles'],
    queryFn: async () => {
      const res = await fetch('/api/vehicles')
      return res.json().then(r => r.data)
    },
    initialData: initialVehicles,
  })
  
  const { mutateAsync: deleteVehicle } = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/vehicles/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      return res.json()
    },
  })
  
  return (
    <table>
      {vehicles.map(v => (
        <tr key={v.id}>
          <td>{v.plateNumber}</td>
          <td>
            <button onClick={() => deleteVehicle(v.id)}>Hapus</button>
          </td>
        </tr>
      ))}
    </table>
  )
}
```

### PWA (installable + offline app shell)
```typescript
// next.config.js
const withPWA = require('@ducanh2912/next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
})

module.exports = withPWA({
  reactStrictMode: true,
})

// public/manifest.json
{
  "name": "SWAT — Pengangkutan Sampah",
  "short_name": "SWAT",
  "description": "Sistem Pengangkutan Sampah DLH Surabaya",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#1f2937",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    // ... 512x512, etc.
  ]
}
```

**Phase 1:** installable app + offline shell only (no offline data capture yet).

### i18n (next-intl, Phase 1: Indonesian only)
```typescript
// src/i18n.ts
import { getRequestConfig } from 'next-intl/server'

export default getRequestConfig(async ({ locale }) => {
  return {
    messages: (await import(`./messages/${locale}.json`)).default,
  }
})

// app/layout.tsx
import { notFound } from 'next/navigation'
import { setRequestLocale } from 'next-intl/server'

export default async function RootLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode
  params: { locale: string }
}) {
  if (!['id-ID'].includes(locale)) notFound()
  setRequestLocale(locale)
  
  return (
    <html lang={locale}>
      <body>{children}</body>
    </html>
  )
}

// src/messages/id-ID.json
{
  "nav": {
    "vehicles": "Kendaraan",
    "drivers": "Pengemudi",
    "sites": "Lokasi",
    "transactions": "Transaksi",
    "users": "Pengguna"
  },
  ...
}

// In components:
import { useTranslations } from 'next-intl'

export function Navigation() {
  const t = useTranslations()
  return <nav><a href="/vehicles">{t('nav.vehicles')}</a></nav>
}
```

## 4. Shared packages

### schemas/ (Zod validation, single-sourced)
```typescript
// packages/schemas/src/vehicle.schema.ts
import { z } from 'zod'

export const createVehicleSchema = z.object({
  plateNumber: z.string().regex(/^[A-Z]{1,2} \d{1,4} [A-Z]{1,3}$/),
  modelId: z.number().int().positive(),
  poolSiteId: z.number().int().positive(),
  currentOdometer: z.number().int().nonnegative(),
  currentTareWeight: z.number().int().nonnegative(),
})

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>
export type CreateVehicleDto = CreateVehicleInput
```

Both backend (NestJS validation pipe) and frontend (React Hook Form) use the same schema:
```typescript
// Backend
@UsePipes(new ZodValidationPipe(createVehicleSchema))
async create(@Body() dto: CreateVehicleDto) { ... }

// Frontend
const form = useForm<CreateVehicleInput>({
  resolver: zodResolver(createVehicleSchema),
})
```

### types/ (TypeScript types)
```typescript
// packages/types/src/index.ts
export type * from '@prisma/client'
export type { CreateVehicleInput } from '@repo/schemas'
export type * from './custom-types.ts'
```

## 5. Infrastructure (Docker)

### docker-compose.yml (dev)
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: swat
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: swat
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U swat"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  minio:
    image: minio/minio:latest
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: ${MINIO_PASSWORD:-minioadmin}
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/minio
    command: minio server /minio --console-address ":9001"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 10s
      timeout: 5s
      retries: 5

  adminer:
    image: adminer:latest
    ports:
      - "8080:8080"
    depends_on:
      - postgres

  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://swat:${POSTGRES_PASSWORD}@postgres:5432/swat
      REDIS_URL: redis://redis:6379
      MINIO_ENDPOINT: minio:9000
      MINIO_ACCESS_KEY: minioadmin
      MINIO_SECRET_KEY: ${MINIO_PASSWORD:-minioadmin}
      MINIO_BUCKET: swat-photos
      PORT: 3000
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      minio:
        condition: service_healthy
    volumes:
      - ./apps/backend/src:/app/src
    command: npm run dev

  web:
    build:
      context: .
      dockerfile: Dockerfile.web
      target: dev
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:3000
    ports:
      - "3001:3000"
    depends_on:
      - backend
    volumes:
      - ./apps/web/app:/app/app

volumes:
  postgres_data:
  minio_data:
```

## 6. Deployment topology

### Phase 1 (MVP)
- **Single Docker host** (e.g. DigitalOcean Droplet, AWS EC2).
- **Containerized:** backend + web + postgres + nginx reverse proxy.
- **Volumes:** postgres data persistence; photos to S3-compatible object storage (MinIO self-hosted or managed).
- **Env:** `.env` file for secrets; no hardcoded keys.

### Scaling & Operational Efficiency (see [`12-scalability-archiving.md`](./12-scalability-archiving.md) for canonical strategy)

**Data & Storage:**
- **Photos from Phase 1:** S3-compatible object storage (MinIO self-hosted or managed AWS S3/GCS) for all images —
  DB stores metadata only (object key, checksum, dimensions), never image bytes. Buckets: `swat-photos` (originals), 
  `swat-thumbnails` (grid rendering), `swat-reports` (Phase 3 exports).
- **Partitioning + rollups + archiving** (see [`12-scalability-archiving.md`](./12-scalability-archiving.md) §2–4): transactional tables (`Trip`, `Haul`, `HaulAssignment`, `TpaInboundLog`) are monthly range-partitioned by `operationDate`; old partitions (>13 months) archived; reporting/monitoring read pre-aggregated rollup tables, not raw history.

**Caching & Session Management** (see [`12-scalability-archiving.md`](./12-scalability-archiving.md) §5):
- **Redis from Phase 1:** sessions, rate-limiting, reference-data cache (TTL 1h, invalidate on write).
- **Dashboard KPI caching (Phase 2):** monitoring aggregates cached in Redis (TTL 15 min), backed by rollup tables.

**Database & Connections:**
- **PostgreSQL scaling:** Managed PostgreSQL (AWS RDS / Google Cloud SQL / Azure Database) with automatic backups.
- **Connection pooling:** PgBouncer in transaction mode for high concurrency at daily peak.
- **Read replica (Phase 2+, optional):** offload reporting/monitoring queries from operational primary.

**Deployment:**
- **Orchestration:** Kubernetes or Docker Swarm (if multi-node).
- **CI/CD:** GitHub Actions (lint, test, build, push registry, deploy).

## 7. CI/CD outline

### GitHub Actions workflow (`.github/workflows/`)

```yaml
# test.yml
name: Test
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm exec turbo run build
      - run: pnpm exec turbo run lint
      - run: pnpm exec turbo run test
      - run: pnpm exec turbo run test:e2e
```

## 8. Component diagram (Mermaid)

```mermaid
graph TB
  Client["🌐 Browser / Mobile\n(Next.js PWA)"]
  
  subgraph "Frontend Layer"
    Web["Next.js App Router\n- React Components\n- Server/Client split\n- React Query"]
  end
  
  subgraph "Backend Layer"
    API["NestJS REST API\n- Controllers\n- Services\n- Business Logic"]
  end
  
  subgraph "Data Layer"
    Prisma["Prisma ORM"]
    PG["PostgreSQL 15+\n- Normalized schema\n- RBAC tables"]
  end
  
  subgraph "Shared Packages"
    Schemas["Zod Schemas\n(validation)"]
    Types["TypeScript Types"]
  end
  
  Client -->|HTTP/WS| Web
  Web -->|REST + JSON| API
  API -->|Queries/Mutations| Prisma
  Prisma -->|SQL| PG
  API -.->|imports| Schemas
  API -.->|imports| Types
  Web -.->|imports| Schemas
  Web -.->|imports| Types
  
  subgraph "Infrastructure"
    Docker["Docker Compose\n- postgres container\n- backend container\n- nginx"]
  end
  
  API -.->|runs in| Docker
  Web -.->|runs in| Docker
```

## 9. Configuration & secrets

### Environment variables
No hardcoded secrets. Config via `.env` (local dev) and GitHub Secrets (CI/CD).

```bash
# .env (dev, not in git)
DATABASE_URL=postgresql://swat:password@localhost:5432/swat
SESSION_SECRET=dev-secret-key-change-in-prod
JWT_SECRET=dev-jwt-key
LOG_LEVEL=debug
NODE_ENV=development
PORT=3000
```

### Secret management (production)
- GitHub Secrets for CI/CD (GH Actions injects into env).
- Docker Secrets (if Docker Swarm) or Kubernetes Secrets (if k8s).
- Vault / HashiCorp Vault (if multi-env, not MVP).

---

**Next:** See [`06-auth-rbac.md`](./06-auth-rbac.md) for authentication & permission model, and
[`07-api-spec.md`](./07-api-spec.md) for REST API conventions. For scalability, partitioning, and
caching strategy, see [`12-scalability-archiving.md`](./12-scalability-archiving.md).
