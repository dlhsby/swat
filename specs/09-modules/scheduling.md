# 09.01 — Scheduling Module

## Overview

The Scheduling module defines how standing crew assignments (vehicle + driver + fixed times) and planned routes (legs with target times and fuel requests) are authored in the system. These schedules become the **seeds for daily operations** via an idempotent daily init job that creates the transaction day and all hauls, assignments, and trips.

**Key concepts:**
- **CrewSchedule:** A vehicle↔driver pairing with fixed depart and return times (time-of-day), active every operational day.
- **TripTemplate:** A planned leg within a CrewSchedule (route, target time, fuel request).
- **Daily initialization:** Each morning, a scheduled job reads all active CrewSchedules and instantiates that day's `TransactionDay`, `Haul` (one per vehicle), `HaulAssignment` (driver assignment), and `Trip` records (one per template leg).

---

## 1. Entities

### 1.1 CrewSchedule

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | Int | PK | |
| `legacyId` | Int? | — | For migration traceability (unique) |
| `vehicleId` | Int | FK | Vehicle (Kendaraan) |
| `driverId` | Int | FK | Driver (Pengemudi) |
| `departTime` | Time (HH:mm) | ✓ | Time-of-day, e.g. "07:00" (stored as `@db.Time`, HH:mm:ss format) |
| `returnTime` | Time (HH:mm) | ✓ | Time-of-day, e.g. "17:00" (stored as `@db.Time`, HH:mm:ss format) |
| `tripTemplates` | TripTemplate[] | — | Ordered legs within the schedule |
| `createdAt` | Timestamptz | — | UTC timestamp |
| `updatedAt` | Timestamptz | — | UTC timestamp |

**Constraints:**
- Unique on `(vehicleId, driverId)` — one crew (standing schedule) per vehicle (reused every operational day; legacy allows variants, but new system standardizes one per vehicle). **Note:** This constraint must be enforced in the schema via `@@unique([vehicleId, driverId])` (see data model §4).
- `returnTime > departTime` — enforced.

**Business rules:**
- CrewSchedules are **standing templates**, active every operational day until explicitly deleted or archived.
- A CrewSchedule generates one `Haul` per vehicle per `TransactionDay` at daily init, with one `HaulAssignment` (the driver) in that haul.
- Operators fill in actual times at runtime.

### 1.2 TripTemplate

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | Int | PK | |
| `legacyId` | Int? | — | For migration traceability (unique) |
| `crewScheduleId` | Int | FK | Parent CrewSchedule |
| `routeId` | Int | FK | Route (Rute) |
| `targetTime` | Time (HH:mm) | ✓ | Planned time-of-day for this leg |
| `fuelRequestedLiters` | Decimal(8,2)? | — | Liters to request (only for REFUEL routes; max 99999.99) |
| `createdAt` | Timestamptz | — | UTC timestamp |
| `updatedAt` | Timestamptz | — | UTC timestamp |

**Constraints:**
- Foreign key to `Route` (enforces valid origin/destination).
- `targetTime` must be within the `CrewSchedule.departTime` to `returnTime` range (warn if out of order).
- Ordering defined by query ordering or by insertion order (client manages UI sequencing via drag-and-drop); no explicit sequence column.

**Business rules:**
- TripTemplates are ordered within a schedule (typically by RouteCategory: DEPART_POOL → REFUEL → PICKUP → DISPOSAL → RETURN_POOL).
- Each TripTemplate maps to a `Trip` at daily init with `targetTime` and `targetOdometer` pre-populated.
- Operators record actual values during the day.

---

## 2. User Stories

1. **As a Scheduler, I want to create a standing crew assignment** so that the same vehicle + driver pair repeats every operational day.
   - Given a vehicle and driver and depart/return times, when I save, then a CrewSchedule is created.
   - Depart and return times must be valid (departure before return).

2. **As a Scheduler, I want to add planned legs to a crew assignment** so that the route sequence is stored.
   - Given a CrewSchedule, when I add a TripTemplate (route + target time + fuel request), then it is inserted.
   - TripTemplates are ordered; I can reorder them via drag-and-drop or by numbering.

3. **As a Scheduler, I want to deactivate or delete an old schedule** so that retired crews do not seed new hauls.
   - Given an active CrewSchedule, when I delete it, then no new hauls are created from it (but historical records remain).

4. **As a System, I want to auto-initiate each operational day** so that trips are ready for operators at start-of-day.
   - At 05:00 daily (configurable), create a `TransactionDay` if not exists, then seed all hauls/assignments/trips from active CrewSchedules.

5. **As an Operator, I want to see my scheduled route and times** so that I know what to do today.
   - Given a haul for today, when I open the haul board, then scheduled trips (from templates) are visible with target times.

---

## 3. Screens (Next.js)

