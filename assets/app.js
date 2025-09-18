if ('serviceWorker' in navigator) { navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister())); }
(function () {
  const $ = (q, r = document) => r.querySelector(q);
  const $$ = (q, r = document) => r.querySelectorAll(q);

  // ---------- Config ----------
  const GAS_URL = "https://script.google.com/macros/s/AKfycbyLjru6Gqm9qlXUWgDYPCMaGGeEIam0OrWRguPVTGYj73eI6zyt745aZaWRLreVJmGt/exec";
  const WHATSAPP_URL = "https://wa.me/8801881738485";
  // Pricing Sheet (Publish to web as CSV or use gviz JSON). Leave blank to disable.
  // How to set:
  // - In Google Sheets: File → Share → Publish to web → Entire sheet → CSV
  // - Copy the URL and paste below. Columns required: sku, price (header names flexible)
  // - Example rows: chatgpt_shared_1m, 400
  const PRICING_SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSnbsW6WhpLrxynW5ulRz-chNVLpD-sUOFtTeGFrQpzLTEcVousfG-zw0cP9HhxylZiV4nUUppvhCBk/pub?gid=0&single=true&output=csv";
  // Expose to global for modules outside this IIFE
  window.PRICING_SHEET_URL = PRICING_SHEET_URL;
  // Allow override via query param (?sheet=...) early
  try {
    const qs = new URLSearchParams(location.search);
    const sheetU = qs.get('sheet');
    if (sheetU) window.PRICING_SHEET_URL = sheetU;
  } catch (_) { }
  // Optional local fallback CSVs (for dev/demo)
  const SHEET_FALLBACKS = [
    '/assets/pricing-templates.csv',
    '../assets/pricing-templates.csv',
    '/assets/pricing-template.csv',
    '../assets/pricing-template.csv'
  ];

  // Free Fire prices + labels
  const FF_PRICES = { 20: 25, 36: 45, 80: 83, 160: 160, 161: 160, 405: 400, 800: 800, 810: 800, 1625: 1600 };
  const DIAMOND_LABELS = {
    20: "25 Diamond", 36: "50 Diamond", 80: "115 Diamond", 160: "240 Diamond", 161: "Weekly Membership",
    405: "610 Diamond", 800: "Monthly Membership", 810: "1240 Diamond", 1625: "2530 Diamond"
  };

  // Manual productKey mapping
  const MANUAL_KEYS = {
    "Crunchyroll Premium": {
      "6m_shared": "manual_cr_6m_shared",
      "6m_personal": "manual_cr_6m_personal",
      "1y_shared": "manual_cr_1y_shared",
      "1y_personal": "manual_cr_1y_personal"
    },
    "Netflix Personal": { "1m": "manual_netflix_personal" },
    "Prime": { "1m": "manual_prime" },
    "YouTube Premium": {
      "nonrenew": "manual_youtube_nonrenew",
      "renew": "manual_youtube_renew"
    },
    "Disney+ Profile": { "profile": "manual_disney_profile" },
    "HBO Profile": { "profile": "manual_hbo_profile" },
    "Surfshark VPN": { "1m": "manual_shurfshark_1m" },
    "Google AI Gemini + VEO3": {
      "1y": "manual_gemini_veo3_1y",
      "1y_2tb": "manual_gemini_veo3_2tb_1y"
    },
    "Telegram Premium": { "1m": "manual_telegram_1m", "1y": "manual_telegram_1y" },
    "Spotify Premium": { "1m": "manual_spotify_1m", "2m": "manual_spotify_2m" },
    "ChatGPT": { "shared": "manual_chatgpt_shared", "personal": "manual_chatgpt_personal" }
  };

  const fmtTk = v => "৳" + Number(v || 0).toString();
  const toast = (msg, opts = {}) => {
    try {
      // host container (bottom-right, stacked)
      let host = document.getElementById('toastHost');
      if (!host) {
        host = document.createElement('div');
        host.id = 'toastHost';
        host.style.cssText = [
          'position:fixed',
          'z-index:99999',
          'right:18px',
          'bottom:18px',
          'display:flex',
          'flex-direction:column',
          'gap:8px',
          'align-items:flex-end'
        ].join(';');
        document.body.appendChild(host);
      }

      const t = document.createElement('div');
      const type = String(opts.type || 'info');
      const bg = type === 'error' ? 'linear-gradient(135deg,#ef4444,#b91c1c)' :
        type === 'success' ? 'linear-gradient(135deg,#10b981,#047857)' :
          'linear-gradient(135deg,#111827,#1f2937)';
      t.textContent = msg;
      t.style.cssText = [
        'max-width:70vw',
        'background:' + bg,
        'color:#fff',
        'padding:10px 14px',
        'border-radius:12px',
        'box-shadow:0 10px 30px rgba(2,6,23,.28)',
        'border:1px solid rgba(255,255,255,.08)',
        'font-weight:700',
        'font-size:14px'
      ].join(';');
      host.appendChild(t);
      setTimeout(() => t.remove(), opts.duration ? Number(opts.duration) : 2200);
    } catch (e) { try { alert(msg); } catch (_) { } }
  };
  // Make toast available globally for helpers outside this IIFE
  window.toast = toast;

  // -------- Global page loader (full-screen overlay) --------
  (function initPageLoader() {
    function ensure() {
      let el = document.getElementById('pageLoader');
      if (!el) {
        // create minimal overlay if page doesn't include it
        el = document.createElement('div');
        el.id = 'pageLoader';
        el.style.cssText = 'position:fixed;inset:0;background:rgba(247,248,251,.9);backdrop-filter:blur(4px);display:none;align-items:center;justify-content:center;z-index:99998';
        el.innerHTML = '<div class="box" style="background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:18px 20px;box-shadow:0 6px 20px rgba(2,6,23,.06);display:grid;gap:10px;align-items:center;justify-items:center;min-width:240px"><svg class="spin" viewBox="0 0 50 50" width="36" height="36" aria-hidden="true"><circle cx="25" cy="25" r="20" stroke="currentColor" stroke-width="5" fill="none" stroke-linecap="round" stroke-dasharray="31.4 31.4"><animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="0.8s" repeatCount="indefinite"/></circle></svg><div id="pageLoaderText" class="stat" style="color:#64748b;font-weight:700">Loading…</div></div>';
        document.body.appendChild(el);
      }
      return el;
    }
    let depth = 0;
    function show(text) { const el = ensure(); el.style.display = 'flex'; const t = document.getElementById('pageLoaderText'); if (t) t.textContent = text || 'Loading…'; }
    function hide() { const el = ensure(); el.style.display = 'none'; }
    function set(text) { const t = document.getElementById('pageLoaderText'); if (t) t.textContent = text || 'Loading…'; }
    window.loaderInc = function (text) { depth++; show(text); };
    window.loaderSet = function (text) { set(text); };
    window.loaderDec = function () { depth = Math.max(0, depth - 1); if (depth === 0) hide(); };
  })();

  // Year + theme
  $('#year') && ($('#year').textContent = new Date().getFullYear());
  const root = document.documentElement;
  const saved = localStorage.getItem('theme');
  if (saved) {
    root.setAttribute('data-theme', saved);
  } else {
    root.setAttribute('data-theme', 'light');
  }

  // ---- Pricing Sheet loader ----
  function parseCSV(text) {
    const rows = [];
    let cur = [];
    let val = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const next = text[i + 1];
      if (inQuotes) {
        if (ch === '"' && next === '"') { val += '"'; i++; continue; }
        if (ch === '"') { inQuotes = false; continue; }
        val += ch; continue;
      } else {
        if (ch === '"') { inQuotes = true; continue; }
        if (ch === ',') { cur.push(val); val = ''; continue; }
        if (ch === '\n') { cur.push(val); rows.push(cur); cur = []; val = ''; continue; }
        if (ch === '\r') { continue; }
        val += ch;
      }
    }
    cur.push(val);
    rows.push(cur);
    // trim trailing empty newline row
    return rows.filter(r => r.length && !(r.length === 1 && r[0].trim() === ''));
  }
  const unquote = (s) => {
    if (typeof s !== 'string') return s;
    let t = s.trim();
    if (t.startsWith('"') && t.endsWith('"')) t = t.slice(1, -1);
    return t;
  };
  async function fetchPricingMap(url) {
    if (!url) return {};
    try {
      // Prefer local cache when available
      try {
        const cachePaths = [
          '/assets/data/cache.json',
          '../assets/data/cache.json',
          './assets/data/cache.json'
        ];
        let cached = null;
        for (const p of cachePaths) {
          try { const j = await fetch(p, { cache: 'no-store' }).then(r => r.ok ? r.json() : null); if (j && j.data) { cached = j; break; } } catch (_) { }
        }
        if (cached && cached.data && typeof cached.data === 'object') {
          // Filter to numeric entries for pricing
          const map = {};
          Object.entries(cached.data).forEach(([k, v]) => { const n = parseInt(String(v).replace(/[^\d]/g, ''), 10) || 0; if (n > 0) map[k] = n; });
          if (Object.keys(map).length) return map;
        }
      } catch (_) { }
      const res = await fetch(url, { cache: 'no-store' });
      let text = await res.text();
      // gviz JSON starts with "/*" or ")]}'" noise
      const isGviz = text.trim().startsWith("/*") || text.trim().startsWith(")]}");
      if (isGviz) {
        const json = JSON.parse(text.replace(/^.*?\n/, ''));
        const rows = json.table?.rows || [];
        const map = {};
        rows.forEach(r => {
          const c = r.c || [];
          const k = (c[0]?.v ?? c[0]?.f ?? "").toString().trim();
          const v = parseInt((c[1]?.v ?? c[1]?.f ?? "0").toString().replace(/[^\d]/g, ''), 10) || 0;
          if (k) map[k] = v;
        });
        return map;
      }
      // CSV parser (robust)
      const rows = parseCSV(text);
      if (!rows.length) return {};
      const header = rows[0].map(s => unquote(String(s)).trim().toLowerCase());
      let idxSku = Math.max(header.indexOf('sku'), header.indexOf('id'));
      let idxPrice = Math.max(header.indexOf('price'), header.indexOf('amount'));
      // Fallback: auto-detect price column if header non-standard
      if (idxPrice < 0) {
        let best = { idx: -1, hits: 0 };
        const colCount = Math.max(...rows.map(r => r.length));
        for (let j = 0; j < colCount; j++) {
          let hits = 0;
          for (let i = 1; i < rows.length; i++) {
            const cell = String(rows[i][j] ?? '').trim();
            if (!cell) continue;
            const num = parseInt(cell.replace(/[^\d]/g, ''), 10) || 0;
            if (num > 0) hits++;
          }
          if (hits > best.hits) best = { idx: j, hits };
        }
        if (best.hits > 0) idxPrice = best.idx;
      }
      // Fallback: if no SKU col found, try first column as id/key
      if (idxSku < 0) idxSku = 0;
      const map = {};
      for (let i = 1; i < rows.length; i++) {
        const parts = rows[i];
        const k = unquote(parts[idxSku] || '').trim();
        const v = parseInt(String(parts[idxPrice] || '0').replace(/[^\d]/g, ''), 10) || 0;
        if (k && v > 0) map[k] = v; // only keep valid pricing rows
      }
      return map;
    } catch (e) { console.warn('Pricing sheet load failed:', e); return {}; }
  }
  // Expose helper globally for modules outside this IIFE
  window.fetchPricingMap = fetchPricingMap;

  // ---- Generic Sheet key/value loader (for content text) ----
  async function fetchSheetKeyValue(url) {
    if (!url) return {};
    try {
      // Prefer local cache when available
      try {
        const cachePaths = [
          '/assets/data/cache.json',
          '../assets/data/cache.json',
          './assets/data/cache.json'
        ];
        let cached = null;
        for (const p of cachePaths) {
          try { const j = await fetch(p, { cache: 'no-store' }).then(r => r.ok ? r.json() : null); if (j && j.data) { cached = j; break; } } catch (_) { }
        }
        if (cached && cached.data && typeof cached.data === 'object') {
          // Merge per-product stock/status from grouped cache to flat keys for compatibility
          const map = { ...cached.data };
          try {
            const prods = cached.products || {};
            Object.keys(prods).forEach(slug => {
              const st = prods[slug] && prods[slug].stock;
              if (st != null && String(st).trim() !== '') {
                map[slug + '_stock'] = st;
                map[slug + '_status'] = st;
              }
            });
          } catch (_) { }
          return map;
        }
      } catch (_) { }
      const res = await fetch(url, { cache: 'no-store' });
      let text = await res.text();
      const isGviz = text.trim().startsWith("/*") || text.trim().startsWith(")]}");
      if (isGviz) {
        const json = JSON.parse(text.replace(/^.*?\n/, ''));
        const rows = json.table?.rows || [];
        const map = {};
        rows.forEach(r => {
          const c = r.c || [];
          const k = (c[0]?.v ?? c[0]?.f ?? "").toString().trim().toLowerCase();
          const v = (c[2]?.v ?? c[2]?.f ?? c[1]?.v ?? c[1]?.f ?? "").toString();
          if (k) map[k] = v;
        });
        return map;
      }
      const rows = parseCSV(text);
      if (!rows.length) return {};
      const header = rows[0].map(s => unquote(String(s)).trim().toLowerCase());
      const idxKey = Math.max(header.indexOf('sku'), header.indexOf('key'), header.indexOf('id'));
      const idxVal = header.indexOf('value') >= 0 ? header.indexOf('value')
        : (header.indexOf('text') >= 0 ? header.indexOf('text')
          : (header.indexOf('desc') >= 0 ? header.indexOf('desc')
            : header.indexOf('notes')));
      const map = {};
      let kvMode = false; // if a later row is ['key','value'] switch to KV mode for subsequent rows
      for (let i = 1; i < rows.length; i++) {
        const parts = rows[i];
        const low0 = (String(parts[0] || '').trim().toLowerCase());
        const low1 = (String(parts[1] || '').trim().toLowerCase());
        if (low0 === 'key' && low1 === 'value') { kvMode = true; continue; }
        const k = unquote(parts[idxKey] || '').trim().toLowerCase();
        // If price/amount column contains a number for this row, treat as pricing row and skip for content map
        const priceIdx = header.indexOf('price');
        const amountIdx = header.indexOf('amount');
        const priceCell = priceIdx >= 0 ? String(parts[priceIdx] || '') : '';
        const amountCell = amountIdx >= 0 ? String(parts[amountIdx] || '') : '';
        const numericInRow = /\d/.test(priceCell.replace(/[^\d]/g, '')) || /\d/.test(amountCell.replace(/[^\d]/g, ''));
        if (!k) continue;
        // In KV mode, don't use numeric check (value may contain digits)
        if (!kvMode && numericInRow) continue;
        let v = (idxVal >= 0 ? unquote(parts[idxVal] || '') : '').trim();
        // Fallbacks: if in kvMode, use 2nd column as value (re-join tail in case of commas)
        if ((!v || v.length === 0) && kvMode) {
          v = unquote(parts.slice(1).join(',')).trim();
        }
        // Another fallback: if only two columns present and second has content, treat as value
        if ((!v || v.length === 0) && parts.length === 2) {
          v = unquote(parts[1] || '').trim();
        }
        if (k && v) map[k] = v;
      }
      return map;
    } catch (e) { console.warn('Sheet key/value load failed:', e); return {}; }
  }
  window.fetchSheetKeyValue = fetchSheetKeyValue;
  $('#themeToggle')?.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next); localStorage.setItem('theme', next);
  });

  // ---------- Modals ----------
  const buyModal = $('#buyModal');
  const paymentModal = $('#paymentModal');
  const buyForm = $('#buyForm');
  const paymentForm = $('#paymentForm');

  // State
  let state = {
    mode: "manual", // manual | auto-cr | freefire
    productName: "",
    unitPrice: 0,
    qty: 1,
    planId: "",
    planLabel: "",
    serviceKey: "",   // for auto-cr
    ff: { uid: "", uc: 0 },
    contactEmail: "",
    contactPhone: "",
    lastStatus: "Pending"
  };

  function updateTotals() {
    const total = state.unitPrice * (state.qty || 1);
    $('#mUnit') && ($('#mUnit').textContent = fmtTk(state.unitPrice));
    $('#mTotal') && ($('#mTotal').textContent = fmtTk(total));
    $('#payTotal') && ($('#payTotal').textContent = fmtTk(total));
  }

  // Build plan chips
  function renderPlans(plans) {
    const wrap = $('#mPlans');
    wrap.innerHTML = "";
    plans.forEach(p => {
      const b = document.createElement('button');
      b.type = "button";
      b.className = "btn";
      b.dataset.planId = p.id;
      b.dataset.price = p.price;
      b.textContent = `${p.label} • ${fmtTk(p.price)}`;
      b.addEventListener('click', () => {
        wrap.querySelectorAll('button').forEach(x => x.classList.remove('btn-primary'));
        b.classList.add('btn-primary');
        state.planId = p.id;
        state.planLabel = p.label;
        state.unitPrice = Number(p.price);
        updateTotals();
      });
      wrap.appendChild(b);
    });
    wrap.querySelector('button')?.click();
  }

  // Free Fire diamonds chips
  function renderFF() {
    const host = $('#ffDiamonds');
    host.innerHTML = "";
    Object.keys(FF_PRICES).sort((a, b) => Number(a) - Number(b)).forEach(k => {
      const uc = Number(k);
      const lab = DIAMOND_LABELS[uc] || (uc + " UC");
      const price = FF_PRICES[uc];
      const btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'btn';
      btn.textContent = `${lab} • ${fmtTk(price)}`;
      btn.addEventListener('click', () => {
        host.querySelectorAll('button').forEach(x => x.classList.remove('btn-primary'));
        btn.classList.add('btn-primary');
        state.ff.uc = uc;
        state.unitPrice = price;
        state.qty = 1;
        state.planLabel = lab;
        updateTotals();
      });
      host.appendChild(btn);
    });
    host.querySelector('button')?.click();
  }

  // Result panel inside payment modal
  function ensureResultPanel() {
    const body = paymentForm?.querySelector('.modal__body');
    if (!body) return null;
    let panel = body.querySelector('#resultPanel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'resultPanel';
      panel.style.cssText = "margin-top:14px;padding:12px;border:1px solid var(--border);border-radius:12px;background:var(--card-2);";
      body.appendChild(panel);
    } else {
      panel.innerHTML = "";
    }
    return panel;
  }

  // Copy helper
  function copy(text) {
    try { navigator.clipboard.writeText(text); toast("Copied!"); }
    catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta);
      ta.select(); document.execCommand('copy'); ta.remove(); toast("Copied!");
    }
  }

  const GUIDE_SHARED = `
<strong>Shared Account নির্দেশনা</strong><br>
সর্বোচ্চ ১ ডিভাইস লগিন।<br>
Watch History এলোমেলো হয়ে যেতে পারে।<br>
CrunchyList এলোমেলো হয়ে যেতে পারে।<br>
আপনার নামে কোনো প্রোফাইল থাকবে না।<br>
নিজে নিজে মাঝেমধ্যে Log Out হতে পারে।<br>
(আবার Same Mail Pass এই লগিন হবে)<br>
★ ভিডিও দেখতে কোনো সমস্যা নেই
`.trim();

  const GUIDE_PERSONAL = `
<strong>Personal Profile নির্দেশনা</strong><br>
সর্বোচ্চ ২ ডিভাইস লগিন।<br>
আপনার নামে ১ টা প্রোফাইল থাকবে।<br>
Watch History এলোমেলো হবে না।<br>
আলাদা Crunchylist থাকবে।<br>
Logout Issue নেই।<br>
প্রতিমাসে রিনিউ করতে পারবেন।
`.trim();

  function renderCredentials(panel, account, serviceKey) {
    const isShared = /shared/i.test(serviceKey || account?.service || "");
    const guideHtml = isShared ? GUIDE_SHARED : GUIDE_PERSONAL;
    const mail = account?.mail || "";
    const pass = account?.pass || "";
    const profile = account?.profile || "";

    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <div style="display:grid;gap:8px;">
        <div style="display:flex;gap:8px;align-items:center;">
          <div style="flex:1">
            <div class="muted" style="font-size:12px;">Email / Username</div>
            <div id="credMail" style="font-weight:700;word-break:break-all;">${mail}</div>
          </div>
          <button class="btn" id="copyMail">Copy</button>
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
          <div style="flex:1">
            <div class="muted" style="font-size:12px;">Password</div>
            <div id="credPass" style="font-weight:700;word-break:break-all;">${pass}</div>
          </div>
          <button class="btn" id="copyPass">Copy</button>
        </div>
        ${profile ? `
        <div style="display:flex;gap:8px;align-items:center;">
          <div style="flex:1">
            <div class="muted" style="font-size:12px;">Profile</div>
            <div id="credProfile" style="font-weight:700;">${profile}</div>
          </div>
          <button class="btn" id="copyProfile">Copy</button>
        </div>` : ""}
        <div>
          <button class="btn" id="copyAll">Copy All</button>
        </div>
        <div class="muted" style="margin-top:6px;font-size:13px;line-height:1.45;">${guideHtml}</div>
      </div>
    `;
    panel.appendChild(wrap);

    wrap.querySelector('#copyMail')?.addEventListener('click', () => copy(mail));
    wrap.querySelector('#copyPass')?.addEventListener('click', () => copy(pass));
    wrap.querySelector('#copyProfile')?.addEventListener('click', () => copy(profile));
    wrap.querySelector('#copyAll')?.addEventListener('click', () => copy(
      `Email: ${mail}\nPass: ${pass}${profile ? `\nProfile: ${profile}` : ""}`
    ));
  }

  function renderActions(panel, trx, status) {
    const row = document.createElement('div');
    row.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;";
    const btnContact = document.createElement('button');
    btnContact.className = "btn";
    btnContact.textContent = "Contact WhatsApp";
    btnContact.addEventListener('click', () => {
      openWhatsApp(trx, { status: status || state.lastStatus });
    });
    row.appendChild(btnContact);
    panel.appendChild(row);
    return { row, btnContact };
  }

  function renderGetAccount(panel, trx, status) {
    const row = document.createElement('div');
    row.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;";
    const btn = document.createElement('button');
    btn.className = "btn btn-primary";
    btn.textContent = "Get Account on WhatsApp";
    btn.addEventListener('click', () => openWhatsApp(trx, { status: status || state.lastStatus }));
    row.appendChild(btn);
    panel.appendChild(row);
  }

  // Open manual (default modal body)
  function openManual(productBtn) {
    state = {
      mode: "manual",
      productName: productBtn.dataset.name || "Product",
      unitPrice: Number(productBtn.dataset.price || 0),
      qty: 1,
      planId: "",
      planLabel: "",
      serviceKey: "",
      ff: { uid: "", uc: 0 },
      contactEmail: "",
      contactPhone: "",
      lastStatus: "Pending"
    };

    $('#mTitle').textContent = state.productName;
    $('#mType').textContent = "Subscription";

    // Restore default product section template
    const tmpl = document.querySelector('.product-section-template');
    const body = buyForm.querySelector('.modal__body');
    if (tmpl && body) body.innerHTML = tmpl.innerHTML;

    // Setup plans
    let plans = [];
    try { plans = JSON.parse(productBtn.dataset.plans || "[]"); } catch (e) { }
    if (!plans.length) plans = [{ id: "1m", label: "1 Month", price: state.unitPrice }];
    renderPlans(plans);

    // Make email optional
    const tgt = $('#mTarget');
    if (tgt) { try { tgt.removeAttribute('required'); tgt.setAttribute('aria-required', 'false'); } catch (e) { } }
    $('#mTarget')?.setAttribute('placeholder', 'you@example.com');

    updateTotals();
    buyModal.showModal();
  }

  // Open Free Fire
  function openFreeFire() {
    state = {
      mode: "freefire",
      productName: "Free Fire UC Top-up",
      unitPrice: 0, qty: 1,
      planId: "", planLabel: "",
      serviceKey: "",
      ff: { uid: "", uc: 0 },
      contactEmail: "", contactPhone: "",
      lastStatus: "Pending"
    };
    $('#mTitle').textContent = state.productName;
    $('#mType').textContent = "Game";

    const tmpl = document.querySelector('.freefire-section-template');
    const body = buyForm.querySelector('.modal__body');
    if (tmpl && body) body.innerHTML = tmpl.innerHTML;
    $('#ffUid')?.addEventListener('input', (e) => state.ff.uid = e.target.value.trim());
    renderFF();
    updateTotals();
    buyModal.showModal();
  }

  // Open Auto Crunchyroll
  function openAutoCR(btn) {
    state = {
      mode: "auto-cr",
      productName: btn.dataset.name || "Crunchyroll 1M",
      unitPrice: Number(btn.dataset.price || 0),
      qty: 1,
      planId: "1m", planLabel: "1 Month",
      serviceKey: btn.dataset.service || "",
      ff: { uid: "", uc: 0 },
      contactEmail: "", contactPhone: "",
      lastStatus: "Pending"
    };
    $('#payTitle').textContent = state.productName;
    $('#payTotal').textContent = fmtTk(state.unitPrice);
    buyModal.close?.();
    paymentModal.showModal();
    ensureResultPanel(); // prepare panel
  }

  // Wire buy buttons
  $$('.buy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode || "";
      if (mode === 'freefire') return openFreeFire();
      if (mode === 'auto-cr') return openAutoCR(btn);
      openManual(btn);
    });
  });

  // In-product Checkout -> Payment
  buyForm?.querySelector('a[href="/checkout"]')?.addEventListener('click', (e) => {
    e.preventDefault();
    // capture email before closing
    state.contactEmail = ($('#mTarget')?.value || "").trim();
    $('#payTitle').textContent = state.productName + (state.planLabel ? (" • " + state.planLabel) : "");
    $('#payTotal').textContent = $('#mTotal').textContent;
    paymentModal.showModal();
    ensureResultPanel(); // prepare panel
  });

  // Payment Back
  paymentForm?.querySelector('#payBack')?.addEventListener('click', (e) => {
    e.preventDefault();
    paymentModal.close();
    if (state.mode !== 'auto-cr') buyModal.showModal();
  });

  // Payment method visuals
  paymentForm?.addEventListener('click', (e) => {
    const b = e.target.closest('.pay-btn'); if (!b) return;
    paymentForm.querySelectorAll('.pay-btn').forEach(x => x.classList.remove('selected'));
    b.classList.add('selected');
    const map = { bkash: "01881738485", nagad: "01881738485", rocket: "018292553669" };
    $('#payNum').textContent = map[b.dataset.method] || "01881738485";
  });

  // Proceed
  paymentForm?.querySelector('#payProceed')?.addEventListener('click', async (e) => {
    e.preventDefault();
    const trx = ($('#payTrxID')?.value || "").trim();
    state.contactPhone = ($('#paySenderNum')?.value || "").trim();
    if (!trx) { toast("Please enter TrxID."); return; }

    const contactQuery = `&contact_email=${encodeURIComponent(state.contactEmail || "")}&phone=${encodeURIComponent(state.contactPhone || "")}`;
    const panel = ensureResultPanel();
    if (panel) { panel.innerHTML = '<div class="muted">Processing…</div>'; }

    try {
      if (state.mode === 'auto-cr') {
        const url = `${GAS_URL}?trxid=${encodeURIComponent(trx)}&service=${encodeURIComponent(state.serviceKey)}${contactQuery}`;
        const res = await fetch(url); const data = await res.json();
        panel.innerHTML = "";
        state.lastStatus = (data && data.success) ? 'Paid' : 'Failed';
        if (data && data.success) {
          const h = document.createElement('div');
          h.innerHTML = `<div style="font-weight:700;margin-bottom:8px;">✅ Delivered</div>`;
          panel.appendChild(h);
          renderCredentials(panel, data.account || {}, state.serviceKey);
        } else {
          const h = document.createElement('div');
          h.innerHTML = `<div style="font-weight:700;color:#ff5c7c;margin-bottom:8px;">❌ Delivery failed</div><div class="muted">${(data && data.message) || "Unknown error"}</div>`;
          panel.appendChild(h);
        }
        renderActions(panel, trx, state.lastStatus);
        return;
      }

      if (state.mode === 'freefire') {
        const uid = (state.ff.uid || "").trim();
        if (!uid || !state.ff.uc) { toast("Enter UID and select Diamonds."); return; }
        const url = `${GAS_URL}?action=freefire_topup&trxid=${encodeURIComponent(trx)}&uid=${encodeURIComponent(uid)}&uc=${encodeURIComponent(state.ff.uc)}${contactQuery}`;
        const res = await fetch(url); const data = await res.json();
        panel.innerHTML = "";
        state.lastStatus = (data && data.success) ? 'Paid' : 'Failed';
        if (data && data.success) {
          panel.innerHTML = `<div style="font-weight:700;margin-bottom:4px;">✅ Top-up successful</div>
            <div><strong>IGN:</strong> ${data.ign || "-"}</div>
            <div><strong>Pack:</strong> ${data.amount || (DIAMOND_LABELS[state.ff.uc] || state.ff.uc)}</div>`;
        } else {
          panel.innerHTML = `<div style="font-weight:700;color:#ff5c7c;margin-bottom:4px;">❌ Top-up failed</div>
            <div class="muted">${(data && data.message) || "Unknown error"}</div>`;
        }
        renderActions(panel, trx, state.lastStatus);
        return;
      }

      // Manual: verify only → show Get Account button in-card
      const map = MANUAL_KEYS[state.productName] || {};
      const productKey = map[state.planId] || "";
      const url = `${GAS_URL}?action=verify_only&trxid=${encodeURIComponent(trx)}&product=${encodeURIComponent(productKey)}${contactQuery}`;
      const res = await fetch(url); const data = await res.json();
      state.lastStatus = (data && data.success) ? "Paid" : "Failed";
      panel.innerHTML = "";
      if (data && data.success) {
        const ok = document.createElement('div');
        ok.innerHTML = `<div style="font-weight:700;margin-bottom:6px;">✅ Payment verified</div>
                        <div class="muted">Click below to request your account now.</div>`;
        panel.appendChild(ok);
        renderGetAccount(panel, trx, "Paid");
      } else {
        const bad = document.createElement('div');
        bad.innerHTML = `<div style="font-weight:700;color:#ff5c7c;margin-bottom:6px;">❌ Verification failed</div>
                         <div class="muted">${(data && data.message) || "Unknown error"}</div>`;
        panel.appendChild(bad);
      }
      renderActions(panel, trx, state.lastStatus);

    } catch (err) {
      const panel2 = ensureResultPanel();
      if (panel2) {
        panel2.innerHTML = `<div style="font-weight:700;color:#ff5c7c;margin-bottom:6px;">❌ Network error</div>
                            <div class="muted">${String(err)}</div>`;
        renderActions(panel2, trx);
      } else {
        alert("Network error. Try again.");
      }
    }
  });

  // Open WhatsApp helper:
  // - If trx is falsy -> opens generic contact message
  // - Else -> opens formatted order summary (Paid / Pending / Failed) with trxid
  function openWhatsApp(trx, opts = {}) {
    const generic = `Hi, Contacting through streamybd.com\nI have a query`;
    if (!trx) {
      const url = `${WHATSAPP_URL}?text=${encodeURIComponent(generic)}`;
      window.open(url, '_blank');
      return;
    }
    const amount = ($('#payTotal')?.textContent || '').replace(/[^\d]/g, '');
    const statusText = (opts && opts.status) ? String(opts.status) : (state.lastStatus || "Pending");
    const lines = [
      `I ordered "${state.productName}${state.planLabel ? (' - ' + state.planLabel) : ''}"`,
      `Validity: ${state.planLabel || '1 Month'}`,
      `Status: ${statusText}`,
      `Trxid: ${trx}`,
      `Amount: ${amount ? (amount + ' BDT') : ''}`.trim(),
      `please proceed with next`
    ];
    const text = lines.join("\n");
    const url = `${WHATSAPP_URL}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  }

  // ✅ Floating WhatsApp FAB (now inside the IIFE so openWhatsApp is in scope)
  document.addEventListener('DOMContentLoaded', function () {
    const fab = document.getElementById('whatsAppFab');
    if (fab) fab.addEventListener('click', () => openWhatsApp(""));
  });

  // Quantity
  buyForm?.addEventListener('click', (e) => {
    const btn = e.target.closest('.qty .btn'); if (!btn) return;
    const step = Number(btn.dataset.step || 0);
    const input = $('#mQty'); let v = Number(input.value || 1) + step;
    if (v < Number(input.min || 1)) v = Number(input.min || 1);
    if (v > Number(input.max || 99)) v = Number(input.max || 99);
    input.value = v; state.qty = v; updateTotals();
  });
  // Expandable descriptions: 1 line collapsed → click/Enter/Space to toggle
  document.addEventListener('DOMContentLoaded', () => {
    const paras = document.querySelectorAll('#plans .card p.muted');
    paras.forEach(p => {
      // Skip empty nodes
      if (!p.textContent.trim()) return;

      // Mark as interactive without changing structure
      p.classList.add('product-desc');
      p.setAttribute('role', 'button');
      p.setAttribute('tabindex', '0');
      p.setAttribute('aria-expanded', 'false');
      p.title = 'Click to expand';

      const toggle = () => {
        const expanded = p.classList.toggle('is-expanded');
        p.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        p.title = expanded ? 'Click to collapse' : 'Click to expand';
      };

      p.addEventListener('click', toggle);
      p.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
      });
    });
  });

  // Collapsible payment steps (Payment modal)
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.pay-steps.collapsible .steps-summary').forEach((btn) => {
      const box = btn.closest('.pay-steps.collapsible');
      if (!box) return;
      const toggle = () => {
        const open = box.classList.toggle('is-expanded');
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      };
      btn.addEventListener('click', toggle);
      btn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
      });
    });
  });

})();

