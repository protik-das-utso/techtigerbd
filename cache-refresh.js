// Cache Google Sheets data into assets/data/cache.json
// Run: node cache-refresh.js
// Schedule: Every 10 minutes via Task Scheduler or a cron-like tool

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const OUT = path.join(__dirname, 'assets', 'data', 'cache.json');
const LOCAL_OVERRIDES = path.join(__dirname, 'assets', 'data', 'local.json');

// Add your published CSV/JSON endpoints here (price and content tabs)
const SOURCES = [
    // Example: Crunchyroll tab CSV
    'https://docs.google.com/spreadsheets/d/e/2PACX-1vSnbsW6WhpLrxynW5ulRz-chNVLpD-sUOFtTeGFrQpzLTEcVousfG-zw0cP9HhxylZiV4nUUppvhCBk/pub?gid=1620198612&single=true&output=csv',
    // Example: default/global sheet
    'https://docs.google.com/spreadsheets/d/e/2PACX-1vSnbsW6WhpLrxynW5ulRz-chNVLpD-sUOFtTeGFrQpzLTEcVousfG-zw0cP9HhxylZiV4nUUppvhCBk/pub?gid=0&single=true&output=csv',
    // Example: Netflix tab CSV
    'https://docs.google.com/spreadsheets/d/e/2PACX-1vSnbsW6WhpLrxynW5ulRz-chNVLpD-sUOFtTeGFrQpzLTEcVousfG-zw0cP9HhxylZiV4nUUppvhCBk/pub?gid=580013488&single=true&output=csv'
];

function fetchWithRedirects(url, maxRedirects = 5) {
    return new Promise((resolve, reject) => {
        const doRequest = (currentUrl, redirectsRemaining) => {
            const u = new URL(currentUrl);
            const lib = u.protocol === 'http:' ? http : https;
            const options = {
                protocol: u.protocol,
                hostname: u.hostname,
                port: u.port || (u.protocol === 'http:' ? 80 : 443),
                path: u.pathname + (u.search || ''),
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) NodeCacheRefresher/1.0',
                    'Accept': 'text/csv, application/json;q=0.9, */*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.7',
                    'Connection': 'close'
                },
            };
            const req = lib.request(options, (res) => {
                if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
                    const loc = res.headers.location;
                    res.resume();
                    if (!loc) return reject(new Error(`HTTP ${res.statusCode} with no Location for ${currentUrl}`));
                    if (redirectsRemaining <= 0) return reject(new Error(`Too many redirects for ${currentUrl}`));
                    const nextUrl = new URL(loc, currentUrl).toString();
                    return doRequest(nextUrl, redirectsRemaining - 1);
                }
                if (res.statusCode !== 200) {
                    res.resume();
                    return reject(new Error(`HTTP ${res.statusCode} for ${currentUrl}`));
                }
                let data = '';
                res.setEncoding('utf8');
                res.on('data', (chunk) => (data += chunk));
                res.on('end', () => resolve({ data, finalUrl: currentUrl }));
            });
            req.setTimeout(15000, () => req.destroy(new Error(`Timeout fetching ${currentUrl}`)));
            req.on('error', reject);
            req.end();
        };
        doRequest(url, maxRedirects);
    });
}

function parseCSV(text) {
    const rows = [];
    let cur = [];
    let val = '';
    let inQ = false;
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        const next = text[i + 1];
        if (inQ) {
            if (ch === '"' && next === '"') { val += '"'; i++; continue; }
            if (ch === '"') { inQ = false; continue; }
            val += ch; continue;
        } else {
            if (ch === '"') { inQ = true; continue; }
            if (ch === ',') { cur.push(val); val = ''; continue; }
            if (ch === '\n') { cur.push(val); rows.push(cur); cur = []; val = ''; continue; }
            if (ch === '\r') { continue; }
            val += ch;
        }
    }
    cur.push(val); rows.push(cur);
    return rows.filter(r => r.length && !(r.length === 1 && r[0].trim() === ''));
}

