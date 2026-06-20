/*
 * ============================================================
 *  social-proof.js — Tech Tiger BD
 *  Two lightweight trust signals, site-wide:
 *    1) Live "people online" counter (time-of-day aware,
 *       smooth drift, persisted across page navigation).
 *    2) Real-time purchase notifications built from the real
 *       product catalogue (products.json) + plausible BD
 *       buyers, randomized timing so it never feels scripted.
 *  No dependencies. Injects its own styles. Respects dark mode
 *  via the site's CSS variables and prefers-reduced-motion.
 * ============================================================
 */
(function () {
  'use strict';
  if (window.__ttbdSocialProof) return;
  window.__ttbdSocialProof = true;

  var REDUCED = false;
  try { REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

  /* ── Helpers ── */
  function ri(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  /* ── Buyers (first name + masked initial = privacy-real look) ── */
  var FIRST = ['Rakib', 'Tanvir', 'Sadia', 'Mehedi', 'Nusrat', 'Arif', 'Sabbir', 'Jahid',
    'Farhan', 'Mahin', 'Tasnim', 'Rifat', 'Shakil', 'Ananya', 'Sumaiya', 'Imran',
    'Nayeem', 'Rumana', 'Fahim', 'Ridoy', 'Sakib', 'Tania', 'Mizan', 'Polash',
    'Junaid', 'Samiul', 'Hasib', 'Ishrat', 'Maruf', 'Niloy', 'Tahmid', 'Adnan',
    'Mitu', 'Shanto', 'Rafi', 'Labib', 'Anik', 'Sneha', 'Pranto', 'Zarif'];
  var LAST = ['H.', 'R.', 'A.', 'K.', 'I.', 'S.', 'M.', 'C.', 'B.', 'U.', 'T.', 'N.'];
  var CITIES = ['Dhaka', 'Chattogram', 'Sylhet', 'Khulna', 'Rajshahi', 'Cumilla', 'Narayanganj',
    'Gazipur', 'Bogura', 'Mymensingh', 'Rangpur', 'Barishal', 'Jashore', "Cox's Bazar",
    'Tangail', 'Dinajpur', 'Savar', 'Narsingdi'];

  function timeAgo() {
    var m = ri(1, 34);
    if (m <= 1) return Math.random() < 0.5 ? 'just now' : '1 min ago';
    return m + ' min ago';
  }

  // Non-repeating buyer name supply: shuffle the full pool and hand out one at a
  // time; only reshuffle once every name has been shown (never two of the same
  // name back-to-back across reshuffles either).
  var nameQueue = [];
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function nextName() {
    if (!nameQueue.length) {
      nameQueue = shuffle(FIRST.slice());
      if (nameQueue[nameQueue.length - 1] === lastName && nameQueue.length > 1) {
        nameQueue.unshift(nameQueue.pop()); // avoid an immediate repeat after reshuffle
      }
    }
    var n = nameQueue.pop();
    lastName = n;
    return n;
  }

  /* ── Catalogue (filled from products.json, with a safe fallback) ── */
  var PRODUCTS = [
    { name: 'ChatGPT Plus', image: '/assets/brand/chatgpt.webp' },
    { name: 'Netflix', image: '/assets/brand/netflix.webp' },
    { name: 'YouTube Premium', image: '/assets/brand/youtube.webp' },
    { name: 'Spotify Premium', image: '/assets/brand/spotify.webp' },
    { name: 'Canva Pro', image: '/assets/brand/canva.webp' },
    { name: 'Perplexity Pro', image: '/assets/brand/perplexity.webp' }
  ];

  function loadCatalogue() {
    return fetch('/component/products.json', { cache: 'force-cache' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data || !Array.isArray(data.items)) return;
        var list = data.items
          .filter(function (it) { return it && it.available !== false && it.name; })
          .map(function (it) { return { name: String(it.name).trim(), image: String(it.image || '').trim() }; })
          .filter(function (it) { return it.image; });
        if (list.length) PRODUCTS = list;
      })
      .catch(function () {});
  }

  /* ── Styles ── */
  function injectStyles() {
    if (document.getElementById('ttbd-sp-style')) return;
    var css =
      '.ttbd-sp{position:fixed;left:16px;bottom:16px;z-index:9000;display:flex;flex-direction:column;gap:10px;' +
      'align-items:flex-start;max-width:340px;pointer-events:none;font-family:var(--font-body,inherit)}' +
      '@media(max-width:520px){.ttbd-sp{left:12px;bottom:12px;right:auto;max-width:calc(100vw - 92px)}}' +
      /* online pill */
      '.ttbd-online{pointer-events:auto;display:inline-flex;align-items:center;gap:9px;padding:8px 13px;border-radius:999px;' +
      'background:var(--card,#fff);border:1px solid var(--border-b,#e0e2ec);box-shadow:var(--shadow,0 8px 24px -10px rgba(16,24,40,.18));' +
      'font-size:12.5px;font-weight:600;color:var(--text,#14182b);line-height:1;white-space:nowrap}' +
      '.ttbd-online .dot{position:relative;width:9px;height:9px;border-radius:50%;background:#18B368;flex:0 0 auto}' +
      '.ttbd-online .dot::after{content:"";position:absolute;inset:-4px;border-radius:50%;background:#18B368;opacity:.45;' +
      'animation:ttbd-pulse 1.8s ease-out infinite}' +
      '.ttbd-online b{font-weight:800}' +
      '.ttbd-online .lv{color:var(--text-dim,#6b7280);font-weight:600;font-size:11px;letter-spacing:.04em;text-transform:uppercase}' +
      '@keyframes ttbd-pulse{0%{transform:scale(.6);opacity:.5}100%{transform:scale(2.4);opacity:0}}' +
      /* toast */
      '.ttbd-toast{pointer-events:auto;position:relative;display:flex;align-items:center;gap:12px;width:328px;max-width:100%;' +
      'padding:11px 36px 11px 12px;border-radius:14px;background:var(--card,#fff);border:1px solid var(--border-b,#e0e2ec);' +
      'box-shadow:var(--shadow-lg,0 24px 60px -16px rgba(16,24,40,.22));transform:translateY(14px);opacity:0;' +
      'transition:transform .42s cubic-bezier(.22,1,.36,1),opacity .42s ease}' +
      '.ttbd-toast.in{transform:translateY(0);opacity:1}' +
      '.ttbd-toast .pic{width:42px;height:42px;border-radius:11px;object-fit:contain;background:var(--bg-tint,#f4f5fa);' +
      'border:1px solid var(--border,#eceef4);flex:0 0 auto;padding:4px}' +
      '.ttbd-toast .body{min-width:0;display:flex;flex-direction:column;gap:2px}' +
      '.ttbd-toast .ttl{font-size:13px;font-weight:700;color:var(--text,#14182b);line-height:1.3;' +
      'white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '.ttbd-toast .ttl b{font-weight:800}' +
      '.ttbd-toast .meta{display:flex;align-items:center;gap:6px;font-size:11.5px;color:var(--text-dim,#6b7280);line-height:1.2}' +
      '.ttbd-toast .vf{display:inline-flex;align-items:center;gap:3px;color:#18B368;font-weight:700}' +
      '.ttbd-toast .vf svg{width:12px;height:12px}' +
      '.ttbd-toast .dotsep{width:3px;height:3px;border-radius:50%;background:var(--text-faint,#9aa0b4);flex:0 0 auto}' +
      '.ttbd-toast .x{position:absolute;top:7px;right:8px;width:20px;height:20px;border:none;background:transparent;cursor:pointer;' +
      'color:var(--text-faint,#9aa0b4);font-size:15px;line-height:1;border-radius:6px;display:grid;place-items:center}' +
      '.ttbd-toast .x:hover{color:var(--text,#14182b);background:var(--bg-tint,#f4f5fa)}' +
      (REDUCED ? '.ttbd-toast{transition:opacity .3s ease;transform:none}.ttbd-toast.in{transform:none}.ttbd-online .dot::after{animation:none}' : '');
    var st = document.createElement('style');
    st.id = 'ttbd-sp-style';
    st.textContent = css;
    document.head.appendChild(st);
  }

  /* ── Build container ── */
  var host, onlineEl, onlineNum;
  function build() {
    host = document.createElement('div');
    host.className = 'ttbd-sp';
    host.setAttribute('aria-live', 'polite');

    onlineEl = document.createElement('div');
    onlineEl.className = 'ttbd-online';
    onlineEl.setAttribute('role', 'status');
    onlineEl.innerHTML = '<span class="dot" aria-hidden="true"></span>' +
      '<span><b class="num">0</b> people online</span><span class="lv">Live</span>';
    onlineNum = onlineEl.querySelector('.num');

    host.appendChild(onlineEl);
    document.body.appendChild(host);
  }

  /* ── Online counter ──
   * Purely a function of wall-clock UTC time, so EVERY visitor on EVERY
   * device sees the same number at the same moment (no per-device random).
   * Stays within 20–50, leaning higher in the evening (Bangladesh time),
   * with a smooth deterministic oscillation so it feels alive.
   */
  // Relative activity by hour in Bangladesh time (0..1).
  var CURVE = [0.30, 0.20, 0.12, 0.08, 0.06, 0.10, 0.18, 0.28, 0.40, 0.50, 0.58, 0.64,
    0.66, 0.60, 0.62, 0.68, 0.74, 0.80, 0.88, 0.95, 1.00, 0.96, 0.78, 0.52];
  var MIN = 20, MAX = 50;

  function bdHourFraction(now) {
    var d = new Date(now);
    var utc = d.getTime() + d.getTimezoneOffset() * 60000;
    var bd = new Date(utc + 6 * 3600000); // UTC+6
    return bd.getHours() + bd.getMinutes() / 60;
  }
  function curveAt(now) {
    var h = bdHourFraction(now);
    var i = Math.floor(h) % 24;
    var j = (i + 1) % 24;
    var f = h - Math.floor(h);
    return CURVE[i] + (CURVE[j] - CURVE[i]) * f; // interpolate between hours
  }
  function onlineAt(now) {
    var base = MIN + (MAX - MIN) * curveAt(now);
    // Deterministic, smooth ripple (same on all devices) — two slow sine waves.
    var osc = 2.4 * Math.sin(now / 47000) + 1.5 * Math.sin(now / 131000);
    var v = Math.round(base + osc);
    if (v < MIN) v = MIN;
    if (v > MAX) v = MAX;
    return v;
  }

  function render() { if (onlineNum) onlineNum.textContent = String(onlineAt(Date.now())); }

  function startOnline() {
    render();
    setInterval(function () { if (!document.hidden) render(); }, 4000);
  }

  /* ── Purchase notifications ── */
  var lastProduct = '', lastName = '', toastTimer = null;

  function checkSvg() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true">' +
      '<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>';
  }

  function showToast() {
    if (!host || document.hidden) return;
    var prod = pick(PRODUCTS);
    for (var i = 0; i < 4 && (prod.name === lastProduct); i++) prod = pick(PRODUCTS);
    lastProduct = prod.name;

    var buyer = nextName() + ' ' + pick(LAST);
    var city = pick(CITIES);

    var el = document.createElement('div');
    el.className = 'ttbd-toast';
    el.setAttribute('role', 'status');

    var img = document.createElement('img');
    img.className = 'pic';
    img.src = prod.image;
    img.alt = prod.name;
    img.loading = 'lazy';
    img.onerror = function () { img.style.visibility = 'hidden'; };

    var body = document.createElement('div');
    body.className = 'body';
    var ttl = document.createElement('div');
    ttl.className = 'ttl';
    ttl.innerHTML = '<b></b> purchased <b></b>';
    ttl.querySelectorAll('b')[0].textContent = buyer;
    ttl.querySelectorAll('b')[1].textContent = prod.name;

    var meta = document.createElement('div');
    meta.className = 'meta';
    meta.innerHTML = '<span class="loc"></span><span class="dotsep"></span>' +
      '<span class="ago"></span><span class="dotsep"></span>' +
      '<span class="vf">' + checkSvg() + 'Verified</span>';
    meta.querySelector('.loc').textContent = city;
    meta.querySelector('.ago').textContent = timeAgo();

    body.appendChild(ttl);
    body.appendChild(meta);

    var x = document.createElement('button');
    x.className = 'x';
    x.type = 'button';
    x.setAttribute('aria-label', 'Dismiss');
    x.innerHTML = '&times;';

    el.appendChild(img);
    el.appendChild(body);
    el.appendChild(x);
    host.insertBefore(el, onlineEl); // toasts rise above the pinned online pill

    requestAnimationFrame(function () { requestAnimationFrame(function () { el.classList.add('in'); }); });

    var hideT = setTimeout(remove, 6500);
    function remove() {
      clearTimeout(hideT);
      el.classList.remove('in');
      setTimeout(function () { el.remove(); }, 460);
    }
    x.addEventListener('click', remove);
  }

  function scheduleNext(delay) {
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      showToast();
      scheduleNext(ri(15000, 32000));
    }, delay);
  }

  /* ── Boot ── */
  function boot() {
    injectStyles();
    build();
    startOnline();
    loadCatalogue().then(function () {
      scheduleNext(ri(7000, 11000)); // first one shortly after load
    });
    // Refresh the count the moment the user returns to the tab.
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) { render(); }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
