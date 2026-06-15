/*
 * ============================================================
 *  site.js — Tech Tiger BD (2026 redesign)
 *  Automation for the new homepage:
 *   - Theme toggle (persisted in localStorage)
 *   - Auto-render product grid from products.json
 *   - Live search + category filter
 *   - Featured picks price sync
 *   - Scroll reveal + mobile nav
 *  Prices shown in BDT only.
 * ============================================================
 */
(function () {
  'use strict';

  /* ── Category metadata: color + label ── */
  var CATS = {
    ai:        { label: 'AI & Tools',  color: '#6D5EF7' },
    streaming: { label: 'Streaming',   color: '#F2385A' },
    music:     { label: 'Music',       color: '#18B368' },
    creative:  { label: 'Creative',    color: '#E84CC4' },
    vpn:       { label: 'VPN',         color: '#15C0D8' },
    messaging: { label: 'Messaging',   color: '#2E83FF' },
    gaming:    { label: 'Gaming',      color: '#F5A524' }
  };

  function catOf(item) {
    var c = String(item && item.category || '').toLowerCase();
    return CATS[c] ? c : 'ai';
  }

  /* ── THEME TOGGLE ── */
  (function initTheme() {
    var root = document.documentElement;
    var stored = null;
    try { stored = localStorage.getItem('ttbd-theme'); } catch (e) {}
    root.setAttribute('data-theme', stored === 'dark' ? 'dark' : 'light');

    document.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('[data-theme-toggle]');
      if (!btn) return;
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('ttbd-theme', next); } catch (err) {}
    });
  })();

  /* ── PRICE HELPER (BDT only) ── */
  function priceText(raw) {
    return String(raw == null ? '' : raw);
  }

  /* ── PRODUCT GRID + SEARCH + FILTER ── */
  var ALL_ITEMS = [];

  function makeCard(item) {
    var cat = catOf(item);
    var meta = CATS[cat];
    var available = item.available !== false;

    var card = document.createElement('article');
    card.className = 'pcard reveal';
    card.style.setProperty('--c', meta.color);
    card.dataset.name = String(item.name || '').toLowerCase();
    card.dataset.cat = cat;

    var media = document.createElement('a');
    media.className = 'pcard__media';
    media.href = String(item.link || '/');
    media.setAttribute('aria-label', String(item.name || 'Product'));

    var badge = document.createElement('span');
    badge.className = 'pcard__cat';
    badge.textContent = meta.label;
    media.appendChild(badge);

    var img = document.createElement('img');
    img.src = String(item.image || '');
    img.alt = String(item.name || 'Product');
    img.width = 400; img.height = 275;
    img.loading = 'lazy';
    media.appendChild(img);

    var body = document.createElement('div');
    body.className = 'pcard__body';
    var name = document.createElement('div');
    name.className = 'pcard__name';
    name.textContent = String(item.name || 'Product');
    var price = document.createElement('div');
    price.className = 'pcard__price';
    price.innerHTML = '<b>' + priceText(item.priceMonthly || item.priceRange || '') + '</b>';
    body.appendChild(name);
    body.appendChild(price);

    var cta = document.createElement('a');
    cta.className = 'pcard__cta' + (available ? '' : ' disabled');
    cta.href = available ? String(item.link || '/') : '#';
    cta.textContent = available ? String(item.cta || 'View plans') : 'Unavailable';
    if (!available) { cta.setAttribute('aria-disabled', 'true'); cta.tabIndex = -1; }

    card.appendChild(media);
    card.appendChild(body);
    card.appendChild(cta);
    return card;
  }

  function buildChips() {
    var box = document.getElementById('catChips');
    if (!box) return;
    var present = {};
    ALL_ITEMS.forEach(function (it) { present[catOf(it)] = true; });

    var frag = document.createDocumentFragment();
    var all = document.createElement('button');
    all.className = 'chip on';
    all.dataset.filter = 'all';
    all.textContent = 'All';
    frag.appendChild(all);

    Object.keys(CATS).forEach(function (key) {
      if (!present[key]) return;
      var chip = document.createElement('button');
      chip.className = 'chip';
      chip.dataset.filter = key;
      chip.textContent = CATS[key].label;
      chip.style.setProperty('--accent', CATS[key].color);
      chip.style.setProperty('--accent-soft', 'color-mix(in srgb, ' + CATS[key].color + ' 14%, transparent)');
      frag.appendChild(chip);
    });
    box.innerHTML = '';
    box.appendChild(frag);
  }

  function applyFilter() {
    var grid = document.getElementById('productGrid');
    if (!grid) return;
    var q = (document.getElementById('searchInput') || {}).value || '';
    q = q.trim().toLowerCase();
    var active = document.querySelector('#catChips .chip.on');
    var cat = active ? active.dataset.filter : 'all';

    var shown = 0;
    grid.querySelectorAll('.pcard').forEach(function (card) {
      var okCat = cat === 'all' || card.dataset.cat === cat;
      var okText = !q || card.dataset.name.indexOf(q) !== -1;
      var visible = okCat && okText;
      card.style.display = visible ? '' : 'none';
      if (visible) shown++;
    });

    var empty = document.getElementById('gridEmpty');
    if (empty) empty.style.display = shown === 0 ? '' : 'none';
  }

  function syncPicks() {
    var byLink = {};
    ALL_ITEMS.forEach(function (it) { byLink[String(it.link || '')] = it; });
    document.querySelectorAll('.pick').forEach(function (pick) {
      var href = pick.getAttribute('href') || '';
      var key = href;
      try { key = new URL(href, location.href).pathname; } catch (e) {}
      var item = byLink[key];
      if (!item) return;
      var el = pick.querySelector('.pick__price');
      if (el) el.textContent = priceText(item.priceMonthly || item.priceRange || '');
    });
  }

  function loadProducts() {
    var grid = document.getElementById('productGrid');
    if (!grid) return;
    fetch('/component/products.json', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data || !Array.isArray(data.items) || !data.items.length) return;
        ALL_ITEMS = data.items;
        grid.innerHTML = '';
        var frag = document.createDocumentFragment();
        ALL_ITEMS.forEach(function (it) { frag.appendChild(makeCard(it)); });
        grid.appendChild(frag);
        buildChips();
        syncPicks();
        observeReveals();
      })
      .catch(function () {});
  }

  /* Search + chip events (delegated) */
  document.addEventListener('input', function (e) {
    if (e.target && e.target.id === 'searchInput') applyFilter();
  });
  document.addEventListener('click', function (e) {
    var chip = e.target.closest && e.target.closest('#catChips .chip');
    if (!chip) return;
    document.querySelectorAll('#catChips .chip').forEach(function (c) { c.classList.remove('on'); });
    chip.classList.add('on');
    applyFilter();
  });

  /* ── SCROLL REVEAL ── */
  var revObs = null;
  function observeReveals() {
    if (!('IntersectionObserver' in window)) {
      document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('in'); });
      return;
    }
    if (!revObs) {
      revObs = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add('in'); revObs.unobserve(en.target); }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -30px 0px' });
    }
    document.querySelectorAll('.reveal:not(.in)').forEach(function (el) { revObs.observe(el); });
  }

  /* ── MOBILE NAV ── */
  function initMobileNav() {
    var burger = document.getElementById('burger');
    var mnav = document.getElementById('mnav');
    if (!burger || !mnav) return;
    burger.addEventListener('click', function () {
      burger.classList.toggle('open');
      mnav.classList.toggle('open');
      document.body.style.overflow = mnav.classList.contains('open') ? 'hidden' : '';
    });
    mnav.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        burger.classList.remove('open');
        mnav.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  /* ── YEAR ── */
  function setYear() {
    var y = document.getElementById('year');
    if (y) y.textContent = new Date().getFullYear();
  }

  /* ── INIT ── */
  function init() {
    setYear();
    initMobileNav();
    observeReveals();
    loadProducts();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
