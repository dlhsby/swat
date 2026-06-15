# TPA Tonnage Reconciliation — Design (Phase 4 → Phase 2 impl, T-417)

Phase 4 records every weighing in both `Trip` (the operational record) and
`TpaInboundLog` (the audit/reconciliation source). This document specifies the
nightly job that reconciles the two. Phase 4 prepares the schema + indexes; the
job is implemented in the Phase-2 analytics/rollup track.

## Sources

- **`Trip`** (DISPOSAL category, status `DONE`/`VERIFIED`): `netWeight`,
  `operationDate`, linked vehicle via `HaulAssignment → Haul → Vehicle`.
- **`TpaInboundLog`**: `date`, `plateNumber`, `netWeight`, `tripId` (set for
  API-posted weighings; null for some bulk-imported historical rows).

Indexes already in place for the queries: `TpaInboundLog(date)`, `(plateNumber)`,
`(tripId)`; `Trip(operationDate)`, `(status)`.

## Nightly job (per TransactionDay)

1. `tripTotal = Σ Trip.netWeight` where DISPOSAL + status∈{DONE,VERIFIED} for the day.
2. `logTotal = Σ TpaInboundLog.netWeight` for the day.
3. Compare per-vehicle and in aggregate; flag:
   - **Missing in TPA log** — a DISPOSAL trip with no matching `TpaInboundLog`
     (dumped but not weighed → error).
   - **Missing in SWAT** — a `TpaInboundLog` (`tripId` null) with no matching trip
     (weighed but not in the plan → possible fraud).
   - **Weight mismatch** — both present but `|tripNet − logNet| / logNet > 1%`
     (data-entry error; >5% escalate for review).
4. Update `DailyTonnage.amount` for the day to the reconciled DISPOSAL total.
5. Emit a reconciliation report (counts + flagged rows) for supervisors.

## Matching key

Prefer `TpaInboundLog.tripId = Trip.id` (exact, for API-posted rows). Fall back to
`(date, plateNumber)` for bulk-imported rows lacking `tripId`.

## Phase-4 scope (done here)

- `TpaInboundLog` carries `tripId`, `date`, `plateNumber`, `netWeight` with the
  needed indexes.
- API-posted weighings always create a linked `TpaInboundLog` row.

## Phase-2 scope (to implement)

- The scheduled job above, wired into the existing `RollupService` nightly recompute.
- `DailyTonnage` reconciliation write + a discrepancy report surface in monitoring.
