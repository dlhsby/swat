// Capture real SWAT web-dashboard screenshots for the docs site.
//
//   node scripts/capture-web.mjs [baseURL] [locale]
//
// Logs into the live site as the seed admin (sees every page) and writes PNGs to
// static/img/web/. Defaults to staging + the id-ID locale. Playwright is a
// devDependency of THIS docs workspace (React-18 island, isolated from the app).
//
// SWAT routes are locale-prefixed (localePrefix: 'always'), so every path is
// visited under /<locale>/… . Screenshot names match scripts/content-map.json.
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../static/img/web');
mkdirSync(OUT, { recursive: true });

const BASE = (process.argv[2] || 'https://swat.wahyutrip.com').replace(/\/$/, '');
const LOCALE = process.argv[3] || 'id-ID';
// Seed admin (dev/staging only): admin / Password123! — never a production account.
const USER = process.env.DOCS_SHOT_USER || 'admin';
const PASS = process.env.DOCS_SHOT_PASS || 'Password123!';

// Software WebGL so any Mapbox/GPS map surface renders in headless.
const LAUNCH = {
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'],
};
const VIEWPORT = { width: 1440, height: 900 };
const p = (path) => `${BASE}/${LOCALE}${path}`;

async function login(page) {
  await page.goto(p('/login'), { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[name="username"]', { timeout: 20000 });
  await page.fill('input[name="username"]', USER);
  await page.fill('input[name="password"]', PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.endsWith('/login'), { timeout: 25000 });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
}

async function shot(page, path, name, extraWaitMs = 2500) {
  await page.goto(p(path), { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(extraWaitMs);
  await page.screenshot({ path: resolve(OUT, `${name}.png`) });
  console.log(`✓ ${name}.png  (${path})`);
}

// [path, screenshot-name, extraWaitMs?] — names match content-map.json `shot`.
const PAGES = [
  ['/dashboard', 'dashboard'],
  ['/monitoring/volume', 'monitoring-volume', 4000],
  ['/monitoring/fuel', 'monitoring-fuel', 4000],
  ['/monitoring/hauling', 'monitoring-hauling', 5000],
  ['/monitoring/levy', 'monitoring-levy', 4000],
  ['/monitoring/efficiency', 'monitoring-efficiency', 4000],
  ['/vehicles', 'vehicles'],
  ['/drivers', 'drivers'],
  ['/sites-routes', 'sites-routes', 4000],
  ['/waste-sources', 'waste-sources'],
  ['/schedule-templates', 'schedule-templates'],
  ['/scheduling', 'scheduling'],
  ['/record', 'record'],
  ['/disposal-permits', 'disposal-permits'],
  ['/tracking/devices', 'tracking-devices', 4000],
  ['/users', 'users'],
  ['/roles', 'roles'],
  ['/service-accounts', 'service-accounts'],
];

const browser = await chromium.launch(LAUNCH);
const results = { ok: [], failed: [] };
try {
  const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  const page = await ctx.newPage();

  // Public login page (no auth).
  try {
    await page.goto(p('/login'), { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: resolve(OUT, 'login.png') });
    results.ok.push('login');
    console.log('✓ login.png  (/login)');
  } catch (e) {
    results.failed.push(['login', e.message]);
  }

  await login(page);
  for (const [path, name, wait] of PAGES) {
    try {
      await shot(page, path, name, wait);
      results.ok.push(name);
    } catch (e) {
      results.failed.push([name, e.message]);
    }
  }
  await ctx.close();
} finally {
  await browser.close();
}

console.log(`\nDONE — ${results.ok.length} captured, ${results.failed.length} failed`);
if (results.failed.length) {
  for (const [n, m] of results.failed) console.log(`  ✗ ${n}: ${String(m).split('\n')[0]}`);
  process.exitCode = 1;
}
