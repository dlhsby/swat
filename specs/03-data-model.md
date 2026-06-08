# 03 — Data Model (PostgreSQL + Prisma)

Target schema for the new database. Names follow [`01-glossary.md`](./01-glossary.md). Source of the
legacy structure: `../old_swat/db_backup/dkp_swat_2026_05_18_structure.sql` (44 tables, MySQL 5.6,
latin1).

## 1. Design decisions

- **Full rename to English** (no `@@map` back to Indonesian table names). A `legacyId` column is
  kept on every migrated entity for traceability/debugging; it is nullable and indexed.
- **Status/category lookup tables → Prisma enums** where the rows are pure state
  (`statustrayek`, `statuskendaraan`, `statusjatahkitir`, `kategorispot`, `kategorirute`,
  `statuskepegawaian`, `statusriwayatperawatan`, `status{haritransaksi,transaksi,detail}`).
- **Lookup tables that carry data stay tables:** `Fuel` (price), `FuelCategory`, `WasteSource`
  (code+notes), `LicenseClass`, `VehicleApplication`.
- **PKs:** `BigInt` autoincrement for high-volume transactional entities (`Trip`, `HaulAssignment`,
  `Haul`, `FuelQuota`), `Int` autoincrement for master/reference. (Alternative: `cuid()` — decided
  against to keep numeric ordering and migration of legacy sequences simple.)
- **Audit columns on every table:** `createdAt` (`@default(now())`), `updatedAt` (`@updatedAt`)
  on all tables. Additionally, `createdById`/`updatedById` (nullable FK to `User`) are included on
  entities where user attribution matters (transactional records, maintenance).
- **Soft delete:** `deletedAt timestamptz?` on master entities (vehicles, drivers, sites, routes,
  users) so historical references survive. Transactional rows are not soft-deleted (use status).
- **Money:** integer rupiah (`Int`/`BigInt`), never float. **Weights:** `Int` kg. **Distance:**
  `Int` km. **Fuel liters:** `Decimal(8,2)`. **Coordinates:** `Decimal(11,6)`.
- **Timestamps:** `timestamptz` (Prisma `DateTime @db.Timestamptz(6)`), stored UTC.

## 2. MySQL → PostgreSQL type conversions

| Legacy (MySQL) | New (PostgreSQL / Prisma) | Notes |
|----------------|---------------------------|-------|
| `int(11)` PK AUTO_INCREMENT | `Int @id @default(autoincrement())` | master tables |
| `bigint(13/20)` PK | `BigInt @id @default(autoincrement())` | transactional tables |
| `varchar(n)` | `String @db.VarChar(n)` | keep lengths |
| `date` | `DateTime @db.Date` | |
| `datetime` (incl. `0000-00-00`) | `DateTime? @db.Timestamptz(6)` | zero-dates → `NULL` |
| `time` | `DateTime @db.Time` or `String` "HH:mm" | time-of-day for schedules |
| `year(4)` | `Int` | validate 1900–current+1; legacy `1900` → `NULL` |
| `decimal(11,6)` | `Decimal @db.Decimal(11,6)` | lat/lng |
| `float`/`double` | `Decimal` | avoid binary float for fuel/tonnage |
| `int` money (rupiah) | `Int` (or `BigInt` for `retribusi.JUMLAH`) | minor unit = 1 IDR |
| `tinyint(1)` (none here) | `Boolean` | n/a in this schema |
| latin1 text | UTF-8 | re-encode on import |

## 3. Enums

```prisma
enum SiteType        { POOL SPBU TPS TPA }
enum RouteCategory   { DEPART_POOL REFUEL PICKUP DISPOSAL RETURN_POOL }
enum TripStatus      { IN_PROGRESS DONE VERIFIED }
enum DayStatus       { IN_PROGRESS DONE }       // TransactionDay/Haul/HaulAssignment share this
enum FuelQuotaStatus { ACTIVE INACTIVE }
enum VehicleStatus   { GOOD MINOR_DAMAGE MAJOR_DAMAGE LOST }
enum EmploymentStatus{ SATGAS PNS HONORER }
enum MaintenanceStatus { PENDING_APPROVAL APPROVED }
enum MaintenanceType   { SERVICE REPAIR }                  // Servis / Perbaikan
enum InspectionResult  { PASS ATTENTION FAIL }             // overall result (Lolos / Perlu Perhatian / Tidak Lolos)
enum InspectionItemStatus { OK ATTENTION FAIL }            // per checklist item
enum AuthAction      { LOGIN LOGOUT FAILED_LOGIN PASSWORD_CHANGE ACCOUNT_LOCK FORCE_RESET PERMISSION_DENIED }
```

(Legacy numeric IDs map to these by position; see glossary §4 and the migration spec.)

## 4. Prisma schema (representative — the authoritative draft to drop into `apps/backend/prisma/schema.prisma`)

