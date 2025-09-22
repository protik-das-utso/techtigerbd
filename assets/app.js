if ('serviceWorker' in navigator) { navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister())); }
(function () {
  const $ = (q, r = document) => r.querySelector(q);
  const $$ = (q, r = document) => r.querySelectorAll(q);

  // ---------- Config ----------
  const GAS_URL = "https://script.google.com/macros/s/AKfycbyLjru6Gqm9qlXUWgDYPCMaGGeEIam0OrWRguPVTGYj73eI6zyt745aZaWRLreVJmGt/exec";
  const WHATSAPP_URL = "https://wa.me/8801881738485";

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
  const toast = (msg) => {
    try {
      const t = document.createElement('div');
      t.textContent = msg;
      t.style.cssText = "position:fixed;z-index:99999;left:50%;transform:translateX(-50%);bottom:20px;background:#161821;color:#fff;padding:10px 14px;border-radius:10px;box-shadow:0 8px 30px rgba(0,0,0,.35);";
      document.body.appendChild(t);
      setTimeout(() => t.remove(), 2200);
    } catch (e) { alert(msg); }
  };

  // Year + theme
  $('#year') && ($('#year').textContent = new Date().getFullYear());
  const root = document.documentElement;
  const saved = localStorage.getItem('theme');
  if (saved) {
    root.setAttribute('data-theme', saved);
  } else {
    root.setAttribute('data-theme', 'light');
  }
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
    $('#mTitle').textContent = "Free Fire Top-up";
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
    const generic = `Hi, Contacting through ttigerbd.com\nI have a query`;
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


// [mp] product page binder - Plan selection disabled (handled by quantity-system.js)
document.addEventListener('DOMContentLoaded', () => {
  const wrap = document.querySelector('[data-page="product"]');
  if (!wrap) return;
  const name = wrap.getAttribute('data-product') || 'Product';
  const plansWrap = document.getElementById('pPlans');
  const qtyInput = document.getElementById('pQty');
  const unitEl = document.getElementById('pUnit');
  const totalEl = document.getElementById('pTotal');

  // Plan selection and quantity controls now handled by quantity-system.js
  // Removed conflicting event listeners to prevent interference

  // Keep preselect functionality for URL parameters
  const pre = new URLSearchParams(location.search).get('pre');
  if (pre) {
    const target = plansWrap?.querySelector(`.chip[data-id="${pre}"]`);
    if (target) {
      // Delay to ensure quantity-system.js has initialized
      setTimeout(() => target.click(), 100);
    }
  }

  document.getElementById('pPayNow')?.addEventListener('click', () => {
    // Product name (fallback if not present)
    const nameAttr = document.querySelector('[data-product]')?.dataset.product || '';
    const name = nameAttr || window.pageTitle || 'Product';

    // Quantity input element from your page
    const qtyInput = document.getElementById('pQty') || document.getElementById('qty') || { value: '1' };
    const qty = Math.max(1, parseInt(qtyInput.value || '1', 10));

    // Get email input (required for YouTube and ChatGPT Personal plan)
    const emailInput = document.getElementById('pEmail');
    const email = emailInput ? emailInput.value.trim() : '';

    // Validate email based on service requirements
    if (emailInput && emailInput.hasAttribute('required') && !email) {
      alert('Please enter your email address');
      emailInput.focus();
      return;
    }

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

    // ---------- OTHER SERVICES (unchanged logic, but a bit safer) ----------
    const plansWrap =
      document.getElementById('pPlans') ||
      document.getElementById('plans') ||
      document; // fallback

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
      mode,
      contact_email: email       // Add email to URL parameters
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

  // [mp] pay-page proceed handler → redirect to delivery.html
  document.addEventListener('DOMContentLoaded', () => {
    const isPay = !!document.getElementById('payProceed');
    if (!isPay) return;

    const next = '/delivery.html';
    document.getElementById('payProceed')?.addEventListener('click', (e) => {
      e.preventDefault();
      const trx = (document.getElementById('payTrxID')?.value || '').trim();
      if (!trx) { alert('Please enter TrxID.'); return; }

      const url = new URL(location.href);
      const qs = new URLSearchParams({
        trxid: trx,
        product: url.searchParams.get('product') || 'Product',
        plan: url.searchParams.get('plan') || '',
        mode: url.searchParams.get('mode') || 'manual',
        service: url.searchParams.get('service') || '',
        productkey: url.searchParams.get('productKey') || url.searchParams.get('productkey') || '',
        price: url.searchParams.get('price') || '0',
        qty: url.searchParams.get('qty') || '1',
        uid: url.searchParams.get('uid') || '',
        uc: url.searchParams.get('uc') || '',
        contact_email: (document.getElementById('payEmail')?.value || '').trim(),
        phone: (document.getElementById('paySenderNum')?.value || '').trim()
      });

      window.location.href = next + '?' + qs.toString();
    });
  });

  /* === Sleek Pack JS (safe add-on) === */
  /* === Sleek Pack JS (visual toggle helper) === */
  document.addEventListener('DOMContentLoaded', () => {
    // Product page plan selection - Now handled by quantity-system.js
    // const page = document.querySelector('[data-page="product"]');
    // if (page) {
    //   // Plan selection logic moved to quantity-system.js to avoid conflicts
    // }

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
