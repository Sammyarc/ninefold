/* site-core.js — shared behaviour for the Teeline, Fernhollow and Day-10 pages.
   Driven by data attributes so each page only declares what it needs:

   [data-header]                 header that gets .is-scrolled after 8px
   #site-menu + [data-menu-toggle] full-screen menu (scroll lock, focus trap, Escape)
   [data-intro="n"]              hero intro, played in order of n (needs html.anim-pending CSS)
   [data-intro-zoom]             hero image that settles from 1.08
   [data-rise]                   rises into view once
   [data-rise-children]          each direct child rises, staggered
   [data-zoom]                   image inside eases in from a slight zoom
   [data-parallax="8"]           drifts by n yPercent while it crosses the viewport
   [data-parallax-hero]          drifts only as the hero scrolls away
   [data-slider] ...             scroll-snap slider with prev/next/dots/count
   [data-tabs] ...               accessible tabs with optional prev/next and autoplay
   [data-dialog="key"]           opens the demo dialog with window.SITE.dialogs[key]
   [data-newsletter]             front-end-only email sign-up

   Motion is GSAP + ScrollTrigger (transform and opacity only) with Lenis smooth scroll
   loaded when the browser is idle. Under reduced motion none of it runs and every
   element is simply visible. */
(function () {
  'use strict';

  var $ = function (s, scope) { return (scope || document).querySelector(s); };
  var $$ = function (s, scope) { return [].slice.call((scope || document).querySelectorAll(s)); };
  var root = document.documentElement;
  root.classList.add('js');
  var reducedQuery = matchMedia('(prefers-reduced-motion: reduce)');
  var reduced = reducedQuery.matches;
  var gsap = window.gsap;
  var ST = window.ScrollTrigger;
  var motion = !reduced && gsap && ST;
  var lenis = null;
  var site = function () { return window.SITE || {}; };
  var header = $('[data-header]');

  /* ---------- Header state ---------- */
  function onScroll() { if (header) header.classList.toggle('is-scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- [data-fit]: scale the inner inline-block so the text fills the width ---------- */
  var fits = $$('[data-fit]');
  function fitAll() {
    fits.forEach(function (el) {
      var inner = el.firstElementChild;
      if (!inner) return;
      inner.style.fontSize = '100px';
      var w = inner.getBoundingClientRect().width;
      if (w) inner.style.fontSize = (100 * el.clientWidth / w * 0.995).toFixed(2) + 'px';
    });
  }
  if (fits.length) {
    fitAll();
    var fitTimer;
    window.addEventListener('resize', function () { clearTimeout(fitTimer); fitTimer = setTimeout(fitAll, 120); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitAll);
  }

  /* ---------- [data-scroll-region]: keyboard-scrollable only while it actually scrolls ---------- */
  var regions = $$('[data-scroll-region]');
  function syncRegions() {
    regions.forEach(function (el) {
      var scrolls = el.scrollWidth > el.clientWidth + 2;
      // tabindex only: the element keeps its own role (a list stays a list)
      if (scrolls) el.tabIndex = 0; else el.removeAttribute('tabindex');
    });
  }
  if (regions.length) {
    syncRegions();
    window.addEventListener('resize', function () { requestAnimationFrame(syncRegions); });
  }

  /* ---------- Scroll lock shared by the menu and dialogs (one mechanism at a time) ---------- */
  var locks = 0, lockMode = null, savedY = 0;
  function lockScroll(on) {
    locks = Math.max(0, locks + (on ? 1 : -1));
    if (on && locks === 1) {
      if (lenis) { lenis.stop(); lockMode = 'lenis'; }
      else {
        lockMode = 'pin'; savedY = window.scrollY;
        document.body.style.position = 'fixed'; document.body.style.top = -savedY + 'px';
        document.body.style.left = '0'; document.body.style.right = '0';
      }
    } else if (!on && locks === 0) {
      if (lockMode === 'lenis' && lenis) lenis.start();
      else if (lockMode === 'pin') {
        document.body.style.position = ''; document.body.style.top = '';
        document.body.style.left = ''; document.body.style.right = '';
        window.scrollTo(0, savedY);
        if (lenis) lenis.start(); // Lenis may have loaded while the page was pinned
      }
      lockMode = null;
    }
  }

  /* ---------- Menu ---------- */
  var menu = $('#site-menu');
  var toggles = $$('[data-menu-toggle]');
  var menuOpen = false, lastToggle = null;
  function setMenu(state, keepFocus) {
    if (!menu || state === menuOpen) return;
    menuOpen = state;
    menu.classList.toggle('is-open', state);
    root.classList.toggle('is-menu-open', state);
    toggles.forEach(function (t) {
      t.setAttribute('aria-expanded', String(state));
      t.setAttribute('aria-label', state ? 'Close menu' : 'Open menu');
    });
    if (state) menu.removeAttribute('inert'); else menu.setAttribute('inert', '');
    lockScroll(state);
    if (state) menu.focus({ preventScroll: true });
    else if (!keepFocus && lastToggle) lastToggle.focus({ preventScroll: true });
  }
  toggles.forEach(function (t) { t.addEventListener('click', function () { lastToggle = t; setMenu(!menuOpen); }); });
  document.addEventListener('keydown', function (e) {
    if (!menuOpen) return;
    if (e.key === 'Escape') { setMenu(false); return; }
    if (e.key !== 'Tab') return;
    var list = toggles.filter(function (t) { return t.offsetParent !== null; })
      .concat($$('a[href], button:not([disabled]), input', menu));
    var first = list[0], last = list[list.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  if (menu && menu.dataset.bp) {
    matchMedia('(min-width: ' + (Number(menu.dataset.bp) + 1) + 'px)').addEventListener('change', function (e) { if (e.matches) setMenu(false, true); });
  }

  /* ---------- In-page links ---------- */
  function scrollToEl(target, id) {
    var offset = (header ? header.offsetHeight : 0) + 12;
    var y = id === 'top' ? 0 : Math.max(0, target.getBoundingClientRect().top + window.scrollY - offset);
    if (lenis) lenis.scrollTo(y);
    else window.scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href').slice(1);
    var target = id ? document.getElementById(id) : null;
    if (!target) return;
    e.preventDefault();
    if (menuOpen) { setMenu(false, true); requestAnimationFrame(function () { scrollToEl(target, id); }); }
    else scrollToEl(target, id);
  });

  /* ---------- Sliders (native scroll-snap underneath) ---------- */
  $$('[data-slider]').forEach(function (slider) {
    var track = $('[data-slider-track]', slider);
    if (!track) return;
    var items = [].slice.call(track.children);
    var prev = $('[data-slider-prev]', slider), next = $('[data-slider-next]', slider);
    var count = $('[data-slider-count]', slider), dotsWrap = $('[data-slider-dots]', slider);
    var loop = slider.hasAttribute('data-slider-loop');
    var index = 0;
    var dots = [];
    if (dotsWrap) {
      dots = items.map(function (_, i) {
        var b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('aria-label', 'Show ' + (i + 1) + ' of ' + items.length);
        b.addEventListener('click', function () { go(i); });
        dotsWrap.appendChild(b);
        return b;
      });
    }
    function offsetOf(i) { return items[i].offsetLeft - items[0].offsetLeft; }
    function current() {
      var x = track.scrollLeft, best = 0, d = Infinity;
      items.forEach(function (_, i) { var dd = Math.abs(offsetOf(i) - x); if (dd < d) { d = dd; best = i; } });
      return best;
    }
    function atEnd() { return track.scrollLeft + track.clientWidth >= track.scrollWidth - 4; }
    function update() {
      index = atEnd() ? Math.max(index, current()) : current();
      if (count) count.textContent = String(index + 1).padStart(2, '0') + ' / ' + String(items.length).padStart(2, '0');
      if (!loop) {
        if (prev) prev.disabled = track.scrollLeft <= 4;
        if (next) next.disabled = atEnd();
      }
      dots.forEach(function (d, i) { d.toggleAttribute('aria-current', i === index); });
    }
    function go(i) {
      if (loop) i = (i + items.length) % items.length;
      i = Math.max(0, Math.min(items.length - 1, i));
      index = i;
      track.scrollTo({ left: offsetOf(i), behavior: reduced ? 'auto' : 'smooth' });
    }
    if (prev) prev.addEventListener('click', function () { go(atEnd() && !loop ? current() - 1 : index - 1); });
    if (next) next.addEventListener('click', function () { go(loop && atEnd() ? 0 : index + 1); });
    track.addEventListener('scroll', function () { window.requestAnimationFrame(update); }, { passive: true });
    track.addEventListener('keydown', function (e) {
      if (e.target !== track) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); go(index + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(index - 1); }
    });
    if ('ResizeObserver' in window) new ResizeObserver(update).observe(track);
    update();
  });

  /* ---------- Tabs ---------- */
  $$('[data-tabs]').forEach(function (group) {
    var tabs = $$('[role="tab"]', group).filter(function (t) { return t.closest('[data-tabs]') === group; });
    var panels = tabs.map(function (t) { return document.getElementById(t.getAttribute('aria-controls')); });
    var index = Math.max(0, tabs.findIndex(function (t) { return t.getAttribute('aria-selected') === 'true'; }));
    var timer = null, paused = { hover: false, focus: false, off: false };
    function select(i, focus, user) {
      i = (i + tabs.length) % tabs.length;
      tabs.forEach(function (t, k) {
        var on = k === i;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        if (panels[k]) { panels[k].hidden = !on; panels[k].classList.toggle('is-entering', on && !reduced && k !== index); }
      });
      index = i;
      if (focus) tabs[i].focus();
      group.dispatchEvent(new CustomEvent('tabchange', { detail: { index: i, user: !!user } }));
      if (user) restart();
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(i, false, true); });
      t.addEventListener('keydown', function (e) {
        var k = e.key;
        if (k === 'ArrowRight' || k === 'ArrowDown') { e.preventDefault(); select(index + 1, true, true); }
        else if (k === 'ArrowLeft' || k === 'ArrowUp') { e.preventDefault(); select(index - 1, true, true); }
        else if (k === 'Home') { e.preventDefault(); select(0, true, true); }
        else if (k === 'End') { e.preventDefault(); select(tabs.length - 1, true, true); }
      });
    });
    $$('[data-tabs-prev]', group).forEach(function (b) { b.addEventListener('click', function () { select(index - 1, false, true); }); });
    $$('[data-tabs-next]', group).forEach(function (b) { b.addEventListener('click', function () { select(index + 1, false, true); }); });
    var every = Number(group.dataset.tabsAutoplay) || 0;
    function tick() { if (!reduced && !paused.hover && !paused.focus && !paused.off && !document.hidden) select(index + 1); }
    function restart() { if (!every) return; clearInterval(timer); timer = setInterval(tick, every); }
    if (every) {
      group.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') paused.hover = true; });
      group.addEventListener('pointerleave', function () { paused.hover = false; });
      group.addEventListener('focusin', function () { paused.focus = true; });
      group.addEventListener('focusout', function () { paused.focus = false; });
      if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { paused.off = !en[0].isIntersecting; }, { threshold: .2 }).observe(group);
      restart();
    }
    select(index);
  });

  /* ---------- Demo dialog (nothing is ever sent) ---------- */
  var dialog = $('#site-dialog');
  var dialogOpener = null;
  function openDialog(key, opener) {
    var data = (site().dialogs || {})[key];
    if (!dialog || !data || typeof dialog.showModal !== 'function') return;
    dialogOpener = opener || null;
    setMenu(false, true);
    $('[data-dialog-eyebrow]', dialog).textContent = data.eyebrow || '';
    $('[data-dialog-title]', dialog).textContent = data.title;
    $('[data-dialog-body]', dialog).textContent = data.body || '';
    var form = $('[data-dialog-form]', dialog);
    var success = $('[data-dialog-success]', dialog);
    if (form) { form.reset(); form.hidden = !data.form; form.dataset.subject = data.subject || data.title; }
    if (success) success.hidden = true;
    var minDate = $('input[type="date"]', dialog);
    if (minDate) { var t = new Date(); t.setMinutes(t.getMinutes() - t.getTimezoneOffset()); minDate.min = t.toISOString().slice(0, 10); }
    lockScroll(true);
    dialog.showModal();
  }
  if (dialog) {
    $$('[data-dialog-close]', dialog).forEach(function (b) { b.addEventListener('click', function () { dialog.close(); }); });
    dialog.addEventListener('click', function (e) {
      var r = dialog.getBoundingClientRect();
      if (e.target === dialog && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)) dialog.close();
    });
    dialog.addEventListener('close', function () {
      lockScroll(false);
      var form = $('[data-dialog-form]', dialog);
      if (form) form.reset();
      if (dialogOpener) dialogOpener.focus({ preventScroll: true });
    });
    var form = $('[data-dialog-form]', dialog);
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var name = form.elements.name;
        if (name) name.setCustomValidity(name.value.trim() ? '' : 'Please enter your name.');
        if (!form.reportValidity()) return;
        var data = new FormData(form);
        var when = data.get('date') ? new Date(data.get('date') + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : '';
        var summary = (site().summary || function (d) {
          return d.name + ', your request for ' + d.subject.toLowerCase() + (d.when ? ' on ' + d.when : '') + ' is ready. This is a demo, so nothing was sent.';
        })({ name: String(data.get('name') || '').trim(), subject: form.dataset.subject, when: when, data: data });
        form.hidden = true;
        var success = $('[data-dialog-success]', dialog);
        $('[data-dialog-summary]', success).textContent = summary;
        success.hidden = false;
        var done = $('[data-dialog-close]', success);
        if (done) done.focus();
      });
      if (form.elements.name) form.elements.name.addEventListener('input', function () { form.elements.name.setCustomValidity(''); });
    }
  }
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-dialog]');
    if (!t) return;
    e.preventDefault();
    openDialog(t.dataset.dialog, t);
  });

  /* ---------- Newsletter ---------- */
  $$('[data-newsletter]').forEach(function (form) {
    var input = $('input[type="email"]', form);
    var msg = $('[data-newsletter-msg]', form);
    form.setAttribute('novalidate', '');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = input.value.trim() && input.checkValidity();
      input.setAttribute('aria-invalid', String(!ok));
      msg.classList.toggle('is-error', !ok);
      msg.textContent = ok ? (form.dataset.thanks || 'Thanks. On a live site you would now be subscribed. Nothing was sent.') : 'Please enter a valid email address.';
      if (ok) form.reset(); else input.focus();
    });
  });

  /* ---------- Motion ---------- */
  var ctx = null;
  if (motion) {
    gsap.registerPlugin(ST);
    gsap.defaults({ ease: 'expo.out', duration: 1.1 });
    var clear = function (els) { els.forEach(function (el) { el.classList.remove('is-tweening'); }); gsap.set(els, { clearProps: 'transform,opacity,visibility' }); };

    ctx = gsap.context(function () {
      /* hero intro */
      var intro = $$('[data-intro]').sort(function (a, b) { return (Number(a.dataset.intro) || 0) - (Number(b.dataset.intro) || 0); });
      var tl = gsap.timeline();
      var zoom = $('[data-intro-zoom]');
      if (zoom) tl.from(zoom, { scale: 1.08, duration: 2.2, ease: 'power3.out', clearProps: 'transform' }, 0);
      intro.forEach(function (el, i) {
        el.classList.add('is-tweening');
        tl.from(el, {
          y: Number(el.dataset.introY || 32), autoAlpha: 0, duration: 1.2,
          onComplete: function () { clear([el]); }
        }, 0.12 + (Number(el.dataset.intro) || i) * 0.09);
      });
      root.classList.remove('anim-pending');

      /* parallax */
      $$('[data-parallax-hero]').forEach(function (el) {
        var scope = el.closest('[data-parallax-scope]') || el.parentElement;
        gsap.to(el, { yPercent: Number(el.dataset.parallaxHero) || 8, ease: 'none', scrollTrigger: { trigger: scope, start: 'top top', end: 'bottom top', scrub: true } });
      });
      $$('[data-parallax]').forEach(function (el) {
        var v = Number(el.dataset.parallax) || 6;
        gsap.fromTo(el, { yPercent: -v }, { yPercent: v, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
      });

      /* one-shot reveals */
      var items = $$('[data-rise]');
      $$('[data-rise-children]').forEach(function (g) { items = items.concat([].slice.call(g.children)); });
      items = items.filter(function (el, i, all) { return all.indexOf(el) === i; });
      items.forEach(function (el) { el.classList.add('is-tweening'); });
      gsap.set(items, { autoAlpha: 0, y: 36 });
      ST.batch(items, {
        start: 'top 90%',
        once: true,
        onEnter: function (batch) {
          gsap.to(batch, { autoAlpha: 1, y: 0, stagger: 0.09, overwrite: true, onComplete: function () { clear(batch); } });
        }
      });

      /* photos that settle from a slight zoom */
      $$('[data-zoom]').forEach(function (wrap) {
        var img = wrap.tagName === 'IMG' ? wrap : $('img', wrap);
        if (!img) return;
        gsap.from(img, { scale: 1.14, duration: 1.8, ease: 'power3.out', clearProps: 'transform', scrollTrigger: { trigger: wrap, start: 'top 92%', once: true } });
      });
    });

    window.addEventListener('load', function () { ST.refresh(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ST.refresh(); });
  } else {
    root.classList.remove('anim-pending');
  }

  /* ---------- Lenis: loaded when idle, on GSAP's ticker ---------- */
  function startLenis() {
    if (!window.Lenis || reduced) return;
    lenis = new window.Lenis({ duration: 1.1, easing: function (t) { return 1 - Math.pow(1 - t, 4); }, smoothWheel: true, syncTouch: false, autoRaf: !motion });
    if (motion) {
      lenis.on('scroll', ST.update);
      gsap.ticker.add(function (time) { if (lenis) lenis.raf(time * 1000); });
      gsap.ticker.lagSmoothing(0);
    }
    if (locks > 0) { lenis.stop(); lockMode = lockMode || 'pin'; }
  }
  if (!reduced) {
    var src = (document.currentScript && document.currentScript.src || '').replace(/js\/site-core\.js.*$/, 'vendor/lenis.min.js');
    var load = function () {
      var s = document.createElement('script');
      s.src = src || 'assets/vendor/lenis.min.js'; s.async = true; s.onload = startLenis;
      document.head.appendChild(s);
    };
    if ('requestIdleCallback' in window) requestIdleCallback(load, { timeout: 2500 }); else setTimeout(load, 1500);
  }

  reducedQuery.addEventListener('change', function (e) {
    reduced = e.matches;
    if (!reduced) return;
    if (ctx) ctx.revert();
    root.classList.remove('anim-pending');
    if (lenis && !locks) { lenis.destroy(); lenis = null; }
  });

  window.SiteCore = { openDialog: openDialog, setMenu: setMenu, lockScroll: lockScroll, get lenis() { return lenis; } };
})();