### 3.1 Crew Schedules List
**Path:** `/scheduling/crew-schedules`

**Features:**
- Table: Vehicle (plate number), Driver (name), Depart time, Return time, Trip count, Status (Active/Inactive), Actions (Edit, Delete).
- Filter: Vehicle, Driver, Pool site.
- Search: Vehicle plate, driver name.
- Button: + Create new schedule.

**State & permissions:**
- `crew-schedule:read` — view list.
- `crew-schedule:create` — show "+ Create" button.
- `crew-schedule:update` — show Edit.
- `crew-schedule:delete` — show Delete.

### 3.2 Crew Schedule Detail / Edit
**Path:** `/scheduling/crew-schedules/:scheduleId`

**Layout:**
- **Header:** Vehicle (plate, model), Driver (name), Pool.
- **Section 1 — Schedule Times:**
  - Depart time (time picker, HH:mm).
  - Return time (time picker, HH:mm).
  - Validation message if invalid.
  - Save button.
- **Section 2 — Planned Trips (TripTemplates):**
  - Ordered table: Route (from/to), Route category (DEPART_POOL/REFUEL/PICKUP/DISPOSAL/RETURN_POOL), Target time, Fuel request (liters), Actions.
  - Buttons: + Add leg, Reorder (drag), Delete.
  - When adding: modal to select Route and enter target time + fuel request.

**State & permissions:**
- `crew-schedule:update` — edit times and add/remove legs.

### 3.3 Create Crew Schedule
**Path:** `/scheduling/crew-schedules/new`

**Form:**
1. Vehicle (dropdown; filter by status=GOOD).
2. Driver (dropdown; filter by pool site matching vehicle pool; warn if license expired).
3. Depart time (time picker).
4. Return time (time picker).
5. Button: Next → Add trip templates.

**Step 2 — Add Trips:**
- For each trip, modal: select Route → enter target time → optionally enter fuel request.
- Reorder trips by drag.
- Button: Create Schedule.

**Validation:**
- Vehicle and Driver required.
- Times valid (depart < return).
- At least one trip template.
- No duplicate (vehicle, driver) pair.

---

## 4. API Endpoints

See [`07-api-spec.md`](../07-api-spec.md) **§2.7** for the definitive contract:

- `GET /crew-schedules` — List (paginated, filterable by vehicleId, driverId).
- `GET /crew-schedules/:id` — Get detail + trips.
- `POST /crew-schedules` — Create (vehicle, driver, departTime, returnTime).
- `PATCH /crew-schedules/:id` — Update times.
- `DELETE /crew-schedules/:id` — Soft-delete.
- `GET /trip-templates` — List (filterable by crewScheduleId).
- `POST /crew-schedules/:scheduleId/trip-templates` — Add leg (routeId, targetTime, fuelRequestedLiters).
- `PATCH /trip-templates/:id` — Update leg.
- `DELETE /trip-templates/:id` — Remove leg.

**Example request:**
```json
POST /crew-schedules
{
  "vehicleId": 42,
  "driverId": 7,
  "departTime": "07:00",
  "returnTime": "17:00"
}

Response 201
{
  "success": true,
  "data": {
    "id": 23,
    "vehicleId": 42,
    "driverId": 7,
    "departTime": "07:00",
    "returnTime": "17:00",
    "tripTemplates": []
  }
}
```

```json
POST /crew-schedules/23/trip-templates
{
  "routeId": 10,
  "targetTime": "07:15",
  "fuelRequestedLiters": 20.5
}

Response 201
{
  "success": true,
  "data": {
    "id": 101,
    "crewScheduleId": 23,
    "routeId": 10,
    "targetTime": "07:15",
    "fuelRequestedLiters": 20.5
  }
}
```

---

## 5. Business Rules

1. **One crew per vehicle (standing schedule):** `CrewSchedule(vehicleId, driverId)` is unique; the schedule repeats every operational day.
2. **Time ordering:** `returnTime > departTime` in the CrewSchedule (enforced; 422 if violated).
3. **Target time range:** `TripTemplate.targetTime` should fall within `CrewSchedule.departTime` and `returnTime` (warning only, accepted at server; client may highlight).
4. **Fuel request flexible:** `fuelRequestedLiters` is optional on all routes; only REFUEL routes use it in transaction recording; others ignore the value.
5. **Cascade delete:** Deleting a CrewSchedule cascades to all its TripTemplates; existing hauls remain (not soft-deleted).
6. **Standing schedules are reusable:** A CrewSchedule generates a new `Haul` and `HaulAssignment` every operational day (via daily-init job) until the schedule is deleted.

---

## 6. State Transitions

**CrewSchedule:**
```
ACTIVE (created) ──(delete)──> DELETED (hard delete)
```
- Deletion prevents new hauls from being created from this schedule; historical hauls/trips remain intact.

