#!/usr/bin/env bash
# Regenerate minified CSS/JS from the editable source files.
#
# The site loads the *.min.css / *.min.js versions (referenced in the HTML),
# but you EDIT the original *.css / *.js files. After editing an original,
# re-run this script so the minified version that the site actually serves
# is updated, then upload the new .min file to cPanel.
#
# Requires Node.js (uses npx terser + clean-css-cli, downloaded on first run).
set -e
cd "$(dirname "$0")"

CSS="base.css assets/theme.css assets/theme-bridge.css products/product-base.css products/product-theme.css"
JS="assets/site.js assets/livechat.js assets/social-proof.js assets/product-plans.js assets/theme-bridge.js"

for f in $CSS; do
  echo "css  $f"
  npx --yes clean-css-cli -o "${f%.css}.min.css" "$f"
done

for f in $JS; do
  echo "js   $f"
  npx --yes terser "$f" -c -m -o "${f%.js}.min.js"
done

echo "Done. Minified files regenerated."