const __mp_map = { "Crunchyroll 1M Shared (Auto)": "crunchyroll", "Crunchyroll 1M Personal (Auto)": "crunchyroll", "Crunchyroll Premium": "crunchyroll", "YouTube Premium": "youtube", "Spotify Premium": "spotify", "Surfshark VPN": "surfshark", "Netflix Personal": "netflix", "Prime": "prime-video", "Disney+ Profile": "disney-plus", "HBO Profile": "hbo", "Telegram Premium": "telegram-premium", "ChatGPT": "chatgpt", "Google AI Gemini + VEO3": "gemini-veo3", "Free Fire UC Top-up": "free-fire" };

// [mp] homepage route buy to product pages
document.addEventListener('DOMContentLoaded', () => {
  const map = __mp_map;
  document.querySelectorAll('.buy-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const name = btn.dataset.name || btn.textContent.trim();
      if (map[name]) {
        e.preventDefault();
        let href = './products/' + map[name] + '.html';
        // preselect crunchyroll auto plans based on source button
        if (name === 'Crunchyroll 1M Shared (Auto)') href += '?pre=1m_auto_shared';
        if (name === 'Crunchyroll 1M Personal (Auto)') href += '?pre=1m_auto_personal';
        location.href = href;
      }
    }, { once: true });
  });
});


