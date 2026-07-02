 
/**
 * Dev-only GPS track simulator (Phase 7 / Phase B).
 *
 * Walks a synthetic moving track for one device and POSTs vendor-shaped pings to
 * the SWAT GPS.id webhook — no real GPS.id account needed. Drives the whole
 * ingest pipeline (matching → GpsPing → device online → deviation/activity), so
 * it's the way to exercise tracking locally.
 *
 *   pnpm --filter @swat/backend run dev:push-track -- --imei=350000000000000 --count=30
 *   pnpm --filter @swat/backend run dev:push-track -- --off-corridor   # trip an alert
 *
 * Flags: --imei=<imei> (default 350000000000000, a seeded demo device),
 *        --count=<n> pings (default 20), --interval=<ms> between pings (default 1000),
 *        --off-corridor (veer ~1.3 km off the line mid-route to raise off_corridor),
 *        --base=<url> (default http://localhost:$BE_PORT|4020).
 * Requires GPS_WEBHOOK_TOKEN in the environment (loaded from the local .env files).
 */
import { config as loadEnv } from 'dotenv';

// Fill from the same files the backend reads (first value found wins per key).
for (const path of ['.env.local', '.env', '../../.env.local', '../../.env']) {
  loadEnv({ path });
}

const argv = process.argv.slice(2);
const arg = (name: string): string | undefined =>
  argv.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
const flag = (name: string): boolean => argv.includes(`--${name}`);

const token = process.env.GPS_WEBHOOK_TOKEN;
const base = arg('base') ?? `http://localhost:${process.env.BE_PORT ?? '4020'}`;
const imei = arg('imei') ?? '350000000000000';
const count = Math.max(2, Number(arg('count') ?? '20'));
const intervalMs = Math.max(0, Number(arg('interval') ?? '1000'));
const offCorridor = flag('off-corridor');

if (!token) {
  console.error(
    'GPS_WEBHOOK_TOKEN is not set. Add it to revamp/.env.local (the backend webhook token).',
  );
  process.exit(1);
}

// A short Surabaya polyline: pool/TPS in the centre → Benowo TPA to the west.
const ANCHORS: ReadonlyArray<readonly [number, number]> = [
  [-7.2575, 112.7508],
  [-7.245, 112.71],
  [-7.235, 112.66],
  [-7.228, 112.62],
  [-7.2262, 112.5994],
];

/** Position at fraction t∈[0,1] along the polyline, with an optional mid-route veer. */
function pointAt(t: number): readonly [number, number] {
  const segs = ANCHORS.length - 1;
  const scaled = t * segs;
  const idx = Math.min(Math.floor(scaled), segs - 1);
  const f = scaled - idx;
  // idx is bounded to [0, segs-1] so both anchors exist.
  const [aLat, aLng] = ANCHORS[idx] as readonly [number, number];
  const [bLat, bLng] = ANCHORS[idx + 1] as readonly [number, number];
  let lat = aLat + (bLat - aLat) * f;
  const lng = aLng + (bLng - aLng) * f;
  // Veer ~0.012° (~1.3 km) north over the middle third → clears any sane corridor.
  if (offCorridor && t > 0.4 && t < 0.7) {
    lat += 0.012;
  }
  return [lat, lng];
}

/** GPS.id UTC timestamp `YYYY-MM-DD HH:MM:SS`. */
const stamp = (d: Date): string => d.toISOString().slice(0, 19).replace('T', ' ');
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

async function main(): Promise<void> {
  const url = `${base}/api/v1/integrations/gps/webhook/${token}`;
  // Backdate the series so every ping has a distinct, past second (the ingest key
  // is (recorded_at, imei) — same-second pings would be deduped away).
  const base0 = Date.now() - count * 1000;
  console.log(
    `Pushing ${count} pings for IMEI ${imei} → ${base}${offCorridor ? ' (off-corridor)' : ''}`,
  );
  let ok = 0;
  for (let i = 0; i < count; i++) {
    const [lat, lng] = pointAt(i / (count - 1));
    const body = {
      VehicleId: imei,
      Lat: Number(lat.toFixed(6)),
      Lon: Number(lng.toFixed(6)),
      Speed: 30 + (i % 5) * 3,
      Direction: 270,
      Engine: 'ON',
      Odometer: 1_000_000 + i * 250,
      DatetimeUTC: stamp(new Date(base0 + i * 1000)),
    };
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) ok++;
      console.log(`[${i + 1}/${count}] (${body.Lat}, ${body.Lon}) → ${res.status}`);
    } catch (err) {
      console.error(`[${i + 1}/${count}] request failed: ${String(err)}`);
    }
    if (i < count - 1 && intervalMs > 0) await sleep(intervalMs);
  }
  console.log(`Done — ${ok}/${count} accepted.`);
}

void main();
