/**
 * Generate the SWAT favicon / PWA icon set from the brand mark.
 *
 * Source: public/brand/swat-mark.svg (emerald rounded square + white leaf).
 * Run with: pnpm --filter @swat/web icons
 *
 * Outputs:
 *   src/app/icon.svg          — SVG favicon (modern browsers; Next file convention)
 *   src/app/apple-icon.png    — 180×180 apple-touch-icon (Next file convention)
 *   src/app/favicon.ico       — 16/32/48 multi-size .ico (legacy /favicon.ico)
 *   public/icons/icon-192.png — PWA manifest icon (any)
 *   public/icons/icon-512.png — PWA manifest icon (any)
 *   public/icons/maskable-512.png — PWA maskable icon (full-bleed emerald, safe zone)
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import pngToIco from 'png-to-ico';
import sharp from 'sharp';

const HERE = dirname(fileURLToPath(import.meta.url));
const WEB = resolve(HERE, '..');
const SRC_SVG = resolve(WEB, 'public/brand/swat-mark.svg');
const EMERALD = '#047857'; // matches the brand mark background fill

async function ensureDir(file) {
  await mkdir(dirname(file), { recursive: true });
}

async function pngFromSvg(svg, size) {
  return sharp(svg).resize(size, size, { fit: 'contain' }).png().toBuffer();
}

/** Maskable: mark scaled to ~78% on a full-bleed emerald canvas (safe zone). */
async function maskablePng(svg, size) {
  const inner = Math.round(size * 0.78);
  const mark = await pngFromSvg(svg, inner);
  return sharp({
    create: { width: size, height: size, channels: 4, background: EMERALD },
  })
    .composite([{ input: mark, gravity: 'center' }])
    .png()
    .toBuffer();
}

async function main() {
  const svg = await readFile(SRC_SVG);

  const targets = {
    'src/app/apple-icon.png': await pngFromSvg(svg, 180),
    'public/icons/icon-192.png': await pngFromSvg(svg, 192),
    'public/icons/icon-512.png': await pngFromSvg(svg, 512),
    'public/icons/maskable-512.png': await maskablePng(svg, 512),
  };

  for (const [rel, buf] of Object.entries(targets)) {
    const out = resolve(WEB, rel);
    await ensureDir(out);
    await writeFile(out, buf);
    console.log(`wrote ${rel} (${buf.length} bytes)`);
  }

  // SVG favicon — copy the brand mark verbatim (Next serves /icon.svg).
  const iconSvg = resolve(WEB, 'src/app/icon.svg');
  await writeFile(iconSvg, svg);
  console.log('wrote src/app/icon.svg');

  // Legacy multi-size .ico from PNG renders.
  const ico = await pngToIco([
    await pngFromSvg(svg, 16),
    await pngFromSvg(svg, 32),
    await pngFromSvg(svg, 48),
  ]);
  const icoOut = resolve(WEB, 'src/app/favicon.ico');
  await writeFile(icoOut, ico);
  console.log(`wrote src/app/favicon.ico (${ico.length} bytes)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