// [mp] product page binder
document.addEventListener('DOMContentLoaded', () => {
  const wrap = document.querySelector('[data-page="product"]');
  if (!wrap) return;
  // Late override via attribute on the product root (data-sheet-url)
  try {
    const attrU = wrap.getAttribute('data-sheet-url');
    const fromQ = new URLSearchParams(location.search).get('sheet');
    // Give priority to explicit ?sheet= override; fallback to attribute when query missing
    if (!fromQ && attrU) window.PRICING_SHEET_URL = attrU;
  } catch (_) { }
  const name = wrap.getAttribute('data-product') || 'Product';
  const plansWrap = document.getElementById('pPlans');
  const qtyInput = document.getElementById('pQty');
  const unitEl = document.getElementById('pUnit');
  const totalEl = document.getElementById('pTotal');

  let unit = 0;
  // Always recalc using the currently active plan chip's data-price to avoid stale unit values
  function recalc() {
    const q = Math.max(1, parseInt((qtyInput?.value || '1'), 10));
    let p = unit;
    const active = plansWrap?.querySelector('.chip--plan.active, .chip.active');
    if (active) {
      p = parseInt(active.dataset.price || '0', 10) || 0;
    }
    if (unitEl && p) unitEl.textContent = '৳' + p;
    if (totalEl) totalEl.textContent = '৳' + (p * q);
  }

  // Bind only if modern plan chips are NOT present; otherwise, Sleek Pack binder below will handle
  if (plansWrap && !plansWrap.querySelector('.chip--plan')) {
    plansWrap.querySelectorAll('.chip')?.forEach((chip, idx) => {
      if (idx === 0) { chip.classList.add('active'); chip.setAttribute('aria-selected', 'true'); }
      if (idx === 0) { unit = parseInt(chip.dataset.price || '0', 10); unitEl.textContent = '৳' + unit; recalc(); }
      chip.addEventListener('click', () => {
        plansWrap.querySelectorAll('.chip').forEach(c => { c.classList.remove('active'); c.setAttribute('aria-selected', 'false'); });
        chip.classList.add('active'); chip.setAttribute('aria-selected', 'true');
        unit = parseInt(chip.dataset.price || '0', 10);
        recalc();
      });
    });
  }

  // preselect via ?pre=
  const pre = new URLSearchParams(location.search).get('pre');
  if (pre) {
    const target = plansWrap.querySelector(`.chip[data-id="${pre}"]`);
    if (target) { target.click(); }
  }

  // Quantity controls: only +/- buttons change value; input clamps on input/change/blur
  const clampQty = () => {
    const v = Math.max(1, parseInt(qtyInput?.value || '1', 10) || 1);
    if (qtyInput) qtyInput.value = String(v);
    recalc();
  };
  document.getElementById('pQtyMinus')?.addEventListener('click', () => {
    const v = Math.max(1, (parseInt(qtyInput?.value || '1', 10) - 1));
    if (qtyInput) qtyInput.value = String(v);
    recalc();
  });
  document.getElementById('pQtyPlus')?.addEventListener('click', () => {
    const v = (parseInt(qtyInput?.value || '1', 10) + 1);
    if (qtyInput) qtyInput.value = String(v);
    recalc();
  });
  qtyInput?.addEventListener('input', clampQty);
  qtyInput?.addEventListener('change', clampQty);
  qtyInput?.addEventListener('blur', clampQty);
  // Prevent mouse wheel from changing the input unintentionally
  qtyInput?.addEventListener('wheel', (e) => {
    e.preventDefault();
  }, { passive: false });

  // Defensive: Event delegation to guarantee selection + price update
  if (plansWrap) {
    plansWrap.addEventListener('click', (e) => {
      const btn = e.target.closest('.chip, .chip--plan, button.chip--plan, button.chip');
      if (!btn || btn.disabled || btn.getAttribute('aria-disabled') === 'true') return;
      // toggle active state
      plansWrap.querySelectorAll('.chip--plan, .chip').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
      btn.classList.add('active'); btn.setAttribute('aria-selected', 'true');
      // update unit and total
      const p = parseInt(btn.dataset.price || '0', 10) || 0;
      unit = p;
      recalc();
    });
    plansWrap.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const btn = e.target.closest('.chip, .chip--plan, button.chip--plan, button.chip');
      if (!btn) return;
      e.preventDefault();
      btn.click();
    });
  }

  // Defensive sync: if user clicks elsewhere on the product page, recompute totals from active plan
  document.addEventListener('click', (ev) => {
    if (!wrap) return;
    if (plansWrap && plansWrap.contains(ev.target)) return; // plan clicks already handled
    try { recalc(); } catch (_) { }
  });

  // Load dynamic pricing from Google Sheet and update chips with data-sku
  (async () => {
    if (!plansWrap) return;
    const anySku = plansWrap.querySelector('[data-sku]');
    if (!anySku) return;
    const chips = plansWrap.querySelectorAll('.chip');
    // show loading state via full-screen loader + disable controls
    const payBtn = document.getElementById('pPayNow');
    window.loaderInc && window.loaderInc('Updating price…');
    chips.forEach(chip => {
      try { chip.disabled = true; } catch (_) { }
      chip.setAttribute('aria-disabled', 'true');
      chip.style.opacity = '0.7';
    });
    if (payBtn) { payBtn.disabled = true; payBtn.setAttribute('aria-disabled', 'true'); }
    const resolvedUrl = (window.PRICING_SHEET_URL || PRICING_SHEET_URL);
    console.debug('[sheet] resolving pricing from', resolvedUrl);
    let map = await fetchPricingMap(resolvedUrl);
    if (!map || Object.keys(map).length === 0) {
      // try local fallbacks
      for (const u of SHEET_FALLBACKS) {
        try { const m2 = await fetchPricingMap(u); if (m2 && Object.keys(m2).length) { map = m2; break; } } catch (_) { }
      }
    }
    // Build a normalized-key map for resilient matching (ignore spaces, dashes, case)
    const norm = (s) => (String(s || '')).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    const normMap = {};
    Object.keys(map || {}).forEach(k => { normMap[norm(k)] = map[k]; });

    const wantedSkus = Array.from(chips).map(c => c.dataset.sku).filter(Boolean);
    console.debug('[sheet] loaded keys:', Object.keys(map || {}).slice(0, 20), '… total =', Object.keys(map || {}).length);
    console.debug('[sheet] looking for skus:', wantedSkus);

    let firstSet = false;
    let updatedCnt = 0;
    chips.forEach((chip, idx) => {
      const sku = chip.dataset.sku;
      if (!sku) return;
      let p = map[sku];
      if (!(typeof p === 'number' && p > 0)) {
        // try normalized match
        p = normMap[norm(sku)];
      }
      if (!(typeof p === 'number' && p > 0) && /^cr_/.test(String(sku))) {
        // common alias: cr_foo -> crunchyroll_foo
        const alt = 'crunchyroll_' + String(sku).slice(3);
        p = map[alt] || normMap[norm(alt)];
      }
      if (typeof p === 'number' && p > 0) {
        chip.dataset.price = String(p);
        const priceEl = chip.querySelector('small.price');
        if (priceEl) priceEl.textContent = '৳' + p;
        if (!firstSet && idx === 0) { firstSet = true; }
        updatedCnt++;
      }
    });
    // update visible prices (no per-chip spinner)
    chips.forEach((chip) => {
      const priceEl = chip.querySelector('small.price');
      const p = parseInt(chip.dataset.price || '0', 10) || 0;
      if (priceEl && p) priceEl.textContent = '৳' + p;
    });
    if (updatedCnt === 0) {
      // Help user identify mismatch quickly
      try { toast('No matching SKUs found in sheet. Check sku column vs page skus.', { type: 'error', duration: 3500 }); } catch (_) { }
      console.warn('[sheet] no matching SKUs among:', wantedSkus);
    }
    // refresh using active chip (or first)
    let active = plansWrap.querySelector('.chip.active, .chip--plan.active');
    if (!active) { active = plansWrap.querySelector('.chip, .chip--plan'); if (active) active.classList.add('active'); }
    if (active) {
      unit = parseInt(active.dataset.price || '0', 10) || 0;
      recalc();
    }
    // clear loading state + notify
    chips.forEach(chip => {
      try { chip.disabled = false; } catch (_) { }
      chip.removeAttribute('aria-disabled');
      chip.style.opacity = '';
    });
    if (payBtn) { payBtn.disabled = false; payBtn.removeAttribute('aria-disabled'); }
    const got = Object.keys(map || {}).length;
    console.debug(got > 0 ? '[sheet] pricing loaded' : '[sheet] no pricing map found', got, resolvedUrl);
    window.loaderDec && window.loaderDec();
  })();

  // Load availability (In Stock / Low Stock / Stock Out) from the sheet
  (async () => {
    try {
      // Helper: slug for key lookup (e.g., "ChatGPT" -> "chatgpt")
      const slug = (name || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
      if (!slug) return;

      const ensureBadge = () => {
        let el = document.getElementById('pAvail');
        if (el) return el;
        const row = document.querySelector('.price-row');
        if (!row) return null;
        el = document.createElement('span');
        el.id = 'pAvail';
        el.className = 'avail';
        el.textContent = '';
        row.appendChild(el);
        return el;
      };

      const apply = (status) => {
        const el = ensureBadge();
        if (!el) return;
        const raw = String(status || '').trim();
        const s = raw.toLowerCase();
        let cls = 'in';
        if (/(out|oos|stock\s*out|unavailable|sold)/.test(s)) { cls = 'oos'; }
        else if (/(low|few|limited|running\s*low)/.test(s)) { cls = 'low'; }
        else if (/(in|available|yes|true|ok)/.test(s)) { cls = 'in'; }
        // Update classes
        el.classList.remove('in', 'low', 'oos');
        el.classList.add(cls);
        // Show exactly what the sheet says (fallback to a sensible default)
        el.textContent = raw || (cls === 'oos' ? 'Stock Out' : cls === 'low' ? 'Low Stock' : 'In Stock');
        // Optionally toggle Pay button
        const payBtn = document.getElementById('pPayNow');
        if (payBtn) {
          const disable = (cls === 'oos');
          payBtn.disabled = disable;
          if (disable) payBtn.setAttribute('aria-disabled', 'true'); else payBtn.removeAttribute('aria-disabled');
        }
      };

      window.loaderInc && window.loaderInc('Updating availability…');
      let map = await (window.fetchSheetKeyValue ? window.fetchSheetKeyValue(window.PRICING_SHEET_URL || PRICING_SHEET_URL) : Promise.resolve({}));
      if (!map || Object.keys(map).length === 0) {
        for (const u of SHEET_FALLBACKS) {
          try { const m2 = await window.fetchSheetKeyValue(u); if (m2 && Object.keys(m2).length) { map = m2; break; } } catch (_) { }
        }
      }
      const key1 = slug + '_stock';
      const key2 = slug + '_status';
      const base = slug.split('_')[0];
      const key3 = base + '_stock';
      const key4 = base + '_status';
      // Also allow global simple keys if user prefers just 'stock'
      const status = map[key1] || map[key2] || map[key3] || map[key4] || map['stock'] || map['availability'] || '';
      if (status) apply(status);
      window.loaderDec && window.loaderDec();
    } catch (e) {
      console.debug('[sheet] availability load skipped', e);
      window.loaderDec && window.loaderDec();
    }
  })();

  // Load dynamic content for ChatGPT product description from the same sheet
  (async () => {
    if (!/chatgpt/i.test(name)) return;
    const about = document.getElementById('aboutService');
    const shared = document.getElementById('guideShared');
    const personal = document.getElementById('guidePersonal');
    if (!about && !shared && !personal) return;
    try {
      window.loaderInc && window.loaderInc('Updating content…');
      let used = 'remote';
      let map = await (window.fetchSheetKeyValue ? window.fetchSheetKeyValue(window.PRICING_SHEET_URL || PRICING_SHEET_URL) : Promise.resolve({}));
      console.debug('[sheet] content keys available:', Object.keys(map || {}));
      if (!map || Object.keys(map).length === 0) {
        for (const u of SHEET_FALLBACKS) {
          try { const m2 = await window.fetchSheetKeyValue(u); if (m2 && Object.keys(m2).length) { map = m2; used = u; break; } } catch (_) { }
        }
      }
      const a = map['chatgpt_about'];
      const s = map['chatgpt_shared_guide'];
      const p = map['chatgpt_personal_guide'];
      // If none of the specific keys exist and we haven't tried fallbacks yet, try them now
      if (!(a || s || p) && used === 'remote') {
        for (const u of SHEET_FALLBACKS) {
          try {
            const m2 = await window.fetchSheetKeyValue(u);
            if (m2 && (m2['chatgpt_about'] || m2['chatgpt_shared_guide'] || m2['chatgpt_personal_guide'])) { map = m2; break; }
          } catch (_) { }
        }
      }
      if (a && about) {
        // Allow simple HTML; sanitize by removing script tags
        about.innerHTML = String(a).replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
      }
      if (s && shared) {
        const body = shared.querySelector('.guide-body');
        if (body) body.innerHTML = String(s).replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
      }
      if (p && personal) {
        const body = personal.querySelector('.guide-body');
        if (body) body.innerHTML = String(p).replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
      }
      if (!(a || s || p)) { console.warn('[sheet] no chatgpt_* content keys found in sheet', PRICING_SHEET_URL, 'or fallbacks'); }
      window.loaderDec && window.loaderDec();
    } catch (e) {
      console.warn('Content load failed', e);
      window.loaderDec && window.loaderDec();
    }
  })();

  // Load generic product content (about + shared/personal guides) from the same sheet
  (async () => {
    try {
      const aboutEl = document.getElementById('pAbout');
      const gSharedEl = document.getElementById('pGuideShared');
      const gPersonalEl = document.getElementById('pGuidePersonal');
      if (!aboutEl && !gSharedEl && !gPersonalEl) return;

      const slug = (name || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
      if (!slug) return;
      const brand = slug.split('_')[0];
      const resolvedUrl = (window.PRICING_SHEET_URL || PRICING_SHEET_URL);

      let map = await (window.fetchSheetKeyValue ? window.fetchSheetKeyValue(resolvedUrl) : Promise.resolve({}));
      if (!map || Object.keys(map).length === 0) {
        for (const u of SHEET_FALLBACKS) {
          try { const m2 = await window.fetchSheetKeyValue(u); if (m2 && Object.keys(m2).length) { map = m2; break; } } catch (_) { }
        }
      }
      const lower = Object.keys(map || {}).reduce((acc, k) => { acc[String(k).toLowerCase()] = map[k]; return acc; }, {});
      const get = (...keys) => { for (const k of keys) { const v = lower[String(k).toLowerCase()]; if (v) return v; } return ''; };
      const sanitize = (s) => String(s || '').replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

      const about = get(`${slug}_about`, `${brand}_about`, 'about');
      const guideShared = get(`${slug}_shared_guide`, `${brand}_shared_guide`, 'shared_guide');
      const guidePersonal = get(`${slug}_personal_guide`, `${brand}_personal_guide`, 'personal_guide');

      if (aboutEl && about) aboutEl.innerHTML = sanitize(about);
      if (gSharedEl && guideShared) gSharedEl.innerHTML = sanitize(guideShared);
      if (gPersonalEl && guidePersonal) gPersonalEl.innerHTML = sanitize(guidePersonal);

      console.debug('[sheet] generic content', { slug, about: !!about, shared: !!guideShared, personal: !!guidePersonal });
    } catch (e) {
      console.warn('Generic content load failed', e);
    }
  })();

  document.getElementById('pPayNow')?.addEventListener('click', () => {
    // Product name (fallback if not present)
    const nameAttr = document.querySelector('[data-product]')?.dataset.product || '';
    const name = nameAttr || window.pageTitle || 'Product';

    // Quantity input element from your page
    const qtyInput = document.getElementById('pQty') || document.getElementById('qty') || { value: '1' };
    const qty = Math.max(1, parseInt(qtyInput.value || '1', 10));

    // ---------- FREE FIRE: special flow ----------
    if (/free\s*fire/i.test(name)) {
      const uid = (document.getElementById('ffUid')?.value || '').trim();

      // find active diamond chip (supports both .chip and .chip--plan)
      const ffActive =
        document.querySelector('#ffDiamonds .chip.active, #ffDiamonds .chip--plan.active') ||
        document.querySelector('#pPlans .chip.active, #pPlans .chip--plan.active');

      if (!ffActive) { alert('একটি প্যাক সিলেক্ট করুন'); return; }

      const uc = ffActive.dataset.uc || '';
      const price = parseInt(ffActive.dataset.price || '0', 10);
      const label = (ffActive.dataset.label || ffActive.textContent.split(' • ')[0] || 'Pack').trim();

      const qs = new URLSearchParams({
        product: 'Free Fire UC Top-up',
        plan: label,                // what pay.html reads as visible plan label
        mode: 'freefire',
        uc: uc,
        uid: uid,
        price: String(price),
        qty: String(qty)
      });
      // 🔁 Always go to root /pay.html so it works from /products/ too
      window.location.href = '/pay.html?' + qs.toString();
      return;
    }

    const sel = plansWrap.querySelector('.chip.active, .chip--plan.active');
    if (!sel) { alert('একটি প্ল্যান সিলেক্ট করুন'); return; }

    const planId = sel.dataset.id || '';
    const planLabel = (sel.dataset.label || sel.textContent.split(' • ')[0] || 'Plan').trim();
    const price = parseInt(sel.dataset.price || '0', 10);
    const mode = sel.dataset.mode || 'manual';
    const service = sel.dataset.service || '';
    const productKey = sel.dataset.productkey || sel.dataset.productKey || '';

    const qs = new URLSearchParams({
      product: name,
      planId,
      plan: planLabel,           // ensure pay.html can read visible label
      price: String(price),
      qty: String(qty),
      mode
    });

    if (service) qs.set('service', service);
    if (productKey) { qs.set('productkey', productKey); qs.set('productKey', productKey); } // set both just in case

    window.location.href = './pay.html?' + qs.toString();
  });


  // Free Fire diamonds render (if present)
  const ffWrap = document.getElementById('ffDiamonds');
  if (ffWrap) {
    const PRICES = { 20: 25, 36: 45, 80: 83, 160: 160, 161: 160, 405: 400, 800: 800, 810: 800, 1625: 1600 };
    const LABELS = { 20: '25 Diamond', 36: '50 Diamond', 80: '115 Diamond', 160: '240 Diamond', 161: 'Weekly Membership', 405: '610 Diamond', 800: 'Monthly Membership', 810: '1240 Diamond', 1625: '2530 Diamond' };
    ffWrap.innerHTML = '';
    Object.keys(PRICES).sort((a, b) => parseInt(a) - parseInt(b)).forEach(k => {
      const uc = parseInt(k, 10), price = PRICES[k], lab = LABELS[uc] || (uc + ' UC');
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'chip'; b.dataset.uc = String(uc); b.dataset.price = String(price);
      b.textContent = lab + ' • ৳' + price;
      b.addEventListener('click', () => {
        ffWrap.querySelectorAll('.chip').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
      });
      ffWrap.appendChild(b);
    });
    ffWrap.querySelector('button')?.classList.add('active');
  }
});


