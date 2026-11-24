// Responsive, accessibility, motion and interaction checks shared by every page built on
// site-core.js. Page-specific bits live in ./verify.config.mjs. Run `npm start`, then `npm run verify`.
import { createRequire } from 'node:module';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import config from './verify.config.mjs';

let require = createRequire(new URL('../package.json', import.meta.url));
for (const fallback of ['../../Day-06/package.json', '../../../Day-06/package.json']) {
  try { require.resolve('@playwright/test'); break; } catch { require = createRequire(new URL(fallback, import.meta.url)); }
}
const { chromium } = require('@playwright/test');

const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const URL_ = process.env.URL || `http://127.0.0.1:${pkg.config.port}/`;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
await mkdir('test-results', { recursive: true });
const report = { checks: [], hero: [], accessibility: [] };
const failures = [];
const fail = (m) => { failures.push(m); console.error('FAIL', m); };
const check = async (name, fn) => { try { await fn(); report.checks.push(name); } catch (e) { fail(`${name}: ${e.message.split('\n')[0]}`); } };
const scrollAll = (p) => p.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 600) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 25)); } scrollTo(0, 0); });

try {
  /* 1. Source rules */
  await check('static rules: no italic type, no Unicode icon glyphs', async () => {
    const html = await readFile('index.html', 'utf8'), css = await readFile('styles.css', 'utf8');
    assert.ok(!/font-style\s*:\s*italic|<em\b|<i>[a-z]/i.test(html + css), 'no italic typography');
    assert.ok(!/[↗↓↑→←✳×]/.test(html), 'no Unicode arrows or stars standing in for icons');
  });

  /* 2. Overflow sweep */
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('response', (r) => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
  await page.goto(URL_, { waitUntil: 'networkidle' });
  const overflow = [];
  for (let w = 320; w <= 1920; w += 20) {
    await page.setViewportSize({ width: w, height: w < 768 ? 844 : 1000 });
    await page.waitForTimeout(50);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    if (over > 0) overflow.push(`${w}:${over}px`);
  }
  if (overflow.length) fail('horizontal overflow at ' + overflow.join(', ')); else report.checks.push('no horizontal overflow, 320 to 1920 in 20px steps');

  /* 3. Hero fits one screen and nothing in it collides or leaves it */
  for (const [w, h] of [[1920, 1080], [1920, 945], [1536, 730], [1440, 900], [1366, 768], [1280, 720], [1024, 768], [768, 1024], [414, 896], [390, 844], [360, 740], [320, 640]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForTimeout(200);
    const m = await page.evaluate((sel) => {
      const hero = document.querySelector(sel.hero).getBoundingClientRect();
      const boxes = [...document.querySelectorAll(sel.heroItems)].filter((e) => e.getClientRects().length && getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden')
        .map((e) => { const r = e.getBoundingClientRect(); return { n: e.className.split(' ')[0] || e.tagName, top: r.top, bottom: r.bottom, left: r.left, right: r.right }; });
      return { vh: innerHeight, hero: { top: hero.top, bottom: hero.bottom, left: hero.left, right: hero.right }, boxes };
    }, config.selectors);
    const tag = `${w}x${h}`;
    report.hero.push({ tag, heroBottom: Math.round(m.hero.bottom), vh: m.vh });
    if (h >= 640 && m.hero.bottom > m.vh + 1) fail(`hero taller than the screen at ${tag} (${Math.round(m.hero.bottom)} > ${m.vh})`);
    const hit = (a, b) => a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1;
    m.boxes.forEach((b) => { if (b.top < m.hero.top - 1 || b.bottom > m.hero.bottom + 1 || b.left < m.hero.left - 1 || b.right > m.hero.right + 1) fail(`hero item ${b.n} leaves the hero at ${tag}`); });
    for (let i = 0; i < m.boxes.length; i++) for (let j = i + 1; j < m.boxes.length; j++) if (hit(m.boxes[i], m.boxes[j])) fail(`hero items ${m.boxes[i].n} and ${m.boxes[j].n} overlap at ${tag}`);
  }
  report.checks.push('hero fits one screen with no overlapping items at 12 window shapes');

  /* 4. Reduced motion renders everything */
  await page.setViewportSize({ width: 1440, height: 900 });
  await scrollAll(page);
  // config.stateHidden: content a UI state hides on purpose (a closed accordion panel), not a stalled animation
  const hidden = await page.evaluate((skip) => [...document.querySelectorAll('main *, footer *')].filter((el) => el.getClientRects().length && (parseFloat(getComputedStyle(el).opacity) < 0.99 || getComputedStyle(el).visibility === 'hidden') && !el.closest('[hidden],[aria-hidden="true"],dialog,.sr-only,:disabled' + (skip ? ',' + skip : ''))).map((el) => el.className || el.tagName).slice(0, 8), config.stateHidden || '');
  if (hidden.length) fail('hidden under reduced motion: ' + hidden.join(', ')); else report.checks.push('reduced motion: every element visible');
  if (errors.filter((e) => !/favicon/.test(e) || config.strictIcons).length) fail('page/resource errors: ' + errors.join(', '));
  await page.close();

  /* 5. Text size, targets, images, axe */
  for (const width of [320, 390, 768, 1024, 1440, 1920]) {
    const ctx = await browser.newContext({ viewport: { width, height: width < 768 ? 844 : 1000 }, reducedMotion: 'reduce' });
    const p = await ctx.newPage();
    await p.goto(URL_, { waitUntil: 'networkidle' });
    await scrollAll(p);
    await p.waitForTimeout(250);
    const d = await p.evaluate(() => {
      const vis = (el) => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden' && !el.closest('[aria-hidden="true"],.sr-only,.skip-link,[inert],dialog:not([open])');
      const smallText = [...document.querySelectorAll('body *')].filter((el) => vis(el) && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(el).fontSize) < 12).map((el) => el.textContent.trim().slice(0, 30));
      const smallTargets = [...document.querySelectorAll('a[href],button,summary,[role="tab"]')].filter(vis).filter((el) => { const r = el.getBoundingClientRect(); return r.width < 43.5 || r.height < 43.5; }).map((el) => `${(el.textContent.trim() || el.getAttribute('aria-label') || '').slice(0, 30)} ${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}`);
      const broken = [...document.images].filter((i) => i.complete && !i.naturalWidth).map((i) => i.src);
      return { smallText, smallTargets, broken };
    });
    if (d.smallText.length) fail(`text under 12px at ${width}: ${d.smallText.join(' | ')}`);
    if (d.smallTargets.length) fail(`targets under 44px at ${width}: ${d.smallTargets.join(' | ')}`);
    if (d.broken.length) fail(`broken images at ${width}: ${d.broken.join(', ')}`);
    if ([390, 1440].includes(width)) {
      await p.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
      const ax = await p.evaluate(() => axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }));
      report.accessibility.push({ width, violations: ax.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target.join(' ')).slice(0, 5) })) });
      if (ax.violations.length) fail(`axe at ${width}: ${ax.violations.map((v) => `${v.id} (${v.nodes.length})`).join(', ')}`);
      await p.screenshot({ path: `test-results/hero-${width}.png` });
    }
    await ctx.close();
  }
  report.checks.push('12px text, 44px targets, images, axe at 320/390/768/1024/1440/1920');

  /* 6. Motion on: intro, Lenis, every reveal completes */
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const mp = await browser.newPage({ viewport: { width: w, height: h }, reducedMotion: 'no-preference' });
    const merr = [];
    mp.on('pageerror', (e) => merr.push(e.message));
    await mp.goto(URL_, { waitUntil: 'networkidle' });
    await mp.waitForTimeout(3000);
    const intro = await mp.evaluate(() => ({ pending: document.documentElement.classList.contains('anim-pending'), lenis: document.documentElement.classList.contains('lenis'), hidden: [...document.querySelectorAll('[data-intro]')].filter((e) => getComputedStyle(e).display !== 'none' && parseFloat(getComputedStyle(e).opacity) < .99).length }));
    if (intro.pending || intro.hidden || !intro.lenis) fail(`intro/Lenis at ${w}: ${JSON.stringify(intro)}`);
    const H = await mp.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y <= H; y += 350) { await mp.mouse.wheel(0, 350); await mp.waitForTimeout(70); }
    await mp.waitForTimeout(2400);
    const stuck = await mp.evaluate(() => [...document.querySelectorAll('[data-rise], [data-rise-children] > *')].filter((el) => el.getClientRects().length && (getComputedStyle(el).visibility === 'hidden' || parseFloat(getComputedStyle(el).opacity) < 0.99)).map((el) => el.className || el.tagName).slice(0, 8));
    if (stuck.length) fail(`still hidden after scrolling with motion at ${w}: ${stuck.join(', ')}`);
    if (merr.length) fail(`page errors with motion at ${w}: ${merr.join(' | ')}`);
    await mp.close();
  }
  report.checks.push('motion: intro, Lenis and every reveal complete at 1440 and 390');

  /* 7. Dialog: opens, validates, previews, closes, clears */
  await check('demo dialog: validation, preview, Escape, clearing', async () => {
    const p = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    await p.goto(URL_, { waitUntil: 'networkidle' });
    await p.locator(config.bookSelector).first().click();
    await p.waitForFunction(() => document.getElementById('site-dialog').open, null, { timeout: 5000 });
    await p.locator('[data-dialog-form] button[type=submit]').click();
    assert.equal(await p.locator('[data-dialog-success]').isVisible(), false, 'empty form is refused');
    await p.locator('[data-dialog-form] input[name=name]').fill('Sam');
    await p.locator('[data-dialog-form] input[name=email]').fill('sam@example.com');
    const dateField = p.locator('[data-dialog-form] input[type=date]');
    if (await dateField.count()) { const d = new Date(); d.setDate(d.getDate() + 9); await dateField.fill(d.toISOString().slice(0, 10)); }
    await p.locator('[data-dialog-form] button[type=submit]').click();
    await p.locator('[data-dialog-success]').waitFor({ state: 'visible', timeout: 5000 });
    assert.match(await p.locator('[data-dialog-summary]').textContent(), /Sam/);
    await p.keyboard.press('Escape');
    await p.waitForFunction(() => !document.getElementById('site-dialog').open, null, { timeout: 5000 });
    // the dialog's close event (which clears the form) fires a task after open turns false
    await p.waitForFunction(() => document.querySelector('[data-dialog-form] input[name=name]').value === '', null, { timeout: 5000 });
    await p.close();
  });

  /* 8. Mobile menu at a non-zero scroll offset */
  await check('mobile menu: opens, locks, Escape restores, links land', async () => {
    const m = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    await m.goto(URL_, { waitUntil: 'networkidle' });
    await m.evaluate(() => scrollTo(0, 1600)); await m.waitForTimeout(150);
    const before = await m.evaluate(() => Math.round(scrollY));
    // click like a user: locator.click() would first "scroll the sticky toggle into view"
    const tapToggle = async () => { const b = await m.locator('[data-menu-toggle]').first().boundingBox(); await m.mouse.click(b.x + b.width / 2, b.y + b.height / 2); };
    await tapToggle();
    assert.equal(await m.locator('#site-menu').evaluate((x) => x.classList.contains('is-open')), true);
    await m.keyboard.press('Escape');
    assert.equal(await m.evaluate(() => Math.round(scrollY)), before, 'scroll position restored');
    await tapToggle();
    await m.locator(`#site-menu a[href="${config.menuTarget}"]`).click(); await m.waitForTimeout(300);
    assert.equal(await m.locator('#site-menu').evaluate((x) => x.classList.contains('is-open')), false);
    const top = await m.evaluate((id) => Math.round(document.querySelector(id).getBoundingClientRect().top), config.menuTarget);
    assert.ok(top >= -2 && top < 140, `menu link lands on the section (top ${top})`);
    await m.close();
  });

  /* 9. Page-specific interactions */
  if (config.interactions) {
    const p = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    await p.goto(URL_, { waitUntil: 'networkidle' });
    for (const [name, fn] of Object.entries(config.interactions)) await check(name, () => fn(p, assert));
    await p.close();
  }
} catch (e) {
  fail(e.message);
} finally {
  await writeFile('test-results/report.json', JSON.stringify({ ...report, failures }, null, 2));
  await browser.close();
}
console.log(JSON.stringify({ checks: report.checks, failures }, null, 2));
process.exitCode = failures.length ? 1 : 0;
