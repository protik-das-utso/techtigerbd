This folder holds a cached copy of pricing/content/availability fetched from Google Sheets.

- cache.json: merged key/value map used by product pages
- updatedAt: ISO time of last refresh

Use the provided node script to refresh this file periodically (e.g., via Windows Task Scheduler or a cron on your host).
