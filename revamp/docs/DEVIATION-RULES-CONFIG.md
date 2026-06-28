# GPS Deviation Rules — Operator Configuration Guide

Phase 7 raises **deviation alerts** when a tracked vehicle departs from its expected route corridor,
sequence, or schedule. Each rule type is **tunable** at runtime — no redeploy needed.

> Permission: tuning requires **`deviation-rule:manage`** (held by the *Administrasi Data* role).
> Read-only roles never see the controls.

## Where to tune

- **UI:** Pengaturan (Settings) → **Pelacakan** → *Aturan Penyimpangan*. One card per rule type;
  each saves independently.
- **API:** `GET /api/v1/gps/deviation-rules` to read; `PUT /api/v1/gps/deviation-rules/:type` to update
  (body: `{ threshold?, hysteresisSec?, severity?, enabled? }`).

## The four rule types & seeded defaults

Seeded idempotently by `prisma/seed.ts` (so a reseed restores these):

| Type | What it detects | `threshold` | `hysteresisSec` | `severity` | Notes |
|------|------------------|-------------|-----------------|------------|-------|
| `off_corridor` | Vehicle drifts farther than the buffer from its corridor | **150 m** | **30 s** | `WARNING` | The only rule that debounces GPS noise (see below) |
| `off_sequence` | Visits a site out of the planned order | — (n/a) | 0 | `WARNING` | Membership/order check; no distance threshold |
| `dwell_too_long` | Stationary **outside** any site geofence beyond the limit | **600 s** (10 min) | 0 | `INFO` | Dwell *inside* a site (loading/dumping) is legitimate and never alerts |
| `late_to_schedule` | Arrives later than the trip's target time + grace | **900 s** (15 min) | 0 | `INFO` | |

`threshold` units are **metres** for `off_corridor` and **seconds** for `dwell_too_long` /
`late_to_schedule`. `off_sequence` has no threshold.

## Severity

`INFO` < `WARNING` < `CRITICAL`. Severity drives how prominently an alert surfaces in the alert center
and efficiency dashboards — it does **not** change detection. Raise to `CRITICAL` for conditions an
operator must act on immediately; keep informational signals at `INFO` to avoid alert fatigue.

## Hysteresis (debounce) — why only `off_corridor` uses it

`hysteresisSec` suppresses flapping: a deviation must **persist** for that many seconds before an alert
is raised, so a single noisy GPS fix that briefly jumps off-corridor never alerts. Only `off_corridor`
is position-noise-sensitive (raw lat/lng vs a buffered line), so it defaults to 30 s. The other three
key off discrete events (a wrong-site visit, a sustained stop, a schedule comparison) that don't flap,
so they default to 0. Increase `off_corridor` hysteresis if you still see noise on a low-accuracy fleet;
decrease it if real excursions are detected too slowly.

## Tuning guidance

- **Too many `off_corridor` alerts?** Widen the corridor tolerance (raise `threshold`, e.g. 150 → 250 m)
  and/or raise `hysteresisSec`. Narrow, well-snapped corridors + low-accuracy GPS need more slack.
- **Missing real excursions?** Lower the threshold, but watch for noise.
- **`dwell_too_long` noisy at depots/TPA?** Confirm the site's `geofenceRadiusM` covers the working
  area first (dwell inside a site never alerts); only then adjust the threshold.
- **Disable a rule** entirely via the `enabled` toggle while you calibrate — alerts stop immediately.

A route with **no corridor** drawn skips `off_corridor` automatically (tracked, not corridor-checked);
an **untracked** vehicle (no GPS device) produces no corridor deviations at all — only schedule lateness.
