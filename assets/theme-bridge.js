/*
 * ============================================================
 *  theme-bridge.js — Tech Tiger BD (2026 redesign)
 *  Companion to theme-bridge.css. On legacy pages it:
 *   - applies light-default theme (persisted in localStorage)
 *   - sets a per-page accent color (data-accent on <html>)
 *   - injects a floating light/dark toggle
 *  Load with `defer`. Safe to include once per page.
 * ============================================================
 */
(function () {
  'use strict';
  var root = document.documentElement;

  /* ── THEME (light default) ── */
  try {
    var stored = localStorage.getItem('ttbd-theme');
    root.setAttribute('data-theme', stored === 'dark' ? 'dark' : 'light');
  } catch (e) {
    root.setAttribute('data-theme', 'light');
  }

  /* ── ACCENT BY CATEGORY ── */
  // Map product path → category accent. Falls back to violet.
  var ACCENT_BY_PATH = {
    'chatgpt': 'ai', 'claude-pro': 'ai', 'perplexity': 'ai', 'grammarly': 'ai',
    'stealthwriter': 'ai', 'gemini-veo3': 'ai',
    'netflix': 'streaming', 'youtube': 'streaming', 'prime-video': 'streaming',
    'disney-plus': 'streaming', 'hbo': 'streaming', 'crunchyroll': 'streaming',
    'spotify': 'music',
    'canva-pro': 'creative', 'capcut': 'creative',
    'surfshark': 'vpn',
    'telegram-premium': 'messaging',
    'free-fire': 'gaming'
  };

  if (!root.getAttribute('data-accent')) {
    var path = location.pathname.toLowerCase();
    var accent = '';
    for (var key in ACCENT_BY_PATH) {
      if (path.indexOf(key) !== -1) { accent = ACCENT_BY_PATH[key]; break; }
    }
    if (accent) root.setAttribute('data-accent', accent);
  }

  /* ── INJECT FLOATING THEME TOGGLE ── */
  function injectToggle() {
    if (document.getElementById('ttbdThemeToggle')) return;
    var btn = document.createElement('button');
    btn.id = 'ttbdThemeToggle';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Toggle dark mode');
    btn.innerHTML =
      '<svg class="moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>' +
      '<svg class="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>';
    btn.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('ttbd-theme', next); } catch (e) {}
    });
    document.body.appendChild(btn);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectToggle);
  } else {
    injectToggle();
  }
})();

/* Infinite seamless auto-scroll for the "Explore Other Products" row (.rp-track).
   Items are cloned once so the row loops forever with no visible stop/reset. */
(function () {
  function init(track) {
    var items = Array.prototype.slice.call(track.children);
    if (!items.length) return;
    if (track.scrollWidth - track.clientWidth < 12) return; // not enough to scroll
    // duplicate the set so scrolling can wrap seamlessly
    items.forEach(function (el) { track.appendChild(el.cloneNode(true)); });
    var loopWidth = track.children[items.length].offsetLeft - items[0].offsetLeft; // width of one full set
    track.style.scrollBehavior = 'auto';
    var speed = 0.5, paused = false;
    function loop() {
      if (!paused) {
        track.scrollLeft += speed;
        if (track.scrollLeft >= loopWidth) track.scrollLeft -= loopWidth; // seamless wrap
      }
      requestAnimationFrame(loop);
    }
    var pause = function () { paused = true; }, resume = function () { paused = false; };
    track.addEventListener('mouseenter', pause);
    track.addEventListener('mouseleave', resume);
    track.addEventListener('touchstart', pause, { passive: true });
    track.addEventListener('touchend', function () { setTimeout(resume, 1500); }, { passive: true });
    requestAnimationFrame(loop);
  }
  function start() {
    try { if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return; } catch (e) {}
    document.querySelectorAll('.rp-track').forEach(init);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
