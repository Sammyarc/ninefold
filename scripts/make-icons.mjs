// Renders favicon.ico, the Apple touch and manifest icons from assets/icons/favicon.svg,
// and the 1200x630 share image from the running page (npm start first).
// Per-site settings live in package.json under "config.icons".
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

let require = createRequire(new URL('../package.json', import.meta.url));
for (const fallback of ['../../Day-06/package.json', '../../../Day-06/package.json']) {
  try { require.resolve('@playwright/test'); break; } catch { require = createRequire(new URL(fallback, import.meta.url)); }
}
const { chromium } = require('@playwright/test');
const out = (p) => fileURLToPath(new URL('../' + p, import.meta.url));
const pkg = JSON.parse(await readFile(out('package.json'), 'utf8'));
const cfg = { tile: '#000000', ogY: 0, ...(pkg.config.icons || {}) };
const svg = await readFile(out('assets/icons/favicon.svg'), 'utf8');
const browser = await chromium.launch({ channel: 'chrome' });

// the SVG is a rounded tile; raster icons sit on a full-bleed square of the tile colour
async function tile(size, pad = 0) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  const inner = Math.round(size * (1 - pad * 2));
  await page.setContent(`<style>html,body{margin:0;background:${cfg.tile}}div{width:${size}px;height:${size}px;display:grid;place-items:center}svg{width:${inner}px;height:${inner}px;display:block}</style><div>${svg}</div>`);
  const buf = await page.screenshot({ type: 'png' });
  await page.close();
  return buf;
}

await writeFile(out('assets/icons/apple-touch-icon.png'), await tile(180));
await writeFile(out('assets/icons/icon-192.png'), await tile(192));
await writeFile(out('assets/icons/icon-512.png'), await tile(512));
await writeFile(out('assets/icons/icon-maskable-512.png'), await tile(512, 0.14));

const sizes = [16, 32, 48];
const pngs = [];
for (const s of sizes) pngs.push(await tile(s));
const header = Buffer.alloc(6 + 16 * sizes.length);
header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
sizes.forEach((s, i) => {
  const e = 6 + i * 16;
  header.writeUInt8(s, e); header.writeUInt8(s, e + 1); header.writeUInt16LE(1, e + 4); header.writeUInt16LE(32, e + 6);
  header.writeUInt32LE(pngs[i].length, e + 8); header.writeUInt32LE(offset, e + 12);
  offset += pngs[i].length;
});
await writeFile(out('favicon.ico'), Buffer.concat([header, ...pngs]));

// share image: a 1440x756 (1.905:1) window of the page at a real 1440x900 framing
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1200 / 1440, reducedMotion: 'reduce' });
await page.goto(process.env.URL || `http://127.0.0.1:${pkg.config.port}/`, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(400);
await page.screenshot({ path: out('assets/og-image.jpg'), type: 'jpeg', quality: 86, clip: { x: 0, y: cfg.ogY, width: 1440, height: 756 } });
await browser.close();
console.log(`${pkg.name}: icons + og-image written`);
