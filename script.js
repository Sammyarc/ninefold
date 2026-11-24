/* Ninefold page script: the interactions site-core.js does not cover.
   - grey heading lines that colour in, word by word, as they scroll into view
   - portfolio filters (re-lays the grid and announces the result)
   - a "View case" pill that follows the pointer over project cards on desktop
   - full case studies for the six projects (photos, screens, notes, credits), with previous and next
   - services accordion, one row open at a time
   - count-ups for the numbers and the process bars filling in view
   - the project brief form (front end only)
   - a header that tucks away while scrolling down on desktop
   - the footer wordmark rising into place
   Animated parts check prefers-reduced-motion; the page is complete without any of it. */
(function () {
  'use strict';
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return [].slice.call((c || document).querySelectorAll(s)); };
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- Footer year stays current ---------- */
  $$('[data-current-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
  var refresh = function () { if (window.ScrollTrigger) window.ScrollTrigger.refresh(); };

  /* ---------- Portfolio filters ---------- */
  var grid = $('[data-grid]');
  var filterBtns = $$('[data-filter]');
  var status = $('[data-filter-status]');
  var NAMES = { branding: 'branding', website: 'website', product: 'product', campaign: 'campaign' };
  if (grid && filterBtns.length) {
    var cards = $$('.proj', grid);
    filterBtns.forEach(function (b) {
      b.addEventListener('click', function () {
        var f = b.dataset.filter;
        filterBtns.forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        grid.classList.toggle('is-filtered', f !== 'all');
        var shown = 0;
        cards.forEach(function (card) {
          var match = f === 'all' || card.dataset.cats.split(' ').indexOf(f) > -1;
          // a card revealed by the filter must not stay waiting for its scroll reveal
          card.classList.remove('is-tweening');
          if (window.gsap) window.gsap.set(card, { clearProps: 'opacity,visibility,transform' });
          card.classList.toggle('is-out', !match);
          card.classList.remove('is-entering');
          if (match) {
            shown++;
            if (!reduced) { void card.offsetWidth; card.classList.add('is-entering'); }
          }
        });
        if (status) status.textContent = f === 'all' ? 'Showing all ' + shown + ' projects.' : 'Showing ' + shown + ' ' + NAMES[f] + (shown === 1 ? ' project.' : ' projects.');
        refresh();
      });
    });
    grid.addEventListener('animationend', function (e) { e.target.classList.remove('is-entering'); });
  }

  /* ---------- "View case" pill that follows the pointer ---------- */
  var pill = $('[data-case-cursor]');
  if (pill && grid && finePointer && !reduced) {
    document.documentElement.classList.add('has-case-cursor');
    var tx = 0, ty = 0, cx = 0, cy = 0, raf = 0, on = false;
    var step = function () {
      cx += (tx - cx) * 0.22; cy += (ty - cy) * 0.22;
      pill.style.setProperty('--cx', cx.toFixed(1) + 'px');
      pill.style.setProperty('--cy', cy.toFixed(1) + 'px');
      raf = Math.abs(tx - cx) + Math.abs(ty - cy) > 0.3 ? requestAnimationFrame(step) : 0;
    };
    grid.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      var over = e.target.closest('.proj__art, .proj__link');
      tx = e.clientX + 14; ty = e.clientY + 14;
      if (!on) { cx = tx; cy = ty; }
      if (!!over !== on) { on = !!over; pill.classList.toggle('is-on', on); }
      if (!raf) raf = requestAnimationFrame(step);
    });
    grid.addEventListener('pointerleave', function () { on = false; pill.classList.remove('is-on'); });
    window.addEventListener('scroll', function () { if (on) { on = false; pill.classList.remove('is-on'); } }, { passive: true });
  }

  /* ---------- Case studies ----------
     Each project card opens a full write-up in one shared dialog: a lead image, the facts,
     a few paragraphs, a gallery, what changed and a quote. Not every project has every part. */
  var G = function (f, w, h, alt, cap, wide) { return { f: f, w: w, h: h, alt: alt, cap: cap, wide: !!wide }; };
  var CASES = {
    saltbox: {
      name: 'Saltbox Grocers', kicker: 'Grocer · Bristol · 2026',
      hero: G('work-saltbox-shop.webp', 1600, 1049, 'The Saltbox shop homepage: the headline Good food, sold by the box, a veg box photo and four boxes to choose from.'),
      lede: 'Saltbox started as a market stall in 2019 and grew into a weekly box scheme, mostly by word of mouth. We named the boxes, drew the identity and packaging, and moved ordering online.',
      client: 'Saltbox Grocers', year: '2026', scope: 'Naming, identity, packaging, Shopify shop', credits: 'Theo Marsh, Priya Nair, Leah Brandt, Tom Ellery',
      notes: [
        'When Hannah came to us the boxes didn’t have names, orders arrived by email and text, and the only brand was a carrot someone had painted on the van.',
        'The four boxes are now named after where the food comes from: The Allotment, The Sunday, The Pantry and The Big Shop. A date stamp on every box tells you which week it was packed. The packaging is plain kraft printed in one colour, because a second colour would have cost more than the van.',
        'The shop is a Shopify theme we built around subscriptions. You choose a box and a day, and you can skip a week from your phone. Orders close on Thursday at noon.'
      ],
      gallery: [G('work-saltbox.webp', 1300, 867, 'A packed Saltbox veg box with herbs, potatoes, beetroot and grapes.', 'The Big Shop, week 47.'), G('work-saltbox-van.webp', 1300, 868, 'Boxes and crates of produce stacked in the back of a delivery van.', 'Friday packing for Saturday delivery.')],
      changed: ['Almost every order now comes through the shop. Before, about a third did.', 'Subscribers went from around 900 to just over 4,000 in the first year.'],
      quote: 'They gave us a brand our staff wear on their days off. Sales are up 62% and people finally know our name.', by: 'Hannah Cole, founder'
    },
    halo: {
      name: 'Halo Health', kicker: 'Health app · Lisbon · 2025',
      hero: G('work-halo-screens.webp', 1600, 978, 'Three Halo screens: onboarding, where you pick three things to track, the Today view and the week view.'),
      lede: 'Halo’s beta tracked 31 different things, and most testers opened it twice. We redesigned it around three numbers and a single suggestion each morning.',
      client: 'Halo Health', year: '2025', scope: 'Research, iOS and Android app design, component library', credits: 'Priya Nair, Marta Silva, Ines Duarte',
      notes: [
        'We sat in on 24 interviews with beta testers. The same complaint came up again and again: lots of charts, no idea what to do with them.',
        'Onboarding asks you to pick the three things you care about most. The Today screen shows those as rings, with one suggestion written in plain English. Everything else lives a tap away in the week view.',
        'We designed the iOS and Android apps and a component library of about 40 parts, then worked alongside Halo’s two engineers until launch, six weeks after the first workshop.'
      ],
      gallery: [G('work-halo.webp', 1100, 1065, 'The Today and Week screens side by side on cobalt.', 'Today and Week.')],
      changed: ['About 31% of people still use Halo a month after installing it. The beta was at 9%.', 'Rated 4.8 on the App Store from just over 9,000 reviews.'],
      quote: 'Six weeks from kick-off to the App Store. They pushed back when we were wrong, and they were right.', by: 'Maya Okoro, co-founder'
    },
    tempo: {
      name: 'Tempo Run Club', kicker: 'Run club · Bristol · 2025',
      hero: G('work-tempo.webp', 1300, 867, 'A group of runners on an empty road under a flyover, early in the morning.'),
      lede: 'Tempo is a free club run by two volunteers. They wanted more people at the harbour at 6 AM, in March, with no money for advertising.',
      client: 'Tempo Run Club', year: '2025', scope: 'Posters, route cards, a 30-second film', credits: 'Leah Brandt, Sami Okafor, Theo Marsh',
      notes: [
        'We used the start time as the identity. A big 06 went onto 40 fly-posters around the harbourside, and every club day got a route card with the map on the back.',
        'Sami shot the film on the first morning run, mostly in the dark, on a borrowed camera. We did this one for free.'
      ],
      gallery: [G('work-tempo-bridge.webp', 1300, 867, 'Four runners crossing a footbridge on a grey morning.', 'The Wednesday bridge loop.', true)],
      changed: ['Around 900 people signed up in the first month. Most mornings now get 60 to 80 runners.'],
      quote: 'People still stop us to ask about the posters. The 6 is basically our name now.', by: 'Dan Price, who runs the club'
    },
    ferry: {
      name: 'Northern Ferry Co.', kicker: 'Transport · Bristol and Cardiff · 2026',
      hero: G('work-ferry.webp', 1600, 842, 'The Northern Ferry homepage and the mobile ticket with a QR code.'),
      lede: 'A new booking website for an hourly passenger ferry between Bristol and Cardiff. Most passengers used to phone to book, because the old site hid the timetable behind a carousel.',
      client: 'Northern Ferry Co.', year: '2025 to 2026', scope: 'UX, website, booking flow, wallet tickets, Next.js build', credits: 'Ines Duarte, Priya Nair, Tom Ellery, Rui Castro',
      notes: [
        'At busy times people waited on hold for eight minutes or more just to buy a ticket.',
        'So the homepage is now the timetable. You see the next four sailings and how many seats are left, and you can book from there. Tickets go into Apple or Google Wallet as a QR code that the crew scan at the gangway.',
        'Ines’s team built it on Next.js with a headless CMS, so the operations team can post delays without calling us. It loads in about a second on a mid-range Android phone.'
      ],
      gallery: [G('work-ferry-ticket.webp', 1600, 978, 'The mobile ticket screen with a QR code and an Add to Apple Wallet button.', 'The ticket, ready for the gangway.', true), G('work-ferry-boarding.webp', 1300, 867, 'Passengers walking up the ramp onto a ferry.', 'Boarding, summer 2026.')],
      changed: ['Online bookings roughly tripled over the first summer.', 'Calls to the booking line fell by about half.'],
      quote: 'Bookings tripled in a season. The new site does what our call centre used to.', by: 'Kofi Mensah, head of digital'
    },
    pip: {
      name: 'Pip & Pine', kicker: 'Toy maker · Porto · 2024',
      hero: G('work-pip.webp', 1300, 975, 'A child building a tower from plain wooden blocks.'),
      lede: 'Pip & Pine make toys from beech offcuts in a workshop in Porto. The toys were lovely; the plain brown boxes disappeared on shop shelves.',
      client: 'Pip & Pine', year: '2024', scope: 'Identity, packaging, shop display', credits: 'Theo Marsh, Marta Silva',
      notes: [
        'We drew the logo as six blocks that stack in different ways, and the workshop cut a real set that sits on shop counters for children to rebuild.',
        'The boxes are printed in one soy ink on recycled board, with a window so you can see the toy inside.'
      ],
      gallery: [G('work-pip-range.webp', 1300, 975, 'Wooden toys, stacking blocks and a woven basket on a bed.', 'Part of the 2024 range.')],
      changed: ['About 60 independent shops in Portugal, Spain and the UK now stock the range.'],
      quote: '', by: ''
    },
    atlas: {
      name: 'Atlas & Ink', kicker: 'Print studio · Lisbon · In progress',
      hero: G('work-atlas.webp', 1300, 975, 'A printer in an apron sorting freshly printed cards beside a vintage press.'),
      lede: 'Atlas & Ink print small editions by letterpress and risograph, and sell them through Instagram messages and markets. Most editions sell out before many followers have seen them.',
      client: 'Atlas & Ink', year: '2026, launching March 2027', scope: 'Identity, online shop', credits: 'Marta Silva, Tom Ellery, Rui Castro',
      notes: [
        'We’re building a shop around edition drops: a date, a waitlist and a page for each print that shows its colour layers. The identity uses the registration marks from their own press sheets.',
        'This one is still in progress. We’ll write it up properly after launch.'
      ],
      gallery: [G('work-atlas-press.webp', 1300, 975, 'A Heidelberg platen press in a studio, with posters on the wall.', 'The Heidelberg in the back room.'), G('work-atlas-ink.webp', 1300, 867, 'A hand inking the roller of a printing press with orange ink.', 'Inking up for a two-colour run.')],
      changed: [], quote: '', by: ''
    }
  };
  var ORDER = ['saltbox', 'halo', 'tempo', 'ferry', 'pip', 'atlas'];
  var caseDlg = $('#case-dialog');
  if (caseDlg && typeof caseDlg.showModal === 'function') {
    var caseOpener = null, current = null;
    var put = function (sel, text) { $(sel, caseDlg).textContent = text; };
    var el = function (tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
    var pic = function (g, eager) {
      var im = document.createElement('img');
      im.src = 'assets/photos/' + g.f; im.width = g.w; im.height = g.h; im.alt = g.alt; im.decoding = 'async';
      if (!eager) im.loading = 'lazy';
      return im;
    };
    var renderCase = function (id) {
      var c = CASES[id], i = ORDER.indexOf(id);
      current = id;
      put('[data-case-pos]', String(i + 1).padStart(2, '0') + ' / ' + String(ORDER.length).padStart(2, '0'));
      put('[data-case-kicker]', c.kicker); put('[data-case-title]', c.name); put('[data-case-lede]', c.lede);
      put('[data-case-client]', c.client); put('[data-case-year]', c.year); put('[data-case-scope]', c.scope); put('[data-case-credits]', c.credits);
      var hero = $('[data-case-hero]', caseDlg); hero.textContent = ''; hero.appendChild(pic(c.hero, true));
      var notes = $('[data-case-notes]', caseDlg); notes.textContent = '';
      c.notes.forEach(function (t) { notes.appendChild(el('p', null, t)); });
      var gal = $('[data-case-gallery]', caseDlg); gal.textContent = '';
      c.gallery.forEach(function (g) {
        var f = el('figure', g.wide || c.gallery.length === 1 ? 'is-wide' : null);
        f.appendChild(pic(g)); f.appendChild(el('figcaption', null, g.cap)); gal.appendChild(f);
      });
      gal.hidden = !c.gallery.length;
      var ch = $('[data-case-changed]', caseDlg); ch.textContent = '';
      c.changed.forEach(function (t) { ch.appendChild(el('li', null, t)); });
      $('[data-case-changed-wrap]', caseDlg).hidden = !c.changed.length;
      $('[data-case-quote-wrap]', caseDlg).hidden = !c.quote;
      if (c.quote) { put('[data-case-quote]', '“' + c.quote + '”'); put('[data-case-by]', c.by + ', ' + c.name); }
      put('[data-case-prev]', CASES[ORDER[(i - 1 + ORDER.length) % ORDER.length]].name);
      put('[data-case-next]', CASES[ORDER[(i + 1) % ORDER.length]].name);
      caseDlg.scrollTop = 0;
    };
    var openCase = function (id, opener) {
      if (!CASES[id]) return;
      caseOpener = opener || null;
      renderCase(id);
      if (pill) pill.classList.remove('is-on');
      if (window.SiteCore) window.SiteCore.lockScroll(true);
      caseDlg.showModal();
      $('[data-case-close]', caseDlg).focus({ preventScroll: true });
    };
    document.addEventListener('click', function (e) {
      var b = e.target.closest('[data-case]');
      if (b) { e.preventDefault(); openCase(b.dataset.case, b); }
    });
    $('[data-case-close]', caseDlg).addEventListener('click', function () { caseDlg.close(); });
    $$('[data-case-step]', caseDlg).forEach(function (b) {
      b.addEventListener('click', function () {
        var i = ORDER.indexOf(current) + Number(b.dataset.caseStep);
        renderCase(ORDER[(i + ORDER.length) % ORDER.length]);
        $('[data-case-title]', caseDlg).focus({ preventScroll: true });
      });
    });
    caseDlg.addEventListener('click', function (e) {
      if (e.target !== caseDlg) return;
      var r = caseDlg.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) caseDlg.close();
    });
    caseDlg.addEventListener('close', function () {
      if (window.SiteCore) window.SiteCore.lockScroll(false);
      if (caseOpener) caseOpener.focus({ preventScroll: true });
    });
  }

  /* ---------- Services accordion ---------- */
  var rows = $$('.srow');
  rows.forEach(function (row) {
    var btn = $('.srow__btn', row);
    btn.addEventListener('click', function () {
      var open = !row.classList.contains('is-open');
      rows.forEach(function (r) {
        var o = r === row && open;
        r.classList.toggle('is-open', o);
        $('.srow__btn', r).setAttribute('aria-expanded', String(o));
      });
      setTimeout(refresh, 650);
    });
  });

  /* ---------- In view: count-ups and process bars ---------- */
  var counters = $$('[data-count]');
  var countUp = function (el) {
    var end = Number(el.dataset.count), t0 = 0, dur = 1400;
    var tick = function (now) {
      if (!t0) t0 = now;
      var p = Math.min(1, (now - t0) / dur);
      el.textContent = Math.round(end * (1 - Math.pow(2, -10 * p)));
      if (p < 1) requestAnimationFrame(tick); else el.textContent = end;
    };
    requestAnimationFrame(tick);
  };
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        if (e.target.hasAttribute('data-count')) { if (!reduced) countUp(e.target); }
        else e.target.classList.add('is-in');
        io.unobserve(e.target);
      });
    }, { threshold: 0.4 });
    counters.forEach(function (el) { io.observe(el); });
    $$('[data-steps]').forEach(function (el) { io.observe(el); });
  } else {
    $$('[data-steps]').forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------- Project brief (front end only) ---------- */
  var brief = $('[data-brief]');
  if (brief) {
    var msg = $('[data-brief-msg]', brief);
    var list = function (arr) { return arr.length < 2 ? arr.join('') : arr.slice(0, -1).join(', ') + ' and ' + arr[arr.length - 1]; };
    brief.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = brief.elements.name, email = brief.elements.email;
      var bad = null;
      [name, email].forEach(function (f) {
        var ok = f.value.trim() && f.checkValidity();
        f.setAttribute('aria-invalid', String(!ok));
        if (!ok && !bad) bad = f;
      });
      msg.classList.toggle('is-error', !!bad);
      if (bad) {
        msg.textContent = bad === name ? 'Please add your name.' : 'Please add a valid email address.';
        bad.focus();
        return;
      }
      var interests = $$('input[name="interest"]:checked', brief).map(function (i) { return i.value; });
      var budget = $('input[name="budget"]:checked', brief);
      msg.textContent = 'Thanks, ' + name.value.trim() + '. Your brief' + (interests.length ? ' for ' + list(interests) : '') + (budget ? ' (' + budget.value + ')' : '') + ' is ready. This is a demo, so nothing was sent.';
      brief.reset();
      [name, email].forEach(function (f) { f.removeAttribute('aria-invalid'); });
    });
    [brief.elements.name, brief.elements.email].forEach(function (f) {
      f.addEventListener('input', function () { if (f.getAttribute('aria-invalid') === 'true' && f.value.trim() && f.checkValidity()) f.setAttribute('aria-invalid', 'false'); });
    });
  }

  /* ---------- Header tucks away while scrolling down (desktop only) ---------- */
  var header = $('[data-header]');
  var wide = matchMedia('(min-width: 1024px)');
  if (header && !reduced) {
    var lastY = window.scrollY, ticking = false;
    var update = function () {
      ticking = false;
      var y = window.scrollY;
      var tuck = wide.matches && y > 600 && y > lastY + 2 && !document.documentElement.classList.contains('is-menu-open');
      if (y < lastY - 2 || y <= 600 || !wide.matches) header.classList.remove('is-tucked');
      else if (tuck) header.classList.add('is-tucked');
      lastY = y;
    };
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    header.addEventListener('focusin', function () { header.classList.remove('is-tucked'); });
  }

  /* ---------- Grey heading lines colour in as they scroll into view ----------
     The grey second line of each heading is only a starting state: word by word it
     fills to the heading's own colour, tied to the scroll. A line already on screen
     at load (the hero) fills just after the intro. Under reduced motion it starts filled. */
  var tones = $$('.h2 .tone, .hero__row.tone');
  if (tones.length) {
    if (reduced || !window.gsap || !window.ScrollTrigger) {
      tones.forEach(function (t) { t.classList.add('is-lit'); });
    } else {
      tones.forEach(function (t) {
        var from = getComputedStyle(t).color;
        var to = getComputedStyle(t.parentElement).color;
        var words = t.textContent.trim().split(/\s+/);
        t.textContent = '';
        words.forEach(function (w, i) {
          var s = document.createElement('span');
          s.className = 'tone__w';
          s.textContent = w;
          t.appendChild(s);
          if (i < words.length - 1) t.appendChild(document.createTextNode(' '));
        });
        var ws = t.querySelectorAll('.tone__w');
        if (t.closest('.hero')) {
          window.gsap.fromTo(ws, { color: from }, { color: to, duration: 0.9, ease: 'power2.out', stagger: 0.16, delay: 1.5 });
        } else {
          window.gsap.fromTo(ws, { color: from }, { color: to, ease: 'none', stagger: 0.5, scrollTrigger: { trigger: t, start: 'top 85%', end: 'top 45%', scrub: 0.6 } });
        }
      });
    }
  }

  /* ---------- Footer wordmark rises as the footer arrives ---------- */
  var word = $('[data-word]');
  if (word && !reduced && window.gsap && window.ScrollTrigger) {
    window.gsap.fromTo(word, { yPercent: 40 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.footer', start: 'top bottom', end: 'bottom bottom', scrub: true } });
  }
})();