**TripTemplate (no explicit state):**
- Created within a schedule.
- Deleted when unneeded.
- Cloned to `Trip` instances at daily init.

---

## 7. Permissions

From [`06-auth-rbac.md`](../06-auth-rbac.md):
- `crew-schedule:read` — view schedules.
- `crew-schedule:create` — create.
- `crew-schedule:update` — update times and manage templates.
- `crew-schedule:delete` — delete.

**Typical role permissions:**
- **DataAdmin:** `crew-schedule:*` (full access).
- **PoolOperator:** `crew-schedule:read` (view only).

---

## 8. Acceptance Criteria

- POST `/crew-schedules` with valid vehicle, driver, depart < return → 201, CrewSchedule created
- POST `/crew-schedules` with duplicate (vehicle, driver) pair → 409, "Kendaraan dan pengemudi ini sudah terjadwal"
- POST `/crew-schedules` with depart >= return → 422, "Waktu kembali harus setelah waktu berangkat"
- GET `/crew-schedules/:id` returns vehicle, driver, times, and all TripTemplates in order
- PATCH `/crew-schedules/:id` updates times without deleting TripTemplates
- POST `/crew-schedules/:scheduleId/trip-templates` with valid route, targetTime, fuel → 201, TripTemplate created
- POST `/crew-schedules/:scheduleId/trip-templates` with targetTime outside depart/return range → accept with warning (server-side validation only, not hard rejection)
- POST `/crew-schedules/:scheduleId/trip-templates` with REFUEL route allows fuelRequestedLiters; non-REFUEL routes ignore it (stored but not used)
- GET `/crew-schedules/:id` returns TripTemplates in insertion order (or by explicit sequence if added)
- DELETE `/crew-schedules/:id` soft-deletes schedule; no new hauls created from it
- Historical hauls/trips from deleted schedule remain queryable
- User can view crew schedules list filtered by vehicleId, driverId, or poolSiteId
- User can reorder TripTemplates within a schedule via drag-and-drop (client handles ordering; server honors insertion order by default)

---

## 9. Test Cases

### Unit Tests
- `validateCrewScheduleTimes(depart, return)` → {valid: true/false, errors: []}
  - ("07:00", "17:00") → valid
  - ("17:00", "07:00") → invalid (depart >= return)
  - ("17:00", "17:00") → invalid (equal times)
- `validateTripTemplateTargetTime(departTime, returnTime, targetTime)` → boolean (warning if outside range)
  - depart="07:00", return="17:00", target="08:00" → true (in range)
  - depart="07:00", return="17:00", target="18:00" → true (but warn; accepted for flexibility)
  - depart="07:00", return="17:00", target="06:00" → true (but warn)
- TripTemplate ordering stored/retrieved correctly by insertion order

### Integration Tests
- POST `/crew-schedules` with valid inputs → 201, record created with unique (vehicleId, driverId)
- POST `/crew-schedules` with duplicate (vehicleId, driverId) → 409
- POST `/crew-schedules` with depart >= return → 422, validation error
- PATCH `/crew-schedules/:id` updates depart/return without affecting TripTemplates
- GET `/crew-schedules/:id` returns all TripTemplates in order
- POST `/crew-schedules/:id/trip-templates` with REFUEL route and fuel → 201, fuelRequestedLiters stored
- POST `/crew-schedules/:id/trip-templates` with PICKUP route and fuel → 201, fuelRequestedLiters stored but ignored at runtime
- DELETE `/crew-schedules/:id` soft-deletes; GET returns 404; historical hauls remain
- GET `/crew-schedules?vehicleId=42` filters correctly
- GET `/crew-schedules?poolSiteId=5` filters by vehicle's pool site

### E2E Tests (Playwright)
- Admin creates crew schedule (vehicle, driver, times) → appears in list with correct vehicle/driver info
- Admin adds trip templates to schedule → trips appear in detail view in correct order
- Admin reorders trips via drag-and-drop → order persisted
- Admin edits schedule times → list and detail show updated times; trips not deleted
- Admin soft-deletes schedule → removed from list; no longer appears in filters
- Daily init runs → creates TransactionDay, Hauls with matching TripTemplates for that day (Phase 2 dependency)

---

## 10. Non-functional Notes

- **Performance:** CrewSchedule list should load < 500ms for 1,000 schedules; index on `vehicleId`, `driverId`.
- **Concurrency:** Daily-init job uses database-level locking (upsert on `TransactionDay(date)`) to prevent race conditions.
- **Deletion:** When a CrewSchedule is deleted, it no longer seeds new hauls; historical hauls and trips remain queryable.
- **Time representation:** Store as `Time` (HH:mm:ss); UI displays as HH:mm.
