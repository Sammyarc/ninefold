export default {
  selectors: {
    hero: '.hero',
    heroItems: '.hero__title, .hero__foot'
  },
  // closed accordion panels are hidden on purpose
  stateHidden: '.srow:not(.is-open) .srow__panel',
  bookSelector: '.contact [data-dialog="call"]',
  menuTarget: '#pricing',
  interactions: {
    'portfolio filters re-lay the grid and announce the result': async (p, assert) => {
      const visible = () => p.locator('.proj:not(.is-out)').count();
      await p.locator('[data-filter="branding"]').scrollIntoViewIfNeeded();
      await p.locator('[data-filter="branding"]').click();
      assert.equal(await p.locator('[data-filter="branding"]').getAttribute('aria-pressed'), 'true');
      assert.equal(await visible(), 3, 'three branding projects');
      assert.ok(await p.locator('[data-grid]').evaluate((g) => g.classList.contains('is-filtered')));
      assert.match(await p.locator('[data-filter-status]').textContent(), /3 branding projects/);
      await p.locator('[data-filter="product"]').click();
      assert.equal(await visible(), 1);
      const op = await p.locator('.proj:not(.is-out)').evaluate((c) => getComputedStyle(c).opacity);
      assert.equal(op, '1', 'a filtered-in card is visible');
      await p.locator('[data-filter="all"]').click();
      assert.equal(await visible(), 6);
    },
    'project cards open a full case study with previous and next': async (p, assert) => {
      const opener = p.locator('[data-case="ferry"]');
      await opener.scrollIntoViewIfNeeded();
      await opener.click();
      await p.waitForFunction(() => document.getElementById('case-dialog').open, null, { timeout: 5000 });
      assert.equal(await p.locator('[data-case-title]').textContent(), 'Northern Ferry Co.');
      assert.match(await p.locator('[data-case-hero] img').getAttribute('src'), /work-ferry.webp/, 'lead image');
      assert.ok(await p.locator('[data-case-notes] p').count() >= 2, 'written notes');
      assert.equal(await p.locator('[data-case-gallery] figure').count(), 2, 'gallery');
      assert.equal(await p.locator('[data-case-changed] li').count(), 2, 'what changed');
      assert.ok(await p.locator('[data-case-quote-wrap]').isVisible(), 'quote shown');
      assert.equal(await p.locator('[data-case-pos]').textContent(), '04 / 06');
      await p.locator('[data-case-step="1"]').click();
      assert.equal(await p.locator('[data-case-title]').textContent(), 'Pip & Pine');
      assert.ok(!(await p.locator('[data-case-quote-wrap]').isVisible()), 'no quote for Pip & Pine');
      await p.locator('[data-case-step="-1"]').click();
      await p.locator('[data-case-step="-1"]').click();
      assert.equal(await p.locator('[data-case-title]').textContent(), 'Tempo Run Club');
      await p.keyboard.press('Escape');
      await p.waitForFunction(() => !document.getElementById('case-dialog').open, null, { timeout: 5000 });
      assert.ok(await opener.evaluate((b) => b === document.activeElement), 'focus returns to the card');
    },
    'services accordion: one row open at a time': async (p, assert) => {
      const b1 = p.locator('#svc-1-btn'), b2 = p.locator('#svc-2-btn');
      await b1.scrollIntoViewIfNeeded();
      assert.equal(await b2.getAttribute('aria-expanded'), 'true', 'websites starts open');
      await b1.click();
      assert.equal(await b1.getAttribute('aria-expanded'), 'true');
      assert.equal(await b2.getAttribute('aria-expanded'), 'false');
      await p.waitForTimeout(300);
      assert.ok(await p.locator('#svc-1').evaluate((x) => x.getBoundingClientRect().height > 40), 'panel 1 opened');
      assert.ok(await p.locator('#svc-2').evaluate((x) => x.getBoundingClientRect().height < 2), 'panel 2 closed');
      await b1.click();
      assert.equal(await b1.getAttribute('aria-expanded'), 'false', 'the open row closes again');
    },
    'quote slider moves and wraps': async (p, assert) => {
      const track = p.locator('[data-slider-track]');
      await p.locator('[data-slider-next]').scrollIntoViewIfNeeded();
      await p.locator('[data-slider-next]').click(); await p.waitForTimeout(300);
      assert.ok(await track.evaluate((t) => t.scrollLeft > 100), 'moved to the second quote');
      await p.locator('[data-slider-next]').click(); await p.waitForTimeout(300);
      await p.locator('[data-slider-next]').click(); await p.waitForTimeout(300);
      assert.ok(await track.evaluate((t) => t.scrollLeft < 5), 'wrapped to the first quote');
    },
    'brief form validates and summarises the picks': async (p, assert) => {
      const form = p.locator('[data-brief]');
      await form.scrollIntoViewIfNeeded();
      await form.locator('button[type=submit]').click();
      assert.equal(await form.locator('input[name=name]').getAttribute('aria-invalid'), 'true', 'empty name is refused');
      await form.locator('.pick', { hasText: 'Growth' }).click();
      await form.locator('.pick', { hasText: '£60k+' }).click();
      await form.locator('input[name=name]').fill('Sam');
      await form.locator('input[name=email]').fill('sam@example.com');
      await form.locator('button[type=submit]').click();
      const msg = await p.locator('[data-brief-msg]').textContent();
      assert.match(msg, /Sam/);
      assert.match(msg, /Branding, a website and growth/);
      assert.match(msg, /£60k or more/);
    },
    'footer wordmark fills the width and is cut off at the bottom': async (p, assert) => {
      await p.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
      await p.waitForTimeout(400);
      const m = await p.evaluate(() => {
        const w = document.querySelector('[data-word]').getBoundingClientRect(), f = document.querySelector('.footer').getBoundingClientRect();
        return { ww: w.width, fw: f.width, wb: w.bottom, fb: f.bottom, h: w.height };
      });
      assert.ok(m.ww > m.fw * 0.94, `wordmark spans the footer (${Math.round(m.ww)} of ${Math.round(m.fw)})`);
      assert.ok(m.wb > m.fb + m.h * 0.15, 'its lower part runs past the bottom edge');
    }
  }
};