> This is the canonical model shape. Field-by-field it mirrors the legacy columns (renamed).
> Indexes and relations are specified; finalize during Phase 0.
> 
> **Phase 0 requirement:** The generic `Photo` model (with polymorphic ownerType/ownerId) replaces
> all scalar `photo String?` fields and the legacy `dokumentasi*` tables. All photos use object-storage-backed
> attachment pattern per [`12-scalability-archiving.md`](./12-scalability-archiving.md) §6.

```prisma
// ---------- Auth ----------
model User {
  id                 Int      @id @default(autoincrement())
  legacyId           Int?     @unique
  roleId             Int
  role               Role     @relation(fields: [roleId], references: [id])
  name               String   @db.VarChar(100)
  username           String   @unique @db.VarChar(100)
  passwordHash       String   @db.VarChar(255)
  photo              Photo?                                       // 0..1 relation to Photo (ownerType='user', ownerId=userId)
  mustChangePassword Boolean  @default(true)
  createdAt          DateTime @default(now()) @db.Timestamptz(6)
  updatedAt          DateTime @updatedAt @db.Timestamptz(6)
  deletedAt          DateTime? @db.Timestamptz(6)
  tripsRecordedBy    Trip[]                            @relation("TripRecordedBy")
  tripsCreatedBy     Trip[]                            @relation("TripCreatedBy")
  tripsUpdatedBy     Trip[]                            @relation("TripUpdatedBy")
  tripsVerifiedBy    Trip[]                            @relation("TripVerifiedBy")
  haulAssignmentsCreatedBy HaulAssignment[]          @relation("HaulAssignmentCreatedBy")
  haulAssignmentsUpdatedBy HaulAssignment[]          @relation("HaulAssignmentUpdatedBy")
  fuelQuotasCreatedBy FuelQuota[]                    @relation("FuelQuotaCreatedBy")
  fuelQuotasUpdatedBy FuelQuota[]                    @relation("FuelQuotaUpdatedBy")
  leviesCreatedBy     Levy[]                         @relation("LevyCreatedBy")
  leviesUpdatedBy     Levy[]                         @relation("LevyUpdatedBy")
  maintenanceRecordsCreatedBy MaintenanceRecord[]   @relation("MaintenanceRecordCreatedBy")
  maintenanceRecordsUpdatedBy MaintenanceRecord[]   @relation("MaintenanceRecordUpdatedBy")
  inspectionsInspector        VehicleInspection[]   @relation("VehicleInspectionInspector")
  inspectionsCreatedBy        VehicleInspection[]   @relation("VehicleInspectionCreatedBy")
}

model Role {
  id          Int              @id @default(autoincrement())
  legacyId    Int?             @unique
  name        String           @unique @db.VarChar(100)
  createdAt   DateTime         @default(now()) @db.Timestamptz(6)
  updatedAt   DateTime         @updatedAt @db.Timestamptz(6)
  users       User[]
  permissions RolePermission[]
}

model Permission {
  id          Int              @id @default(autoincrement())
  key         String           @unique @db.VarChar(64)   // e.g. "vehicle:create"
  description String           @db.VarChar(255)
  createdAt   DateTime         @default(now()) @db.Timestamptz(6)
  updatedAt   DateTime         @updatedAt @db.Timestamptz(6)
  roles       RolePermission[]
}

model RolePermission {
  roleId       Int
  permissionId Int
  createdAt    DateTime   @default(now()) @db.Timestamptz(6)
  updatedAt    DateTime   @updatedAt @db.Timestamptz(6)
  role         Role       @relation(fields: [roleId], references: [id], onDelete: Cascade)
  permission   Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)
  @@id([roleId, permissionId])
}

model AuthAuditLog {
  id        BigInt     @id @default(autoincrement())
  userId    Int?                                         // FK to User (nullable if login fails before identification)
  username  String     @db.VarChar(100)                 // Username attempted (always present)
  action    AuthAction                                  // login|logout|failed_login|password_change|account_lock|force_reset|permission_denied
  ip        String     @db.VarChar(45)                  // IPv4 or IPv6
  userAgent String     @db.VarChar(512)                 // Browser/client string
  timestamp DateTime   @db.Timestamptz(6)               // UTC
  details   String?    @db.VarChar(512)                 // Optional context (e.g., "5 failed attempts in 15 min")
  createdAt DateTime   @default(now()) @db.Timestamptz(6)
  updatedAt DateTime   @updatedAt @db.Timestamptz(6)
  @@index([userId])
  @@index([timestamp])
  @@index([action])
}

// ---------- Fleet ----------
model VehicleApplication {
  id       Int            @id @default(autoincrement())
  legacyId Int?           @unique
  name     String         @db.VarChar(100)
  createdAt DateTime      @default(now()) @db.Timestamptz(6)
  updatedAt DateTime      @updatedAt @db.Timestamptz(6)
  models   VehicleModel[]
}

model FuelCategory {
  id        Int       @id @default(autoincrement())
  legacyId  Int?      @unique
  name      String    @db.VarChar(20)
  createdAt DateTime  @default(now()) @db.Timestamptz(6)
  updatedAt DateTime  @updatedAt @db.Timestamptz(6)
  fuels     Fuel[]
}

model Fuel {
  id             Int          @id @default(autoincrement())
  legacyId       Int?         @unique
  fuelCategoryId Int
  fuelCategory   FuelCategory @relation(fields: [fuelCategoryId], references: [id])
  name           String       @db.VarChar(100)
  pricePerLiter  Int          @default(0)   // IDR
  createdAt      DateTime     @default(now()) @db.Timestamptz(6)
  updatedAt      DateTime     @updatedAt @db.Timestamptz(6)
  models         VehicleModel[]
}

model VehicleModel {
  id                   Int      @id @default(autoincrement())
  legacyId             Int?     @unique
  applicationId        Int
  application          VehicleApplication @relation(fields: [applicationId], references: [id])
  fuelId               Int
  fuel                 Fuel     @relation(fields: [fuelId], references: [id])
  brand                String   @db.VarChar(100)        // merk
  fuelTankCapacity     Int                              // liters
  normalFuelRatio      Int      @default(1)
  normalTareWeight     Int                              // kg
  maxNetLoad           Int?     @default(0)             // kg
  maxNetVolume         Int?     @default(0)             // m3
  wheelCount           Int
  createdAt            DateTime @default(now()) @db.Timestamptz(6)
  updatedAt            DateTime @updatedAt @db.Timestamptz(6)
  vehicles             Vehicle[]
}

model Vehicle {
  id                  Int      @id @default(autoincrement())
  legacyId            Int?     @unique
  poolSiteId          Int
  poolSite            Site     @relation("VehiclePool", fields: [poolSiteId], references: [id])
  modelId             Int
  model               VehicleModel @relation(fields: [modelId], references: [id])
  status              VehicleStatus @default(GOOD)
  plateNumber         String   @unique @db.VarChar(10)
  chassisNumber       String   @db.VarChar(100)
  engineNumber        String   @db.VarChar(100)
  manufactureYear     Int?
  currentFuelRatio    Int      @default(1)
  currentTareWeight   Int                               // kg
  currentOdometer     Int                               // km
  registrationExpiry  DateTime @db.Date                 // STNK
  taxExpiry           DateTime @db.Date
  photo               Photo?                                       // 0..1 relation to Photo (ownerType='vehicle', ownerId=vehicleId)
  notes               String?  @db.VarChar(512)
  createdAt           DateTime @default(now()) @db.Timestamptz(6)
  updatedAt           DateTime @updatedAt @db.Timestamptz(6)
  deletedAt           DateTime? @db.Timestamptz(6)
  hauls               Haul[]
  crewSchedules       CrewSchedule[]
  fuelQuotas          FuelQuota[]
  wasteSources        VehicleWasteSource[]
  maintenance         MaintenanceRecord[]
  inspections         VehicleInspection[]
  @@index([poolSiteId])
  @@index([modelId])
}

// ---------- Personnel ----------
model LicenseClass {
  id        Int       @id @default(autoincrement())
  legacyId  Int?      @unique
  name      String    @db.VarChar(10)
  createdAt DateTime  @default(now()) @db.Timestamptz(6)
  updatedAt DateTime  @updatedAt @db.Timestamptz(6)
  licenses  DriverLicense[]
}

model Driver {
  id               Int      @id @default(autoincrement())
  legacyId         Int?     @unique
  poolSiteId       Int
  poolSite         Site     @relation("DriverPool", fields: [poolSiteId], references: [id])
  employmentStatus EmploymentStatus
  name             String   @db.VarChar(100)
  idCardNumber     String   @db.VarChar(16)   // KTP
  originAddress    String   @db.VarChar(256)
  currentAddress   String   @db.VarChar(256)
  birthDate        DateTime @db.Date
  contact          String   @db.VarChar(100)
  safetyTraining   String?  @db.VarChar(100) @default("BELUM")
  photo            Photo?                                       // 0..1 relation to Photo (ownerType='driver', ownerId=driverId)
  notes            String?  @db.VarChar(256)
  createdAt        DateTime @default(now()) @db.Timestamptz(6)
  updatedAt        DateTime @updatedAt @db.Timestamptz(6)
  deletedAt        DateTime? @db.Timestamptz(6)
  licenses         DriverLicense[]
  crewSchedules    CrewSchedule[]
  haulAssignments  HaulAssignment[]
  @@index([poolSiteId])
}

model DriverLicense {
  id             Int      @id @default(autoincrement())
  legacyId       Int?     @unique
  driverId       Int
  driver         Driver   @relation(fields: [driverId], references: [id])
  licenseClassId Int
  licenseClass   LicenseClass @relation(fields: [licenseClassId], references: [id])
  licenseNumber  String   @db.VarChar(12)
  expiry         DateTime @db.Date
  createdAt      DateTime @default(now()) @db.Timestamptz(6)
  updatedAt      DateTime @updatedAt @db.Timestamptz(6)
}

// ---------- Geography ----------
model Site {
  id        Int      @id @default(autoincrement())
  legacyId  Int?     @unique
  type      SiteType
  name      String   @db.VarChar(256)
  address   String   @db.VarChar(512)
  photo     Photo?                                       // 0..1 relation to Photo (ownerType='site', ownerId=siteId)
  latitude  Decimal? @db.Decimal(11,6)
  longitude Decimal? @db.Decimal(11,6)
  createdAt DateTime @default(now()) @db.Timestamptz(6)
  updatedAt DateTime @updatedAt @db.Timestamptz(6)
  deletedAt DateTime? @db.Timestamptz(6)
  originRoutes      Route[]   @relation("RouteOrigin")
  destinationRoutes Route[]   @relation("RouteDestination")
  pooledVehicles    Vehicle[] @relation("VehiclePool")
  pooledDrivers     Driver[]  @relation("DriverPool")
  fuelQuotas        FuelQuota[]
  @@index([type])
}

model Route {
  id                Int           @id @default(autoincrement())
  legacyId          Int?          @unique
  category          RouteCategory
  originSiteId      Int
  originSite        Site          @relation("RouteOrigin", fields: [originSiteId], references: [id])
  destinationSiteId Int
  destinationSite   Site          @relation("RouteDestination", fields: [destinationSiteId], references: [id])
  distanceKm        Int
  createdAt         DateTime      @default(now()) @db.Timestamptz(6)
  updatedAt         DateTime      @updatedAt @db.Timestamptz(6)
  deletedAt         DateTime?     @db.Timestamptz(6)
  trips             Trip[]
  tripTemplates     TripTemplate[]
  @@unique([originSiteId, destinationSiteId, category])
}

// ---------- Waste ----------
model WasteSource {
  id       Int    @id @default(autoincrement())
  legacyId Int?   @unique
  code     String @unique @db.VarChar(5)
  name     String @db.VarChar(128)
  notes    String? @db.VarChar(1024)
  createdAt DateTime @default(now()) @db.Timestamptz(6)
  updatedAt DateTime @updatedAt @db.Timestamptz(6)
  vehicles VehicleWasteSource[]
}

model VehicleWasteSource {
  id            Int         @id @default(autoincrement())
  vehicleId     Int
  vehicle       Vehicle     @relation(fields: [vehicleId], references: [id], onDelete: Cascade)
  wasteSourceId Int
  wasteSource   WasteSource @relation(fields: [wasteSourceId], references: [id])
  createdAt     DateTime    @default(now()) @db.Timestamptz(6)
  updatedAt     DateTime    @updatedAt @db.Timestamptz(6)
  @@unique([vehicleId, wasteSourceId])
}

// ---------- Scheduling ----------
model CrewSchedule {
  id            Int      @id @default(autoincrement())
  legacyId      Int?     @unique
  vehicleId     Int
  vehicle       Vehicle  @relation(fields: [vehicleId], references: [id])
  driverId      Int
  driver        Driver   @relation(fields: [driverId], references: [id])
  departTime    DateTime @db.Time
  returnTime    DateTime @db.Time
  createdAt     DateTime @default(now()) @db.Timestamptz(6)
  updatedAt     DateTime @updatedAt @db.Timestamptz(6)
  tripTemplates TripTemplate[]
  haulAssignments HaulAssignment[]
  @@unique([vehicleId, driverId])
}

model TripTemplate {
  id                  Int          @id @default(autoincrement())
  legacyId            Int?         @unique
  crewScheduleId      Int
  crewSchedule        CrewSchedule @relation(fields: [crewScheduleId], references: [id], onDelete: Cascade)
  routeId             Int
  route               Route        @relation(fields: [routeId], references: [id])
  targetTime          DateTime     @db.Time
  fuelRequestedLiters Decimal?     @db.Decimal(8,2)
  createdAt           DateTime     @default(now()) @db.Timestamptz(6)
  updatedAt           DateTime     @updatedAt @db.Timestamptz(6)
}

model FuelQuota {   // "kitir"
  id         BigInt          @id @default(autoincrement())
  legacyId   Int?            @unique
  code       String?         @db.VarChar(50)          // Kitir code (e.g. "KT-202606-0042"); matched at TPA weighbridge
  vehicleId  Int
  vehicle    Vehicle         @relation(fields: [vehicleId], references: [id])
  siteId     Int
  site       Site            @relation(fields: [siteId], references: [id])
  status     FuelQuotaStatus @default(ACTIVE)
  issuedAt   DateTime        @db.Timestamptz(6)
  validFrom  DateTime        @db.Date
  validTo    DateTime        @db.Date
  createdAt  DateTime        @default(now()) @db.Timestamptz(6)
  updatedAt  DateTime        @updatedAt @db.Timestamptz(6)
  createdById Int?
  createdBy   User?          @relation("FuelQuotaCreatedBy", fields: [createdById], references: [id])
  updatedById Int?
  updatedBy   User?          @relation("FuelQuotaUpdatedBy", fields: [updatedById], references: [id])
  @@index([code])
  @@index([vehicleId, status, validFrom, validTo])
  @@index([status, validFrom, validTo])
}

// ---------- Transaction lifecycle ----------
model TransactionDay {
  id        Int       @id @default(autoincrement())
  legacyId  Int?      @unique
  date      DateTime  @unique @db.Date
  status    DayStatus @default(IN_PROGRESS)
  createdAt DateTime  @default(now()) @db.Timestamptz(6)
  updatedAt DateTime  @updatedAt @db.Timestamptz(6)
  hauls     Haul[]
}

model Haul {
  id               BigInt   @id @default(autoincrement())
  legacyId         BigInt?  @unique
  transactionDayId Int
  transactionDay   TransactionDay @relation(fields: [transactionDayId], references: [id])
  vehicleId        Int
  vehicle          Vehicle  @relation(fields: [vehicleId], references: [id])
  operationDate    DateTime @db.Date                    // denormalized from TransactionDay.date; partition key
  status           DayStatus @default(IN_PROGRESS)
  notes            String?  @db.VarChar(256)
  createdAt        DateTime @default(now()) @db.Timestamptz(6)
  updatedAt        DateTime @updatedAt @db.Timestamptz(6)
  assignments      HaulAssignment[]
  @@unique([operationDate, transactionDayId, vehicleId])  // partition key included for cross-partition uniqueness
  @@index([operationDate])
}

model HaulAssignment {
  id                       BigInt   @id @default(autoincrement())
  legacyId                 BigInt?  @unique
  haulId                   BigInt
  haul                     Haul     @relation(fields: [haulId], references: [id])
  driverId                 Int
  driver                   Driver   @relation(fields: [driverId], references: [id])
  crewScheduleId           Int?
  crewSchedule             CrewSchedule? @relation(fields: [crewScheduleId], references: [id])
  operationDate            DateTime @db.Date                    // denormalized from Haul; partition key
  status                   DayStatus @default(IN_PROGRESS)
  departTargetOdometer     Int      @default(0)
  departActualOdometer     Int?
  returnTargetOdometer     Int      @default(0)
  returnActualOdometer     Int?
  departTargetTime         DateTime? @db.Timestamptz(6)
  departActualTime         DateTime? @db.Timestamptz(6)
  returnTargetTime         DateTime? @db.Timestamptz(6)
  returnActualTime         DateTime? @db.Timestamptz(6)
  notes                    String?  @db.VarChar(256)
  createdAt                DateTime @default(now()) @db.Timestamptz(6)
  updatedAt                DateTime @updatedAt @db.Timestamptz(6)
  createdById              Int?
  createdBy                User?    @relation("HaulAssignmentCreatedBy", fields: [createdById], references: [id])
  updatedById              Int?
  updatedBy                User?    @relation("HaulAssignmentUpdatedBy", fields: [updatedById], references: [id])
  trips                    Trip[]
  @@index([haulId])
  @@index([operationDate])
}

model Trip {
  id                   BigInt     @id @default(autoincrement())
  legacyId             BigInt?    @unique
  haulAssignmentId     BigInt
  haulAssignment       HaulAssignment @relation(fields: [haulAssignmentId], references: [id])
  routeId              Int?
  route                Route?     @relation(fields: [routeId], references: [id])
  recordedById         Int?
  recordedBy           User?      @relation("TripRecordedBy", fields: [recordedById], references: [id])
  operationDate        DateTime   @db.Date                    // denormalized from HaulAssignment; partition key
  status               TripStatus @default(IN_PROGRESS)
  name                 String     @db.VarChar(256)
  targetTime           DateTime?  @db.Timestamptz(6)
  actualTime           DateTime?  @db.Timestamptz(6)
  targetOdometer       Int        @default(0)
  actualOdometer       Int        @default(0)
  tareWeight           Int        @default(0)   // kg, from vehicle at disposal; only on DISPOSAL trips
  grossWeight          Int?                     // kg; only on DISPOSAL trips
  netWeight            Int?                     // kg = gross - tare (computed); only on DISPOSAL trips
  wasteVolume          Int?                     // m³; only on DISPOSAL trips
  fuelRequestedLiters  Decimal?   @db.Decimal(8,2)  // liters; only on REFUEL trips
  fuelApprovedLiters   Decimal?   @db.Decimal(8,2)  // liters; only on REFUEL trips; ≤ fuelRequestedLiters
  scheduledEntryAt     DateTime?  @db.Timestamptz(6)
  realizationEntryAt   DateTime?  @db.Timestamptz(6)
  notes                String?    @db.VarChar(512)
  createdAt            DateTime   @default(now()) @db.Timestamptz(6)
  updatedAt            DateTime   @updatedAt @db.Timestamptz(6)
  createdById          Int?
  createdBy            User?      @relation("TripCreatedBy", fields: [createdById], references: [id])
  updatedById          Int?
  updatedBy            User?      @relation("TripUpdatedBy", fields: [updatedById], references: [id])
  verifiedById         Int?
  verifiedBy           User?      @relation("TripVerifiedBy", fields: [verifiedById], references: [id])
  verifiedAt           DateTime?  @db.Timestamptz(6)                    // When trip was verified (locked)
  // photos attached via polymorphic Photo model (ownerType='trip', ownerId=tripId)
  // NOTE: no unique on (haulAssignmentId, routeId, day) — a vehicle legitimately repeats the same
  // route multiple times a day (ritase = trip count). Trips are distinguished by id, not route.
  @@index([haulAssignmentId])
  @@index([routeId])
  @@index([status])
  @@index([operationDate])
}

// ---------- Object Storage & Attachments ----------
model Photo {
  id          BigInt   @id @default(autoincrement())
  objectKey   String   @unique @db.VarChar(512)   // S3-compatible bucket-relative key
  contentType String   @db.VarChar(100)
  sizeBytes   Int
  width       Int?
  height      Int?
  checksum    String   @db.VarChar(64)
  ownerType   String   @db.VarChar(40)            // 'trip' | 'site' | 'driver' | 'user' | 'vehicle' | 'maintenanceItem' | 'inspectionItem'
  ownerId     String                              // polymorphic FK: Int or BigInt serialized as string. User/Vehicle/Driver/Site enforce 0..1 photo (via relation cardinality); Trip allows 0..many. App must validate (ownerType, ownerId) FK.
  createdAt   DateTime @default(now()) @db.Timestamptz(6)
  @@index([ownerType, ownerId])
}

// ---------- Maintenance ----------
model MaintenanceRecord {
  id        BigInt   @id @default(autoincrement())
  legacyId  BigInt?  @unique
  code      String?  @unique @db.VarChar(30)   // e.g. "PRW-202606-0042" (mono in UI)
  vehicleId Int
  vehicle   Vehicle  @relation(fields: [vehicleId], references: [id])
  type      MaintenanceType @default(SERVICE)  // Servis / Perbaikan
  status    MaintenanceStatus @default(PENDING_APPROVAL)
  date      DateTime @db.Date
  odometer  Int?                                // km at service
  workshop  String?  @db.VarChar(256)           // bengkel
  description String? @db.VarChar(512)          // uraian pekerjaan (summary)
  totalCost Int      @default(0)
  notes     String?  @db.VarChar(512)
  createdAt DateTime @default(now()) @db.Timestamptz(6)
  updatedAt DateTime @updatedAt @db.Timestamptz(6)
  createdById Int?
  createdBy User?   @relation("MaintenanceRecordCreatedBy", fields: [createdById], references: [id])
  updatedById Int?
  updatedBy User?   @relation("MaintenanceRecordUpdatedBy", fields: [updatedById], references: [id])
  items     MaintenanceItem[]
  @@index([vehicleId])
  @@index([date])
}

model MaintenanceItem {
  id        BigInt   @id @default(autoincrement())
  legacyId  BigInt?  @unique
  recordId  BigInt
  record    MaintenanceRecord @relation(fields: [recordId], references: [id], onDelete: Cascade)
  name      String   @db.VarChar(256)
  qty       Int      @default(0)
  unitPrice Int      @default(0)
  totalPrice Int     @default(0)
  createdAt DateTime @default(now()) @db.Timestamptz(6)
  updatedAt DateTime @updatedAt @db.Timestamptz(6)
  // documentation photos via polymorphic Photo (ownerType='maintenanceItem', ownerId=itemId)
}

// ---------- Vehicle inspection (legacy: transaksi/pemeriksaankendaraan) ----------
model VehicleInspection {
  id           BigInt   @id @default(autoincrement())
  legacyId     BigInt?  @unique
  vehicleId    Int
  vehicle      Vehicle  @relation(fields: [vehicleId], references: [id])
  date         DateTime @db.Date
  inspectorId  Int?
  inspector    User?    @relation("VehicleInspectionInspector", fields: [inspectorId], references: [id])
  result       InspectionResult @default(PASS)   // derived from items (any FAIL → FAIL; any ATTENTION → ATTENTION)
  passedCount  Int      @default(0)               // # items OK
  totalCount   Int      @default(0)               // total checklist items
  notes        String?  @db.VarChar(512)
  createdAt    DateTime @default(now()) @db.Timestamptz(6)
  updatedAt    DateTime @updatedAt @db.Timestamptz(6)
  createdById  Int?
  createdBy    User?    @relation("VehicleInspectionCreatedBy", fields: [createdById], references: [id])
  items        InspectionItem[]
  @@index([vehicleId])
  @@index([date])
}

model InspectionItem {
  id           BigInt   @id @default(autoincrement())
  inspectionId BigInt
  inspection   VehicleInspection @relation(fields: [inspectionId], references: [id], onDelete: Cascade)
  label        String   @db.VarChar(128)          // checklist item name (e.g. "Rem", "Lampu", "Ban")
  status       InspectionItemStatus @default(OK)  // OK / ATTENTION / FAIL
  notes        String?  @db.VarChar(256)
  createdAt    DateTime @default(now()) @db.Timestamptz(6)
  updatedAt    DateTime @updatedAt @db.Timestamptz(6)
  // documentation photos via polymorphic Photo (ownerType='inspectionItem', ownerId=itemId)
}

// ---------- External / aggregates ----------
model TpaInboundLog {
  id          Int      @id @default(autoincrement())
  legacyId    Int?     @unique
  dateLabel   String?  @db.VarChar(50)
  date        DateTime? @db.Date
  plateNumber String?  @db.VarChar(20)
  depot       String?  @db.VarChar(200)
  sourceTruck String?  @db.VarChar(200)
  grossWeight Int?
  tareWeight  Int?
  netWeight   Int?
  cctvReference String? @db.VarChar(256)           // CCTV reference from weighbridge (Phase 4+)
  tripId      BigInt?                              // FK to Trip (created by post-weighing endpoint)
  createdAt   DateTime @default(now()) @db.Timestamptz(6)
  updatedAt   DateTime @updatedAt @db.Timestamptz(6)
  @@index([date])
  @@index([plateNumber])
  @@index([tripId])
}

model DailyTonnage {
  id        Int      @id @default(autoincrement())
  legacyId  Int?     @unique
  date      DateTime @unique @db.Date
  amount    BigInt   @default(0)             // kg; sum of netWeight on disposal trips
  createdAt DateTime @default(now()) @db.Timestamptz(6)
  updatedAt DateTime @updatedAt @db.Timestamptz(6)
}

model LegacyNameMap {
  id        Int      @id @default(autoincrement())
  si        String?  @db.VarChar(250)
  swat      String?  @db.VarChar(250)
  createdAt DateTime @default(now()) @db.Timestamptz(6)
  updatedAt DateTime @updatedAt @db.Timestamptz(6)
}

// ---------- Levy (Phase 3) ----------
model Levy {
  id           BigInt   @id @default(autoincrement())
  legacyId     BigInt?  @unique
  categoryName String   @db.VarChar(100)         // Category label (e.g., "Retribusi Sampah", "Biaya Administratif"); no separate LevyCategory model yet
  date         DateTime @db.Date                 // Date of levy transaction
  amount       BigInt                            // IDR (integer)
  notes        String?  @db.VarChar(256)         // Optional notes
  createdAt    DateTime @default(now()) @db.Timestamptz(6)
  updatedAt    DateTime @updatedAt @db.Timestamptz(6)
  createdById  Int?
  createdBy    User?    @relation("LevyCreatedBy", fields: [createdById], references: [id])
  updatedById  Int?
  updatedBy    User?    @relation("LevyUpdatedBy", fields: [updatedById], references: [id])
  @@index([date])
  @@index([categoryName, date])
}
```

