#!/usr/bin/env bash
set -euo pipefail

rm -rf dist .calendarfuse-build
mkdir -p dist .calendarfuse-build

if [ -d parts ] && compgen -G "parts/source.part.*" > /dev/null; then
  cat parts/source.part.* > /tmp/calendarfuse-source.tar.gz.b64
  base64 --decode /tmp/calendarfuse-source.tar.gz.b64 > /tmp/calendarfuse-source.tar.gz
  tar -xzf /tmp/calendarfuse-source.tar.gz -C .calendarfuse-build
  cp -a .calendarfuse-build/. dist/
else
  for path in \
    .well-known api assets docs screenshots \
    404.html app.css app.html app.js data-deletion.html favicon.svg \
    index.html manifest.webmanifest privacy.html robots.txt security.html \
    site.js sitemap.xml styles.css support.html terms.html; do
    if [ -e "$path" ]; then
      cp -a "$path" dist/
    fi
  done
fi

# Build-only and platform configuration files should not be served publicly.
rm -f dist/vercel.json dist/build.sh dist/package.json

test -f dist/index.html
test -f dist/app.html
test -f dist/privacy.html
test -f dist/terms.html
test -f dist/support.html

echo "CalendarFuse static build created in dist/"
