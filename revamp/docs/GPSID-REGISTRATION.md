# GPS.id Integration & Webhook Registration (Phase 7)

GPS.id integration has two paths: a **push webhook** (primary, real-time) and a
**pull API** (secondary, nightly batch). Registration of the push webhook is
**manual, by email** to the vendor.

## 1. Push webhook (primary)

GPS.id POSTs JSON to a URL we register. Steps:

1. **Pick a token.** Generate a ≥16-char secret. Set `GPS_WEBHOOK_TOKEN` in the
   target env (SSM/GitHub secret → runtime). Optionally set
   `GPS_WEBHOOK_ALLOWED_IPS` to GPS.id's egress IPs.
2. **Compose the URL:**
   `https://<api-host>/api/v1/integrations/gps/webhook/<GPS_WEBHOOK_TOKEN>`
3. **Email `it.ss@gps.id`** requesting the push be enabled to that URL, every 30s
   per unit. Provide the fleet's IMEIs.
4. **Confirm cadence + timezone.** Verify whether `DatetimeUTC` is truly UTC or WIB
   against the pull `report/history` (see `GPS-WEBHOOK-SECURITY.md`).
5. **Map devices.** Each IMEI must map to a vehicle in the Tracking admin
   (`/tracking/devices` or the Vehicle detail). Unknown IMEIs land in the
   unmatched-ping queue — map them in one click.

### Token rotation

Generate a new token → update the secret + env → email GPS.id the new URL → retire
the old token. The constant-time check means an old token simply stops working.

## 2. Pull API (secondary — nightly batch)

Used for gap-fill + the fuel/mileage cross-check (`gpsid_fuel_liters`). Credentials
(env-only, never hardcoded; the client refuses to run if unset):

```
GPSID_BASE_URL=...   GPSID_USERNAME=...   GPSID_PASSWORD=...
```

`GpsidClientService` logs in (`POST {GPSID_BASE_URL}/login`), caches the 24h bearer,
re-logs in on expiry/401, and self-throttles to ~5 requests / 5 min (≤5 IMEIs per
`report/mileage` call). The nightly `GpsEfficiencyJob` no-ops cleanly when the pull
is unconfigured.

## Local testing without the vendor

The webhook accepts a local payload simulator — POST a GPS.id-shaped body to the
endpoint with the dev token:

```bash
curl -XPOST "http://localhost:4020/api/v1/integrations/gps/webhook/$GPS_WEBHOOK_TOKEN" \
  -H 'content-type: application/json' \
  -d '[{"VehicleId":"350000000000000","DatetimeUTC":"2026-06-25 10:00:00","Lat":-7.2575,"Lon":112.7521,"Speed":18,"Direction":90,"Engine":"ON","Odometer":123456,"Car_Status":"START"}]'
```
