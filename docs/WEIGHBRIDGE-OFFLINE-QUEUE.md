# Weighbridge Offline Queue — Design (Phase 4, T-413)

Design for the TPA desktop app's offline fallback. The SWAT server side that
makes this safe (idempotency) is **already implemented**; the queue itself lives
in the desktop app (vendor: PT. Surveyor Indonesia).

## Problem

The weighbridge is on the TPA critical path. A network blip must not block a truck
from being weighed, and recovery must never double-count a weighing.

## Desktop-app queue

- **Local store:** a SQLite table `pending_weighing` mirroring the
  `POST /weighbridge/post-weighing` body, plus:
  - `idempotency_key` (UUID v4, generated **once** when the weighing is captured),
  - `status` (`PENDING` | `SENT` | `FAILED`),
  - `attempts`, `last_error`, `created_at`.
- **Capture:** on "Terima", always write the row locally first, then attempt the
  POST. The generated `idempotency_key` is the row's stable identity.
- **Online path:** POST immediately with `Idempotency-Key: <key>`. On `201` mark
  `SENT`. On `422`/`409` (business rejection) mark `FAILED` and surface to the
  operator — these will not succeed on retry.
- **Offline / 5xx / timeout path:** leave `PENDING`; a background sync worker
  retries with exponential backoff (e.g. 5s, 15s, 60s, 5m, capped) whenever
  connectivity returns.

## Why it is safe — server idempotency (implemented)

`POST /weighbridge/post-weighing` accepts `Idempotency-Key`. The server caches the
successful response in Redis for 24h keyed by `wb:idem:<key>`. A replayed request
with the same key returns the **same** `201` body and creates **no** additional
Trip or `TpaInboundLog`. So the desktop app may retry a `PENDING` row any number of
times across reconnects without risk of duplicates, as long as it reuses the
original key.

## Conflict resolution

- Same key, already processed → server replays the cached result; desktop marks
  `SENT`.
- Key expired from cache (>24h) **and** the weighing was already persisted: rare;
  detect via `GET /weighbridge/weighings?date=&plateNumber=` before resending, or
  accept the (idempotent-at-the-natural-key) Excel reconciliation to catch it.
- Business rejection (`409`/`422`): never auto-retry; require operator action.

## Operator UX

Show a small "N pending sync" indicator; allow manual "sync now"; never block new
weighings on a backlog.