## 5. Indexing strategy

- **Partition key + operational queries:** `Trip.operationDate`, `Haul.operationDate`, `HaulAssignment.operationDate`
  are partitioned monthly (see [`12-scalability-archiving.md`](./12-scalability-archiving.md) §2) and indexed locally per partition.
- **Monitoring/reporting queries** are date-ranged → explicitly index `TransactionDay.date`,
  `Trip.status`, `FuelQuota(vehicleId, validFrom, validTo)`, `TpaInboundLog(date, plateNumber)`,
  `DailyTonnage.date`, `Levy.date`.
- Foreign keys are all indexed (Prisma auto-indexes relation scalars; add explicit `@@index` on hot paths).
- **Polymorphic lookups:** `Photo(ownerType, ownerId)` indexed for fast attachment queries.
- High-volume tables (`Trip`, `HaulAssignment`, `FuelQuota`) use `BigInt` PKs.

## 6. Constraints & integrity

- All FKs enforced (no `FOREIGN_KEY_CHECKS=0` shortcuts).
- Unique: `Vehicle.plateNumber`, `User.username`, `TransactionDay.date`, `DailyTonnage.date`,
  `Route(origin,destination,category)`, `Haul(operationDate,transactionDayId,vehicleId)`,
  `CrewSchedule(vehicleId,driverId)`, `WasteSource.code`, `VehicleWasteSource(vehicleId,wasteSourceId)`.
