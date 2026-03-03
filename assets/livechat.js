// Tawk.to Live Chat loader + bridge (site-wide)
if (!window.__TTBD_TAWK_LOADED__) {
    window.__TTBD_TAWK_LOADED__ = true;

    (function mountRelatedProductsStrip() {
        if (!document || !document.body || document.getElementById('ttbd-related-products')) return;

        const currentPath = (location.pathname || '/').replace(/\/+$/, '') || '/';
        const products = [
            { name: 'ChatGPT Plus', href: '/products/chatgpt/', logo: '/assets/brand/chatgpt.png', price: 'From ৳320' },
            { name: 'Perplexity Pro', href: '/products/perplexity/', logo: '/assets/brand/perplexity.jpg', price: 'From ৳150' },
            { name: 'YouTube Premium', href: '/products/youtube/', logo: '/assets/brand/youtube.jpg', price: 'From ৳70' },
            { name: 'Prime Video', href: '/products/prime-video/', logo: '/assets/brand/prime-video.png', price: 'From ৳50' },
            { name: 'Spotify Premium', href: '/products/spotify/', logo: '/assets/brand/spotify.png', price: 'From ৳50' },
            { name: 'Netflix', href: '/products/netflix/', logo: '/assets/brand/netflix.jpg', price: 'From ৳230' },
            { name: 'Disney Plus', href: '/products/disney-plus/', logo: '/assets/brand/disney.jpg', price: 'From ৳180' },
            { name: 'Grammarly', href: '/products/grammarly/', logo: '/assets/brand/grammarly.png', price: 'From ৳140' },
            { name: 'HBO Max', href: '/products/hbo/', logo: '/assets/brand/hbo.png', price: 'From ৳150' },
            { name: 'CapCut Pro', href: '/products/capcut/', logo: '/assets/brand/capcut.jpg', price: 'From ৳300' },
            { name: 'StealthWriter', href: '/products/stealthwriter/', logo: '/assets/brand/stealthwriter.png', price: 'From ৳200' },
            { name: 'Telegram Premium', href: '/products/telegram-premium/', logo: '/assets/brand/telegram.jpg', price: 'From ৳190' },
            { name: 'Surfshark VPN', href: '/products/surfshark/', logo: '/assets/brand/surfshark.png', price: 'From ৳180' }
        ];

        const norm = function (value) {
            const v = String(value || '').replace(/\/+$/, '') || '/';
            return v === '' ? '/' : v;
        };

        const visible = products.filter(function (item) {
            const target = norm(item.href);
            return target !== currentPath;
        });
        const items = visible.length ? visible : products;

        const section = document.createElement('section');
        section.id = 'ttbd-related-products';
        section.className = 'rp-sec';

        section.innerHTML = [
            '<div class="w">',
            '  <div class="rp-wrap">',
            '    <div class="rp-head">',
            '      <div class="rp-title">You May Need</div>',
            '      <div class="rp-sub">Scroll left ↔ right</div>',
            '    </div>',
            '    <div class="rp-track" id="rpTrack"></div>',
            '  </div>',
            '</div>'
        ].join('');

        const track = section.querySelector('#rpTrack');
        items.forEach(function (item) {
            const a = document.createElement('a');
            a.className = 'rp-item';
            a.href = item.href;
            a.innerHTML = [
                '<img class="rp-logo" loading="lazy" alt="' + item.name + '" src="' + item.logo + '">',
                '<div>',
                '  <div class="rp-name">' + item.name + '</div>',
                '  <div class="rp-meta">' + item.price + '</div>',
                '</div>'
            ].join('');
            track.appendChild(a);
        });

        const footer = document.querySelector('footer');
        if (footer && footer.parentNode) {
            footer.parentNode.insertBefore(section, footer);
        } else {
            document.body.appendChild(section);
        }
    })();

    window.Tawk_API = window.Tawk_API || {};
    window.Tawk_LoadStart = window.Tawk_LoadStart || new Date();

    (function initTTBDLiveChatBridge() {
        const bridgeQueue = [];
        let readyPollTimer = null;

        function isReady() {
            return Boolean(window.Tawk_API && typeof window.Tawk_API.maximize === 'function');
        }

        function persistFallback(item) {
            try {
                const key = 'ttbd_livechat_last_message';
                localStorage.setItem(key, JSON.stringify(item));
            } catch (_) { }
        }

        function sanitizeText(input) {
            return String(input || '').replace(/\s+/g, ' ').trim().slice(0, 1800);
        }

        function splitMessageForEvent(message, partSize) {
            const clean = sanitizeText(message || '');
            if (!clean) return [];
            const size = Math.max(120, Number(partSize) || 220);
            const parts = [];
            for (let i = 0; i < clean.length; i += size) {
                parts.push(clean.slice(i, i + size));
            }
            return parts.slice(0, 8);
        }

        function openChatWindow() {
            if (!isReady()) return;
            try {
                window.Tawk_API.maximize();
            } catch (_) {
                try {
                    window.Tawk_API.toggle();
                } catch (_) { }
            }
        }

        function openWithRetries(retryCount, intervalMs) {
            const tries = Math.max(1, Number(retryCount) || 8);
            const wait = Math.max(180, Number(intervalMs) || 350);
            let current = 0;

            function tick() {
                current++;
                if (isReady()) {
                    openChatWindow();
                    return;
                }
                if (current < tries) {
                    window.setTimeout(tick, wait);
                    return;
                }
                startReadyPolling();
            }

            tick();
        }

        function applyPayload(item) {
            if (!item || !isReady()) return;
            const attrs = {
                tt_source: String(item.source || 'website').slice(0, 60),
                tt_page: String(item.page || location.href).slice(0, 255),
                tt_message: sanitizeText(item.message || '')
            };

            if (item.name) {
                attrs.tt_name = String(item.name).slice(0, 120);
                attrs.name = String(item.name).slice(0, 120);
            }
            if (item.phone) attrs.tt_phone = String(item.phone).slice(0, 40);
            if (item.product) attrs.tt_product = String(item.product).slice(0, 120);
            if (item.plan) attrs.tt_plan = String(item.plan).slice(0, 120);
            if (item.orderId) attrs.tt_order_id = String(item.orderId).slice(0, 80);

            persistFallback({ ...item, at: Date.now() });

            try {
                if (typeof window.Tawk_API.setAttributes === 'function') {
                    window.Tawk_API.setAttributes(attrs, function () { });
                }
            } catch (_) { }

            try {
                if (typeof window.Tawk_API.addEvent === 'function') {
                    const messageParts = splitMessageForEvent(item.message || '', 220);
                    const metadata = {
                        source: String(item.source || 'website').slice(0, 60),
                        page: String(item.page || location.href).slice(0, 255),
                        name: String(item.name || '').slice(0, 120),
                        phone: String(item.phone || '').slice(0, 40),
                        product: String(item.product || '').slice(0, 120),
                        plan: String(item.plan || '').slice(0, 120),
                        orderId: String(item.orderId || '').slice(0, 80),
                        hasMessage: messageParts.length ? '1' : '0'
                    };

                    messageParts.forEach(function (part, idx) {
                        metadata['msg_' + (idx + 1)] = part;
                    });

                    window.Tawk_API.addEvent('ttbd_order_message', metadata, function () { });
                }
            } catch (_) { }

            openChatWindow();
        }

        function flushQueue() {
            if (!isReady()) return;
            while (bridgeQueue.length) {
                applyPayload(bridgeQueue.shift());
            }
        }

        function tryReadyFlush() {
            if (!isReady()) return false;
            flushQueue();
            return true;
        }

        function startReadyPolling() {
            if (readyPollTimer) return;
            let tries = 0;
            readyPollTimer = window.setInterval(function () {
                tries++;
                const ok = tryReadyFlush();
                if (ok || tries >= 80) {
                    window.clearInterval(readyPollTimer);
                    readyPollTimer = null;
                }
            }, 250);
        }

        function sendToChat(input) {
            const item = {
                source: input?.source || 'website',
                message: sanitizeText(input?.message || ''),
                page: input?.page || location.href,
                name: input?.name || '',
                phone: input?.phone || '',
                product: input?.product || '',
                plan: input?.plan || '',
                orderId: input?.orderId || ''
            };

            if (!item.message) {
                item.message = `Customer requested help from ${location.pathname}`;
            }

            if (isReady()) {
                applyPayload(item);
                return true;
            }

            bridgeQueue.push(item);
            startReadyPolling();
            return false;
        }

        function parseWhatsAppText(url) {
            try {
                const u = new URL(url, location.href);
                const text = u.searchParams.get('text') || u.searchParams.get('message') || '';
                return String(text || '').trim();
            } catch (_) {
                return '';
            }
        }

        function isWhatsAppHref(href) {
            const value = String(href || '').toLowerCase();
            return value.includes('wa.me/') || value.includes('api.whatsapp.com/send');
        }

        function setupWhatsAppInterceptor() {
            document.addEventListener('click', function (ev) {
                const anchor = ev.target && ev.target.closest ? ev.target.closest('a[href]') : null;
                if (!anchor) return;
                if (anchor.dataset && anchor.dataset.waDirect === '1') return;

                const href = anchor.getAttribute('href') || '';
                if (!isWhatsAppHref(href)) return;

                ev.preventDefault();

                const waText = parseWhatsAppText(href);
                sendToChat({
                    source: 'whatsapp-link',
                    message: waText || 'Customer clicked WhatsApp contact and wants to place an order.',
                    page: location.href
                });
            }, true);
        }

        window.TTBDLiveChat = {
            sendOrderToChat: function (message, meta) {
                return sendToChat({
                    source: meta?.source || 'order-form',
                    message: message,
                    page: location.href,
                    name: meta?.name,
                    phone: meta?.phone,
                    product: meta?.product,
                    plan: meta?.plan,
                    orderId: meta?.orderId
                });
            },
            open: function () {
                if (isReady()) {
                    openChatWindow();
                    return true;
                }
                startReadyPolling();
                return false;
            },
            openWithRetries: function (retryCount, intervalMs) {
                openWithRetries(retryCount, intervalMs);
            }
        };

        window.Tawk_API = window.Tawk_API || {};
        const previousOnLoad = typeof window.Tawk_API.onLoad === 'function' ? window.Tawk_API.onLoad : null;
        window.Tawk_API.onLoad = function () {
            if (previousOnLoad) {
                try { previousOnLoad(); } catch (_) { }
            }
            flushQueue();
        };

        const previousOnChatStarted = typeof window.Tawk_API.onChatStarted === 'function' ? window.Tawk_API.onChatStarted : null;
        window.Tawk_API.onChatStarted = function () {
            if (previousOnChatStarted) {
                try { previousOnChatStarted(); } catch (_) { }
            }
            flushQueue();
        };

        setupWhatsAppInterceptor();
        startReadyPolling();
    })();

    (function loadTawkEmbedWithRetry() {
        const EMBED_SRC = 'https://embed.tawk.to/69a447c99d76e61c38798015/1jikrgrhq';
        const DIRECT_CHAT_URL = 'https://tawk.to/chat/69a447c99d76e61c38798015/1jikrgrhq';
        const SCRIPT_ID = 'ttbd-tawk-embed';
        const RETRY_DELAYS = [0, 1500, 4000, 9000, 16000];
        let attempt = 0;
        let stopped = false;

        function isWidgetReady() {
            return Boolean(window.Tawk_API && typeof window.Tawk_API.maximize === 'function');
        }

        function showFallbackNotice() {
            if (document.getElementById('ttbd-chat-fallback')) return;
            const box = document.createElement('a');
            box.id = 'ttbd-chat-fallback';
            box.href = DIRECT_CHAT_URL;
            box.target = '_blank';
            box.rel = 'noopener noreferrer';
            box.textContent = 'Live chat blocked. Tap to open chat.';
            box.style.position = 'fixed';
            box.style.right = '14px';
            box.style.bottom = '14px';
            box.style.zIndex = '2147483647';
            box.style.padding = '10px 12px';
            box.style.fontSize = '12px';
            box.style.fontWeight = '700';
            box.style.border = '1px solid #00E5FF';
            box.style.background = '#0B1422';
            box.style.color = '#E8F0FF';
            box.style.textDecoration = 'none';
            document.body.appendChild(box);
        }

        function cleanupScript() {
            const old = document.getElementById(SCRIPT_ID);
            if (old && old.parentNode) old.parentNode.removeChild(old);
        }

        function scheduleNext() {
            if (stopped) return;
            attempt += 1;
            if (attempt >= RETRY_DELAYS.length) {
                showFallbackNotice();
                return;
            }
            window.setTimeout(loadAttempt, RETRY_DELAYS[attempt]);
        }

        function loadAttempt() {
            if (stopped || isWidgetReady()) {
                stopped = true;
                return;
            }

            cleanupScript();

            const s1 = document.createElement('script');
            const s0 = document.getElementsByTagName('script')[0];
            s1.id = SCRIPT_ID;
            s1.async = true;
            s1.src = EMBED_SRC + '?r=' + Date.now() + '-' + attempt;
            s1.charset = 'UTF-8';
            s1.setAttribute('crossorigin', '*');
            s1.onerror = scheduleNext;
            s0.parentNode.insertBefore(s1, s0);

            window.setTimeout(function () {
                if (isWidgetReady()) {
                    stopped = true;
                    return;
                }
                scheduleNext();
            }, 5000);
        }

        loadAttempt();
    })();
}
