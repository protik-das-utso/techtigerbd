(function initSharedOtherProductsSection() {
    if (document.querySelector('.oprod, [data-oprod-scroller], [data-other-products-mounted]')) return;

    const currentPath = normalizePath(location.pathname);
    const reviewsSection = document.querySelector('section.revs');
    const faqSection = document.querySelector('section.faq-sec, section#faq');
    const footer = document.querySelector('footer');
    const insertBefore = reviewsSection || faqSection || footer;
    if (!insertBefore || !insertBefore.parentElement) return;

    injectStyles();

    const section = document.createElement('section');
    section.className = 'opx';
    section.setAttribute('data-other-products-mounted', '1');
    section.innerHTML = `
    <div class="w">
      <div class="sh rv">
        <span class="sh-tag">More Products</span>
        <h2>Explore Other Products</h2>
        <p>Browse our other popular plans</p>
      </div>
      <div class="opx-wrap rv" data-opx-scroller aria-label="Other products auto scroller">
        <div class="opx-track" id="opxTrack"></div>
      </div>
    </div>
  `;

    insertBefore.parentElement.insertBefore(section, insertBefore);

    const track = section.querySelector('#opxTrack');
    const scroller = section.querySelector('[data-opx-scroller]');
    if (!track || !scroller) return;

    loadItems(track, currentPath).then((loaded) => {
        if (!loaded) {
            section.remove();
            return;
        }
        initAutoScroll(scroller);
    });

    function injectStyles() {
        if (document.getElementById('opx-styles')) return;
        const style = document.createElement('style');
        style.id = 'opx-styles';
        style.textContent = `
      .opx { padding: 8px 0 10px; }
      .opx-wrap {
        overflow-x: auto;
        overflow-y: hidden;
        -ms-overflow-style: none;
        scrollbar-width: none;
        border: 1px solid var(--border);
        background: linear-gradient(180deg, var(--surface), var(--card));
        box-shadow: var(--shadow-sm);
      }
      .opx-wrap::-webkit-scrollbar { display: none; }
      .opx-track {
        display: flex;
        align-items: stretch;
        gap: 12px;
        width: max-content;
        padding: 12px;
      }
      .opx-card {
        min-width: 190px;
        width: 190px;
        border: 1px solid var(--border-b);
        background: var(--bg);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        transition: transform var(--t), border-color var(--t), box-shadow var(--t), background var(--t);
      }
      .opx-card:hover {
        transform: translateY(-2px);
        border-color: rgba(0, 229, 255, .45);
        box-shadow: var(--shadow-sm);
        background: var(--card);
      }
      .opx-media {
        display: block;
        aspect-ratio: 1/1;
        background: var(--surface);
        border-bottom: 1px solid var(--border);
        overflow: hidden;
      }
      .opx-media img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform var(--t);
      }
      .opx-card:hover .opx-media img { transform: scale(1.04); }
      .opx-body {
        padding: 10px 10px 0;
        display: grid;
        gap: 8px;
      }
      .opx-name {
        color: var(--text);
        font-size: 13px;
        font-weight: 700;
        letter-spacing: .01em;
        line-height: 1.25;
        min-height: 32px;
      }
      .opx-buy {
        margin: 0 10px 10px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 9px 10px;
        border: 1px solid var(--border-b);
        background: var(--surface);
        color: var(--text);
        text-decoration: none;
        font-weight: 700;
        letter-spacing: .04em;
        transition: border-color var(--t), background var(--t), color var(--t);
      }
      .opx-buy:hover {
        border-color: rgba(0, 229, 255, .45);
        background: rgba(0, 229, 255, .08);
        color: var(--accent);
        text-decoration: none;
      }
      @media (max-width: 780px) {
        .opx-card { min-width: 160px; width: 160px; }
        .opx-buy { padding: 8px 9px; font-size: 12px; }
      }
    `;
        document.head.appendChild(style);
    }

    function normalizePath(value) {
        if (!value) return '/';
        try {
            const parsed = new URL(String(value), location.origin);
            return parsed.pathname.replace(/\/+$/, '') + '/';
        } catch (error) {
            return String(value).replace(/^https?:\/\/[^/]+/i, '').replace(/\/+$/, '') + '/';
        }
    }

    async function loadItems(mount, activePath) {
        try {
            const response = await fetch('/component/products.json', { cache: 'no-store' });
            if (!response.ok) return false;

            const data = await response.json();
            if (!data || !Array.isArray(data.items) || data.items.length === 0) return false;

            const items = data.items.filter((item) => normalizePath(item.link) !== activePath);
            if (items.length === 0) return false;

            mount.innerHTML = '';

            items.forEach((item) => {
                const card = document.createElement('article');
                card.className = 'opx-card';

                const media = document.createElement('a');
                media.className = 'opx-media';
                media.href = String(item.link || '/');

                const img = document.createElement('img');
                img.src = String(item.image || '');
                img.alt = String(item.name || 'Product');
                img.loading = 'lazy';
                media.appendChild(img);

                const body = document.createElement('div');
                body.className = 'opx-body';
                const name = document.createElement('div');
                name.className = 'opx-name';
                name.textContent = String(item.name || 'Product');
                body.appendChild(name);

                const cta = document.createElement('a');
                cta.className = 'opx-buy';
                cta.href = String(item.link || '/');
                cta.textContent = String(item.cta || 'BUY NOW');

                card.appendChild(media);
                card.appendChild(body);
                card.appendChild(cta);
                mount.appendChild(card);
            });

            return true;
        } catch (error) {
            return false;
        }
    }

    function initAutoScroll(scroller) {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        let direction = 1;
        let rafId = null;
        const speed = 0.55;

        const tick = () => {
            const max = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
            if (max > 0) {
                scroller.scrollLeft += direction * speed;
                if (scroller.scrollLeft >= max) {
                    scroller.scrollLeft = max;
                    direction = -1;
                } else if (scroller.scrollLeft <= 0) {
                    scroller.scrollLeft = 0;
                    direction = 1;
                }
            }
            rafId = requestAnimationFrame(tick);
        };

        const start = () => { if (!rafId) rafId = requestAnimationFrame(tick); };
        const stop = () => {
            if (!rafId) return;
            cancelAnimationFrame(rafId);
            rafId = null;
        };

        scroller.addEventListener('mouseenter', stop);
        scroller.addEventListener('mouseleave', start);
        scroller.addEventListener('touchstart', stop, { passive: true });
        scroller.addEventListener('touchend', start, { passive: true });

        addEventListener('resize', () => {
            const max = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
            if (scroller.scrollLeft > max) scroller.scrollLeft = max;
        });

        start();
    }
})();