- **Trip is NOT unique on route:** a vehicle repeats the same route multiple times a day (ritase);
  trips are distinguished by `id`. Do not add a (haulAssignmentId, routeId, day) unique constraint.
- **Photo cardinality:** Relations enforce 0..1 for User/Vehicle/Driver/Site via field cardinality;
  0..many for Trip/MaintenanceItem (via polymorphic pattern). Enforce via application validation only
  since polymorphic (ownerType, ownerId) cannot have a global unique constraint without breaking trip/item scenarios.
- Check constraints (via Prisma raw SQL migrations): `grossWeight >= tareWeight` (Trip),
  `fuelApprovedLiters <= fuelRequestedLiters` (Trip), `distanceKm >= 0` (Route),
  `validTo >= validFrom` (FuelQuota), `originSiteId <> destinationSiteId` (Route).
- **Polymorphic integrity:** `Photo.ownerId` validation (entity PK exists for the given ownerType) must be
  enforced via application code in the API validation layer (no trigger/FK possible for polymorphic pattern).
  Valid (ownerType, ownerId) pairs: User/Vehicle/Driver/Site allow 0..1 photo each (enforced
  via relation cardinality); Trip/MaintenanceItem allow 0..many.

## 7. Coverage check

Every legacy table maps to a model above (or is intentionally dropped). Tables explicitly
**dropped** and why:
- `menu`, `hakaksesmenu`, `statusmenu` → replaced by `Permission`/`RolePermission` (menu visibility
  is derived from permissions). Migration maps old grants (see auth spec).
