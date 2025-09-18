# Google Sheet for Pricing & Content

Use this to power dynamic prices and product content via `assets/app.js` (PRICING_SHEET_URL).

## 1) Create the Sheet
- Go to Google Sheets and create a new sheet.
- In row 1 add headers. For pricing rows use: `sku`, `price`, `currency`, `notes`.
- For content rows use: `key`, `value` (you can still keep `currency`, `notes` columns if you want; they will be ignored for content).
- Copy/paste these rows as examples:

```
sku,price,currency,notes
chatgpt_shared_1m,400,BDT,Shared • 1 Month
chatgpt_shared_2m,800,BDT,Shared • 2 Months
chatgpt_shared_3m,1200,BDT,Shared • 3 Months
chatgpt_personal_1m,2500,BDT,Personal • 1 Month
chatgpt_personal_2m,5000,BDT,Personal • 2 Months
chatgpt_personal_3m,7500,BDT,Personal • 3 Months
key,value
chatgpt_about,"<p>ChatGPT দিয়ে রাইটিং, কোডিং, ডক/ইমেজ চ্যাট—সব একসাথে সুবিধাজনকভাবে ব্যবহার করুন…</p><ul><li>লোকাল পেমেন্ট: bKash / Nagad / Rocket</li></ul>"
chatgpt_shared_guide,"<ul><li>১ ডিভাইস লগইন রাখুন…</li><li>★ জেনারেল ইউসেজের জন্য OK</li></ul>"
chatgpt_personal_guide,"<ul><li>নিজস্ব প্রোফাইল/অ্যাক্সেস…</li><li>প্রতিমাসে রিনিউ করতে পারবেন</li></ul>"
```

Important:
- `sku` must match the buttons in `products/chatgpt.html` (data-sku attributes) for pricing.
- `price` must be a number (no currency symbols) for pricing rows.
- For content rows, use the `key` column with these keys to override ChatGPT page text:
	- `chatgpt_about` → replaces the About block (HTML allowed)
	- `chatgpt_shared_guide` → replaces the Shared guide list/body (HTML allowed)
	- `chatgpt_personal_guide` → replaces the Personal guide list/body (HTML allowed)

## 2) Publish to the web (CSV)
- In Google Sheets, click: File → Share → Publish to web.
- Select "Entire Document" and format "Comma-separated values (.csv)".
- Click Publish and copy the URL (it will end with `output=csv`).

Alternative (GVIZ): If you can’t publish CSV, you can use the gviz JSON endpoint (`/gviz/tq?gid=<...>`). The loader supports both for pricing and content (col A=key, col B/C=value/price).

## 3) Paste URL in app.js
- Open `assets/app.js`.
- Find `const PRICING_SHEET_URL = "";`.
- Paste the published CSV link, for example:

```js
const PRICING_SHEET_URL = "https://docs.google.com/spreadsheets/d/e/.../pub?gid=0&single=true&output=csv";
```

## 4) Verify
- Load `/products/chatgpt.html`.
- Prices on the plan chips should update to match the sheet. If not, check console for warnings.
- The "সার্ভিস সম্পর্কে" blocks should reflect your content rows if provided.

## Tips
- You can add more SKUs for other products. Just ensure the page chips use matching `data-sku`.
- Currency and notes columns are optional; only `sku`/`price` (pricing) and `key`/`value` (content) are used.

---

## Crunchyroll configuration (second tab)

If you keep Crunchyroll data in another tab of the same Google Sheet, publish that tab too (or use its gid in a CSV URL).

Recommended SKUs (already wired in `products/crunchyroll.html`):

```
sku,price,currency,notes
cr_1m_shared,50,BDT,Shared • 1 Month
cr_6m_shared,270,BDT,Shared • 6 Months
cr_1y_shared,400,BDT,Shared • 12 Months
cr_1m_personal,100,BDT,Personal • 1 Month
cr_6m_personal,450,BDT,Personal • 6 Months
cr_1y_personal,550,BDT,Personal • 12 Months
```

Availability (stock/status) keys supported on product pages:
- Preferred per‑product keys: `crunchyroll_stock` or `crunchyroll_status` (for Crunchyroll), `chatgpt_stock` for ChatGPT, etc.
- Global fallback keys: `stock` or `availability`

Examples (KV mode):

```
key,value
crunchyroll_status,Low Stock
```

Color mapping (case-insensitive):
- Contains “out”, “oos”, “sold”: shows as Out of Stock and disables Pay Now
- Contains “low”, “few”, “limited”: shows as Low Stock
- Contains “in”, “available”, “yes”, “true”, “ok”: shows as In Stock
- Otherwise: shows your exact text

### Point a page to a specific tab URL

You have three ways to make a product page use a specific published CSV (e.g., your Crunchyroll tab):

1) Global default in `assets/app.js` (affects all pages)
2) Per‑page attribute on the product root element:
	- In the page’s `<main ... data-page="product" data-sheet-url="https://docs.google.com/...output=csv">`
3) Query parameter override for quick testing:
	- Append `?sheet=https://docs.google.com/...output=csv` to the page URL

The loader uses: `window.PRICING_SHEET_URL || PRICING_SHEET_URL`, where `window.PRICING_SHEET_URL` can be set by either the data attribute or the query parameter.

### Content keys for ChatGPT page

If you keep ChatGPT content in the same sheet or another tab, use these keys (HTML allowed):
- `chatgpt_about`
- `chatgpt_shared_guide`
- `chatgpt_personal_guide`

Note: Your sample had a typo: “Low Slock”. Use “Low Stock” (but the code tolerates variations like “low”).
