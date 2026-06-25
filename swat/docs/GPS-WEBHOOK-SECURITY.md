# GPS.id Webhook Security (Phase 7)

The GPS.id push webhook is **unauthenticated by the vendor** — GPS.id POSTs JSON to
a URL we register by email, with no signature or credential. SWAT therefore treats
every field as untrusted and layers four controls, all enforced by
`GpsWebhookGuard` (`apps/backend/src/modules/integrations/gps/gps-webhook.guard.ts`).

## Endpoint

```
POST /api/v1/integrations/gps/webhook/:token
```

Accepts a single GPS.id record **or** an array. Responds fast with
`200 { accepted, rejected }` and offloads persistence to the `gps-ingest` BullMQ
worker. The token lives in the **path** (GPS.id cannot send custom headers).

## Controls

1. **Secret path token** — compared in **constant time** (`timingSafeEqual`). The
   server token is `GPS_WEBHOOK_TOKEN` (≥16 chars). It is **required in production**
   (the env schema fails boot without it) and **optional in dev/test, where an
   unset token disables the webhook** (every call → 401) rather than opening an
   unauthenticated ingress. The token is **never logged**.
2. **IP allowlist** — `GPS_WEBHOOK_ALLOWED_IPS` (comma-separated). Empty → allow any
   source (rely on the token). Set it to GPS.id's egress addresses to lock down
   ingestion. A blocked IP → 403.
3. **Per-IP rate limit** — `GPS_INGEST_RATE_LIMIT_PER_MIN` (default 600), a fixed
   60-second window via Redis `INCR`. Over the limit → 429 + `Retry-After`. The
   limiter **fails open** if Redis is unreachable (availability over strict
   enforcement) — the outage is logged.
4. **Audit** — every call (accept or reject) is written to `ApiAuditLog`
   (`principalType=SERVICE_ACCOUNT`, no UUID principal, source-IP + status). Summaries
   are coarse (`accepted=n rejected=m`) and never contain the payload or the token.

## Input handling

Each item is validated by `GpsidWebhookItemDto` (class-validator over the verbatim
GPS.id field names). Invalid items and **future-dated** timestamps (clock-skew
guard, >5 min ahead) are dropped and counted — a bad item never 422s the whole
batch. Timestamps are stored as `timestamptz` UTC; display is Asia/Jakarta.

> ⚠ **UTC vs WIB:** GPS.id names the field `DatetimeUTC` but its pull docs say
> timestamps are "per the GPS unit's timezone". Verify against `report/history`
> during integration (T-705); adjust the parse if the push stamps are WIB.

## Token rotation

Rotate `GPS_WEBHOOK_TOKEN` by (1) generating a new ≥16-char secret, (2) updating
the SSM/GitHub secret + the running env, (3) re-registering the new webhook URL with
GPS.id (`it.ss@gps.id`), (4) retiring the old token. See `GPSID-REGISTRATION.md`.
