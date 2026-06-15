# Weighbridge Integration API (Phase 4)

Reference for the TPA "Jembatan Timbang" desktop app (vendor: PT. Surveyor
Indonesia) to integrate with the SWAT backend. Replaces the legacy NuSOAP
endpoints. Interactive Swagger lives at `/api/docs` (tag **weighbridge**).

Base URL: `{host}/api/v1`

## Authentication

Two principal types are accepted on every `/weighbridge/*` endpoint:

1. **Operator (OAuth2 bearer, primary).** A logged-in user obtains a bearer token
   from the native-client token endpoint and sends `Authorization: Bearer <jwt>`.
   The operator's identity is stamped on the weighing (`Trip.recordedById`). The
   user's role must hold the relevant `weighbridge:*` permission (role **Petugas
   Timbang** has them all).
2. **Service account (API key, unattended).** For machine paths (offline-queue
   sync, Excel bulk upload, TPA-side pushes). Send the key as
   `X-API-Key: <key>` **or** `Authorization: Bearer swatwb_…`. Keys are created in
   the admin UI (**Akun Layanan**) and shown once. A key may carry a per-account
   rate limit and an IP allowlist.

Missing/invalid credential → `401`. Authenticated but lacking the permission →
`403`. Source IP not in a service account's allowlist → `403`.

## Rate limiting

Per-principal fixed window (60s). Service accounts use their configured
`rateLimitPerMin` (default 500); operators use `WEIGHBRIDGE_RATE_LIMIT_PER_MIN`.
Responses carry `X-RateLimit-Limit` / `X-RateLimit-Remaining`. Over the limit →
`429` with `Retry-After: 60`.

## Response envelope

All responses use the standard envelope:
`{ "success": boolean, "data": T | null, "error": { code, message, details? } | null, "meta": … }`.

## Endpoints

### POST /weighbridge/resolve-kitir — `weighbridge:resolve`

Resolve a kitir to vehicle authorization + tare. Body: `{ code?, plateNumber?, date }`
(YYYY-MM-DD; at least one of `code`/`plateNumber`). → `200` with vehicle specs;
`400` if neither identifier; `404` if not found / inactive / expired / vehicle not
operational.

### POST /weighbridge/post-weighing — `weighbridge:post`

Record a weighing. Body: `{ kitirId?, plateNumber, date, timestamp?, grossWeight,
tareWeight, wasteVolume?, cctvReference?, notes?, verified? }`. The server computes
`netWeight = grossWeight − tareWeight` (client net is never trusted). Optional
`Idempotency-Key: <uuid>` header — a retry with the same key replays the original
`201` for 24h (no duplicate Trip/log). → `201`; `409` plate≠kitir; `422` gross<tare;
`404` kitir/TransactionDay missing.

### PATCH /weighbridge/weighings/:tripId — `weighbridge:update`

Update/verify an existing weighing (parity `updatePembuanganTerverifikasi`). Body:
any of `{ grossWeight, tareWeight, wasteVolume, cctvReference, notes, verified }`.
→ `200`; `404` unknown trip; `422` gross<tare.

### GET /weighbridge/weighings — `weighbridge:read`

List recorded weighings (parity `getpembuangansampahbyfilter`). Query:
`?date=&plateNumber=&siteId=&page=&limit=`. → `200` paginated.

### POST /weighbridge/import-excel — `weighbridge:post`

Bulk-import historical weighings (parity G14, legacy `importexcel`). `multipart/form-data`
with field **file** (.xlsx). Columns (header aliases tolerated): tanggal, nopol,
berat kotor, berat kosong, depot. Legacy SI names are translated via `konversi_si_swat`
/ `legacy_name_map`. Idempotent by natural key (date+plate+gross+net). →
`{ totalRows, inserted, skipped, errors[] }`.

## Legacy SOAP → REST parity (G13)

| Legacy SOAP method                                    | REST equivalent                                        |
| ----------------------------------------------------- | ------------------------------------------------------ |
| `getKitir` / `getBkosong` / `getNomorPolisiKendaraan` | `POST /weighbridge/resolve-kitir`                      |
| `insertDB`                                            | `POST /weighbridge/post-weighing`                      |
| `insertPenimbanganTerverifikasi`                      | `POST /weighbridge/post-weighing` with `verified:true` |
| `updatePembuanganTerverifikasi`                       | `PATCH /weighbridge/weighings/:tripId`                 |
| `insertJatahKitir`                                    | `POST /disposal-permits` (service-account auth)        |
| `getpembuangansampahbyfilter`                         | `GET /weighbridge/weighings`                           |
| Excel "Upload Data Penimbangan" (`importexcel`)       | `POST /weighbridge/import-excel`                       |

See `WEIGHBRIDGE-OFFLINE-QUEUE.md` for offline sync and `RECONCILIATION-DESIGN.md`
for the nightly tonnage reconciliation.