// [mp] pay-page proceed handler
document.addEventListener('DOMContentLoaded', () => {
  if (!document.querySelector('[data-page="pay"]')) return;
  const qs = new URLSearchParams(location.search);
  const name = qs.get('product') || 'Product';
  const planLabel = qs.get('planLabel') || '';
  const qty = parseInt(qs.get('qty') || '1', 10);
  const unit = parseInt(qs.get('price') || '0', 10);
  const total = unit * (qty || 1);
  const titleEl = document.getElementById('payTitle');
  if (titleEl) titleEl.textContent = name + (planLabel ? (' • ' + planLabel) : '');
  const totalEl = document.getElementById('payTotal'); if (totalEl) totalEl.textContent = '৳' + total;

  // collapsible steps toggle
  document.querySelectorAll('.pay-steps.collapsible .steps-summary').forEach((btn) => {
    const box = btn.closest('.pay-steps.collapsible');
    const toggle = () => {
      const open = box.classList.toggle('is-expanded');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    };
    btn.addEventListener('click', toggle);
  });

  // Preserve context for WhatsApp
  if (window.state) { state.productName = name; state.planLabel = planLabel; state.unitPrice = unit; state.qty = qty; }
  if (window.state) { state.mode = qs.get('mode') || 'manual'; state.serviceKey = qs.get('service') || ''; state.ff = { uid: (qs.get('uid') || ''), uc: parseInt(qs.get('uc') || '0', 10) }; }

  const panel = document.getElementById('resultPanel');
  const setPanel = (html) => { if (panel) panel.innerHTML = html; };

  document.getElementById('payProceed')?.addEventListener('click', async (e) => {
    e.preventDefault();
    const trx = (document.getElementById('payTrxID')?.value || "").trim();
    if (!trx) { toast("Please enter TrxID."); return; }
    state.contactPhone = (document.getElementById('paySenderNum')?.value || "").trim();
    state.lastStatus = 'Pending';
    setPanel('<div class="muted">Processing…</div>');

    const contactQuery = `&contact_email=${encodeURIComponent(state.contactEmail || "")}&phone=${encodeURIComponent(state.contactPhone || "")}&t=${Date.now()}`;

    try {
      if (state.mode === 'auto-cr') {
        const url = `${GAS_URL}?trxid=${encodeURIComponent(trx)}&service=${encodeURIComponent(state.serviceKey)}${contactQuery}`;
        const res = await fetch(url); const data = await res.json().catch(() => null);
        const hasCreds = !!(data && data.account && (data.account.mail || data.account.pass));
        const ok = !!(data && data.success === true && hasCreds);
        state.lastStatus = ok ? 'Paid' : 'Failed';
        if (ok) {
          setPanel(`<div style="font-weight:700;margin-bottom:8px;">✅ Delivered</div>`);
          renderCredentials(panel, data.account || {}, state.serviceKey);
        } else {
          setPanel(`<div style="font-weight:700;color:#ff5c7c;margin-bottom:8px;">❌ Delivery failed</div><div class="muted">${(data && data.message) || "Invalid TrxID or service unavailable"}</div>`);
        }
        const row = document.createElement('div'); row.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;";
        const btnWA = document.createElement('button'); btnWA.className = "btn"; btnWA.textContent = "Contact WhatsApp";
        btnWA.addEventListener('click', () => openWhatsApp(trx, { status: state.lastStatus }));
        row.appendChild(btnWA); panel.appendChild(row);
        return;
      }

      if (state.mode === 'freefire') {
        const uid = (state.ff && state.ff.uid) || "";
        const uc = (state.ff && state.ff.uc) || 0;
        if (!uid || !uc) {
          state.lastStatus = "Pending";
          setPanel('<div class="muted">UID or Pack not provided. We will assist you on WhatsApp.</div>');
          openWhatsApp(trx, { status: "Pending" });
          return;
        }
        const url = `${GAS_URL}?action=freefire_topup&trxid=${encodeURIComponent(trx)}&uid=${encodeURIComponent(uid)}&uc=${encodeURIComponent(uc)}${contactQuery}`;
        const res = await fetch(url); const data = await res.json().catch(() => null);
        const looksOk = !!(data && data.success === true && (data.ign || data.amount));
        state.lastStatus = looksOk ? 'Paid' : 'Failed';
        if (looksOk) {
          setPanel(`<div style="font-weight:700;margin-bottom:4px;">✅ Top-up successful</div>
            <div><strong>IGN:</strong> ${data.ign || "-"}</div>
            <div><strong>Pack:</strong> ${data.amount || uc}</div>`);
        } else {
          setPanel(`<div style="font-weight:700;color:#ff5c7c;margin-bottom:4px;">❌ Top-up failed</div>
            <div class="muted">${(data && data.message) || "Invalid TrxID or service unavailable"}</div>`);
        }
        const row = document.createElement('div'); row.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;";
        const btnWA = document.createElement('button'); btnWA.className = "btn"; btnWA.textContent = "Contact WhatsApp";
        btnWA.addEventListener('click', () => openWhatsApp(trx, { status: state.lastStatus }));
        row.appendChild(btnWA); panel.appendChild(row);
        return;
      }

      // manual verify
      const productKey = (new URLSearchParams(location.search)).get('productKey') || '';
      const url = `${GAS_URL}?action=verify_only&trxid=${encodeURIComponent(trx)}&product=${encodeURIComponent(productKey)}${contactQuery}`;
      const res = await fetch(url); const data = await res.json().catch(() => null);
      state.lastStatus = (data && data.success === true) ? 'Paid' : 'Failed';
      if (data && data.success === true) {
        setPanel(`<div style="font-weight:700;margin-bottom:6px;">✅ Payment verified</div><div class="muted">Click below to request your account now.</div>`);
        const row = document.createElement('div'); row.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;";
        const btnWA = document.createElement('button'); btnWA.className = "btn btn-primary"; btnWA.textContent = "Get Account on WhatsApp";
        btnWA.addEventListener('click', () => openWhatsApp(trx, { status: "Paid" }));
        row.appendChild(btnWA); panel.appendChild(row);
      } else {
        setPanel(`<div style="font-weight:700;color:#ff5c7c;margin-bottom:6px;">❌ Verification failed</div><div class="muted">${(data && data.message) || "Invalid TrxID"}</div>`);
        const row = document.createElement('div'); row.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;";
        const btnWA = document.createElement('button'); btnWA.className = "btn"; btnWA.textContent = "Contact WhatsApp";
        btnWA.addEventListener('click', () => openWhatsApp(trx, { status: "Failed" }));
        row.appendChild(btnWA); panel.appendChild(row);
      }
    } catch (err) {
      setPanel(`<div style="font-weight:700;color:#ff5c7c;margin-bottom:6px;">❌ Network error</div><div class="muted">${String(err)}</div>`);
      const row = document.createElement('div'); row.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;";
      const btnWA = document.createElement('button'); btnWA.className = "btn"; btnWA.textContent = "Contact WhatsApp";
      btnWA.addEventListener('click', () => openWhatsApp('', { status: "Pending" }));
      row.appendChild(btnWA); panel.appendChild(row);
    }
  });
  /* === Sleek Pack JS (safe add-on) === */
  /* === Sleek Pack JS (visual toggle helper) === */
  document.addEventListener('DOMContentLoaded', () => {
    // Product page plan selection
    const page = document.querySelector('[data-page="product"]');
    if (page) {
      const plansWrap = document.getElementById('pPlans');
      const unitEl = document.getElementById('pUnit');
      const totalEl = document.getElementById('pTotal');
      const qtyInput = document.getElementById('pQty');

      const activate = (btn) => {
        plansWrap.querySelectorAll('.chip--plan, .chip').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
        btn.classList.add('active'); btn.setAttribute('aria-selected', 'true');
        // determine current unit price from the button itself (no external state)
        const p = parseInt(btn.dataset.price || '0', 10) || 0;
        const q = Math.max(1, parseInt(qtyInput?.value || '1', 10));
        if (unitEl) unitEl.textContent = '৳' + p;
        if (totalEl) totalEl.textContent = '৳' + (p * q);
      };

      plansWrap?.querySelectorAll('button').forEach((btn, idx) => {
        if (!btn.classList.contains('chip--plan')) btn.classList.add('chip--plan');
        btn.addEventListener('click', () => activate(btn));
        if (idx === 0) activate(btn);
      });

      qtyInput?.addEventListener('input', () => {
        // do not change selection, just recalc with current active chip
        const q = Math.max(1, parseInt(qtyInput?.value || '1', 10));
        const act = plansWrap?.querySelector('.chip--plan.active, .chip.active');
        const p = act ? (parseInt(act.dataset.price || '0', 10) || 0) : unit;
        if (unitEl) unitEl.textContent = '৳' + p;
        if (totalEl) totalEl.textContent = '৳' + (p * q);
      });
    }

    // Pay page payment cards → mirror your .pay-btn logic
    const payWrap = document.querySelector('.pay-cards');
    if (payWrap) {
      payWrap.addEventListener('click', (e) => {
        const card = e.target.closest('.pay-card'); if (!card) return;
        payWrap.querySelectorAll('.pay-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        const method = card.dataset.method;
        document.querySelector(`.pay-btn[data-method="${method}"]`)?.click();
      });
    }
  });


});
