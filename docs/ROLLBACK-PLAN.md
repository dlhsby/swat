# SWAT Rollback Plan (T-168)

Companion to [`CUTOVER-RUNBOOK.md`](./CUTOVER-RUNBOOK.md). Defines exactly when and
how to revert to the legacy `legacy/web` system after a SWAT cutover.

## Trigger criteria (not "maybe" — any ONE triggers a rollback decision)

Within the **first 24 hours** post-cutover:

1. **Data corruption / loss** — verified incorrect or missing operational data that
   cannot be corrected forward within 1 hour.
2. **Unavailability** — the new system is down or unusable for operators for
   **> 30 minutes** with no fix in sight.
3. **Auth lockout** — a broad set of users cannot log in / reset passwords.
4. **KPI divergence** — daily tonnage / fuel / ritase produced by SWAT diverges from
   the expected legacy baseline by **> 1%** and the cause is unknown.

The **Rollback authority** (DLH Director / CIO) makes the call. Document the trigger,
the decision, and the timestamp.

## Why rollback is cheap here

- Legacy is kept **read-only, intact, for 48 hours** post-cutover (runbook §7).
- The flip is a **DNS / proxy re-point**, not a data move — reverting is the reverse flip.
- Lower the DNS TTL to 60s a day before cutover so a revert propagates in minutes.
- SWAT writes go to a **separate PostgreSQL** — legacy MySQL is untouched by SWAT, so
  reverting loses no legacy data.

## Procedure

1. **Declare rollback** (authority + timestamp); notify operators of a short pause.
2. **Re-point** the production hostname / load-balancer / IP back to the **legacy** app.
3. **Re-enable legacy writes** (restore the MySQL app user's grants / exit maintenance mode).
4. **Verify legacy:** login works, today's data entry works, dashboards render.
5. **Quarantine SWAT data:** SWAT writes made during the live window are isolated in
   PostgreSQL. Keep the post-cutover `pg_dump`; **do not discard** — those entries must be
   re-keyed into legacy manually (or replayed on the next cutover attempt) so no operational
   record is lost.
6. **Announce** legacy is authoritative again; capture a post-mortem of the trigger.

## Data-recovery notes

- If SWAT data must be merged back into legacy: export the affected rows from PostgreSQL
  (filter by `createdAt >= cutover time`) and have the DBA re-enter / bulk-load them into
  the corresponding legacy tables. This is manual by design — the systems' schemas differ.
- If the SWAT PostgreSQL itself is suspect: restore it from the pre-cutover `pg_dump`
  snapshot taken in runbook §2.5 before any re-attempt.

## Staging dry-run (required before cutover)

Rehearse on staging and tick:

- [ ] Flip staging traffic to SWAT, then execute this plan to flip back to legacy.
- [ ] Confirm legacy is reachable + in its expected (read-only→writable) state after revert.
- [ ] Confirm DNS/proxy revert propagates within the expected TTL window.
- [ ] Time the whole revert (target: **< 15 minutes** to legacy-authoritative).