function buildKVFromCSV(text) {
    const rows = parseCSV(text);
    if (!rows.length) return {};
    const header = rows[0].map(s => String(s).trim().toLowerCase());
    let idxKey = Math.max(header.indexOf('sku'), header.indexOf('key'), header.indexOf('id'));
    let idxPrice = Math.max(header.indexOf('price'), header.indexOf('amount'));
    if (idxKey < 0) idxKey = 0;
    if (idxPrice < 0) {
        // try to detect a numeric column for price
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
    const map = {};
    for (let i = 1; i < rows.length; i++) {
        const parts = rows[i];
        const k = String(parts[idxKey] || '').trim();
        if (!k) continue;
        const vStr = String(parts[idxPrice] || '').trim();
        const num = parseInt(vStr.replace(/[^\d]/g, ''), 10) || 0;
        // keep numeric as number else as string (for content/stock keys)
        map[k] = (num > 0 ? num : vStr);
    }
    return map;
}

function buildKVFromGViz(text) {
    // Strip XSSI guard and wrapper: google.visualization.Query.setResponse(...);
    const guardIdx = text.indexOf('{');
    const lastIdx = text.lastIndexOf('}');
    if (guardIdx === -1 || lastIdx === -1 || lastIdx <= guardIdx) return {};
    let jsonStr = text.slice(guardIdx, lastIdx + 1);
    let payload;
    try { payload = JSON.parse(jsonStr); } catch { return {}; }
    const table = payload && (payload.table || (payload.response && payload.response.table));
    if (!table || !Array.isArray(table.cols) || !Array.isArray(table.rows)) return {};
    const header = table.cols.map(c => String((c && (c.label || c.id)) || '').trim().toLowerCase());
    let idxKey = Math.max(header.indexOf('sku'), header.indexOf('key'), header.indexOf('id'));
    let idxPrice = Math.max(header.indexOf('price'), header.indexOf('amount'), header.indexOf('value'));
    if (idxKey < 0) idxKey = 0;
    if (idxPrice < 0) {
        let best = { idx: -1, hits: 0 };
        for (let j = 0; j < header.length; j++) {
            let hits = 0;
            for (const r of table.rows) {
                const cell = r && r.c && r.c[j] ? r.c[j].v : undefined;
                const s = String(cell ?? '').trim();
                if (!s) continue;
                const num = parseInt(s.replace(/[^\d]/g, ''), 10) || 0;
                if (num > 0) hits++;
            }
            if (hits > best.hits) best = { idx: j, hits };
        }
        if (best.hits > 0) idxPrice = best.idx;
    }
    const map = {};
    for (const r of table.rows) {
        const cells = r.c || [];
        const kRaw = cells[idxKey] ? cells[idxKey].v : '';
        const k = String(kRaw || '').trim();
        if (!k) continue;
        const vRaw = cells[idxPrice] ? cells[idxPrice].v : '';
        const vStr = String(vRaw || '').trim();
        const num = parseInt(vStr.replace(/[^\d]/g, ''), 10) || 0;
        map[k] = (num > 0 ? num : vStr);
    }
    return map;
}

function buildKVAuto(text) {
    const t = text.trim();
    const isGViz = t.startsWith(')]}') || t.includes('google.visualization.Query.setResponse');
    return isGViz ? buildKVFromGViz(t) : buildKVFromCSV(t);
}

function groupByProduct(merged, productUrlSets, globalStock) {
    const products = {};
    const getProd = (slug) => {
        if (!products[slug]) products[slug] = { prices: {}, content: {}, stock: null, sourceUrls: [] };
        return products[slug];
    };
    for (const [k, v] of Object.entries(merged)) {
        const idx = k.indexOf('_');
        if (idx <= 0) continue;
        const prefix = k.slice(0, idx).toLowerCase();
        const slug = prefix === 'cr' ? 'crunchyroll' : prefix;
        const rest = k.slice(idx + 1);
        const p = getProd(slug);
        const restLower = rest.toLowerCase();
        if (/(^|_)about$/.test(restLower)) { p.content['about'] = v; continue; }
        if (/(^|_)shared_guide$/.test(restLower)) { p.content['shared_guide'] = v; continue; }
        if (/(^|_)personal_guide$/.test(restLower)) { p.content['personal_guide'] = v; continue; }
        if (/(^|_)(stock|status|availability)$/.test(restLower)) { p.stock = v; continue; }
        const num = typeof v === 'number' ? v : parseInt(String(v).replace(/[^\d]/g, ''), 10) || 0;
        if (num > 0) p.prices[rest] = typeof v === 'number' ? v : num; else p.content[rest] = v;
    }
    if (globalStock != null) {
        for (const slug of Object.keys(products)) {
            const cur = products[slug].stock;
            if (cur == null || (typeof cur === 'string' && cur.trim() === '')) products[slug].stock = globalStock;
        }
    }
    for (const [slug, set] of Object.entries(productUrlSets)) {
        if (!products[slug]) continue;
        products[slug].sourceUrls = Array.from(set);
    }
    return products;
}

(async () => {
    try {
        // Start with existing cache to avoid wiping manual keys if fetch fails
        let merged = {};
        try {
            if (fs.existsSync(OUT)) {
                const prev = JSON.parse(fs.readFileSync(OUT, 'utf8'));
                if (prev && typeof prev === 'object' && prev.data && typeof prev.data === 'object') {
                    merged = { ...prev.data };
                }
            }
        } catch { }

        let fetchedAny = false;
        const sourceLogs = [];
        const productUrlSets = {}; // slug -> Set(url)

            const mergeNonEmpty = (target, src) => {
                for (const [k, v] of Object.entries(src || {})) {
                    const hasPrev = Object.prototype.hasOwnProperty.call(target, k);
                    const prev = target[k];
                    const vIsEmpty = (typeof v === 'string') ? (v.trim().length === 0) : (v === null || v === undefined);
                    const prevIsEmpty = (typeof prev === 'string') ? (prev.trim().length === 0) : (prev === null || prev === undefined);
                    // Overwrite if no previous, or previous is empty, or new value is non-empty
                    if (!hasPrev || prevIsEmpty || !vIsEmpty) {
                        target[k] = v;
                    }
                }
            };

            for (const url of SOURCES) {
            try {
                const { data: txt, finalUrl } = await fetchWithRedirects(url);
                const kv = buildKVAuto(txt);
                    mergeNonEmpty(merged, kv);
                fetchedAny = true;
                const format = (txt.trim().startsWith(')]}') || txt.includes('google.visualization.Query.setResponse')) ? 'gviz' : 'csv';
                sourceLogs.push({ url: finalUrl || url, ok: true, format, keyCount: Object.keys(kv).length });
                for (const k of Object.keys(kv)) {
                    const idx = k.indexOf('_');
                    if (idx > 0) {
                        const prefix = k.slice(0, idx).toLowerCase();
                        const alias = prefix === 'cr' ? 'crunchyroll' : prefix;
                        if (!productUrlSets[alias]) productUrlSets[alias] = new Set();
                        productUrlSets[alias].add(finalUrl || url);
                    }
                }
            } catch (e) {
                console.error('Failed to fetch source', url, e.message);
                sourceLogs.push({ url, ok: false, error: e.message });
            }
        }

        // Apply local overrides last, if present (manual keys persist across runs)
        try {
            if (fs.existsSync(LOCAL_OVERRIDES)) {
                const local = JSON.parse(fs.readFileSync(LOCAL_OVERRIDES, 'utf8'));
                if (local && typeof local === 'object') {
                    Object.assign(merged, local);
                    console.log('Applied local overrides from', LOCAL_OVERRIDES);
                }
            }
        } catch (e) {
            console.warn('Warning: Failed to apply local overrides:', e.message);
        }

            const globalStock = (typeof merged['stock'] === 'string' && merged['stock'].trim()) ? merged['stock']
                : (typeof merged['status'] === 'string' && merged['status'].trim()) ? merged['status']
                : (typeof merged['availability'] === 'string' && merged['availability'].trim()) ? merged['availability']
                : null;
        const products = groupByProduct(merged, productUrlSets, globalStock);

        // If we have a non-empty global stock, propagate it to flat keys for each product
        if (globalStock != null && String(globalStock).trim() !== '') {
            for (const slug of Object.keys(products)) {
                const stockKey = `${slug}_stock`;
                const statusKey = `${slug}_status`;
                const hasStock = Object.prototype.hasOwnProperty.call(merged, stockKey) && String(merged[stockKey] ?? '').trim() !== '';
                const hasStatus = Object.prototype.hasOwnProperty.call(merged, statusKey) && String(merged[statusKey] ?? '').trim() !== '';
                if (!hasStock) merged[stockKey] = globalStock;
                if (!hasStatus) merged[statusKey] = globalStock;
            }
        }

        const payload = { updatedAt: new Date().toISOString(), sources: sourceLogs, data: merged, products };
        fs.mkdirSync(path.dirname(OUT), { recursive: true });
        fs.writeFileSync(OUT, JSON.stringify(payload, null, 2), 'utf8');
        console.log('Cache written:', OUT, Object.keys(merged).length, 'keys');
        if (!fetchedAny) {
            console.warn('Warning: No sources fetched successfully. Existing cache (if any) was preserved.');
        }
    } catch (e) {
        console.error('Cache refresh failed:', e);
        process.exitCode = 1;
    }
})();
