// Generate branded placeholder screenshots for every `shot` in content-map.json,
// so the guide looks complete before real captures run. capture-web.mjs overwrites
// these with the live dashboard once staging is up.
//
//   node scripts/gen-placeholders.mjs
//
// Renders a small branded HTML card to PNG via Playwright (same browser dep the
// capture script uses). Idempotent — safe to re-run.
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { readFileSync, mkdirSync, existsSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../static/img/web');
mkdirSync(OUT, { recursive: true });

const map = JSON.parse(readFileSync(resolve(__dirname, 'content-map.json'), 'utf8'));
const shots = [...new Set(map.sections.flatMap((s) => s.pages.map((p) => p.shot).filter(Boolean)))];

const card = (name) => `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;padding:0}
  .wrap{width:1440px;height:900px;display:flex;flex-direction:column;align-items:center;
    justify-content:center;gap:28px;font-family:Inter,system-ui,sans-serif;
    background:linear-gradient(135deg,#ecfdf5,#d1fae5)}
  .mark{width:104px;height:104px;border-radius:24px;background:#047857;color:#fff;
    display:flex;align-items:center;justify-content:center;font-weight:800;font-size:44px;
    letter-spacing:1px;box-shadow:0 10px 30px rgba(4,120,87,.25)}
  .t{font-size:34px;font-weight:800;color:#065f46}
  .s{font-size:18px;color:#047857;font-family:ui-monospace,monospace;
    background:#fff;padding:8px 16px;border-radius:10px;border:1px solid #a7f3d0}
  .n{font-size:15px;color:#6b7280}
</style></head><body><div class="wrap">
  <div class="mark">SWAT</div>
  <div class="t">Tangkapan layar menyusul</div>
  <div class="s">${name}</div>
  <div class="n">Screenshot coming soon — run <b>npm run capture-web</b></div>
</div></body></html>`;

const browser = await chromium.launch({ args: ['--no-sandbox'] });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  for (const name of shots) {
    const file = resolve(OUT, `${name}.png`);
    if (existsSync(file) && process.env.FORCE !== '1') {
      console.log(`· ${name}.png exists (set FORCE=1 to overwrite)`);
      continue;
    }
    await page.setContent(card(name), { waitUntil: 'load' });
    await page.screenshot({ path: file });
    console.log(`✓ ${name}.png`);
  }
} finally {
  await browser.close();
}
console.log(`\n${shots.length} placeholder(s) processed.`);