- `status*` lookup tables → enums.
- `dokumentasikendaraan`, `dokumentasitrayek`, `dokumentasidetailriwayatperawatan` → generalized to
  the unified `Photo` model (see §8; all empty in legacy, low priority).

**Newly modeled (legacy had behavior but no clean table):**
- **`VehicleInspection` + `InspectionItem`** model the legacy `transaksi/pemeriksaankendaraan`
  controller (which had no dedicated table). Required for parity (design screen "Pemeriksaan
  Kendaraan"). Migration: backfill from legacy inspection rows if any exist; otherwise greenfield.

**Deferred to Phase 4 (weighbridge):**
- **`konversi_si_swat`** (SI ↔ SWAT unit/name conversion used by the weighbridge Excel import) — handled
  in [`09-modules/integration-weighbridge.md`](./09-modules/integration-weighbridge.md) alongside
  `LegacyNameMap`; model it when Phase 4 is built (kept out of the Phase-1 schema deliberately).

The complete table-by-table reconciliation is in [`04-migration.md`](./04-migration.md).

## 8. Scale: partitioning, denormalized date key & images

The system holds **10+ years of high-volume transactional data and a multi-TB image corpus** (see
[`12-scalability-archiving.md`](./12-scalability-archiving.md)). The provided dump is a **partial
master-data snapshot** (transaction tables are empty, transaction images not included); the live
system runs since 2013 with tens of millions of rows and massive photo store. Two schema requirements
follow and are **part of this data model**:

1. **Denormalized `operationDate DATE NOT NULL`** on `Haul`, `HaulAssignment`, and `Trip` (copied
   from the owning `TransactionDay.date`). It is the **partition key** and the index target for all
   operational/reporting queries, avoiding joins for pruning. These tables are **RANGE-partitioned
   monthly** by `operationDate` (created via raw-SQL Prisma migrations; `TpaInboundLog` by `date`,
   `FuelQuota` by `validFrom`). Partition-spanning unique constraints must include the key — e.g.
   `Haul` unique becomes `(operationDate, transactionDayId, vehicleId)`.

2. **Images are NOT stored as URL scalars.** Replace all `photo String?` columns and the legacy
   `dokumentasi*` tables with the generic **`Photo`** model (objectKey in S3-compatible storage; DB
   stores metadata only). The `Photo` model uses a polymorphic pattern: `ownerType` indicates the
   entity kind (`'trip'` | `'site'` | `'driver'` | `'user'` | `'vehicle'` | `'maintenanceItem'`);
   `ownerId` stores the ID (as a string to bridge `Int` and `BigInt` PKs). Definition and the
   pre-signed-URL upload/download flow are in [`12-scalability-archiving.md`](./12-scalability-archiving.md) §6.

**Rollup and archiving:** maintain the small **rollup tables** (`DailyTonnage` + monthly aggregates per §4 of doc 12);
they back reporting/monitoring at scale and are never archived. Transactional partitions are detached
and archived after 13 months (doc 12 §3).
