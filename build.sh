#!/usr/bin/env bash
set -euo pipefail

readonly EXPECTED_B64_SHA="6c4b7ea5117e8010d7240cf0fd8820ab287545af22eff5be0e57cf7118c37473"
readonly EXPECTED_TAR_SHA="a294f959cb7ca46d51811e6df0ed170fdb0cdc58726b5e1ab794bd019d33520c"

payload_files=()
for index in $(seq -w 0 12); do
  payload_files+=("payload/source.part.${index}")
done

for file in "${payload_files[@]}"; do
  if [[ ! -s "$file" ]]; then
    echo "Missing required source payload: $file" >&2
    exit 1
  fi
done

rm -rf dist .calendarfuse-build
mkdir -p dist .calendarfuse-build

cat "${payload_files[@]}" | tr -d '\r\n\t ' > /tmp/calendarfuse-source.tar.gz.b64

actual_b64_sha="$(sha256sum /tmp/calendarfuse-source.tar.gz.b64 | awk '{print $1}')"
if [[ "$actual_b64_sha" != "$EXPECTED_B64_SHA" ]]; then
  echo "CalendarFuse payload checksum mismatch." >&2
  echo "Expected: $EXPECTED_B64_SHA" >&2
  echo "Actual:   $actual_b64_sha" >&2
  exit 1
fi

base64 --decode /tmp/calendarfuse-source.tar.gz.b64 > /tmp/calendarfuse-source.tar.gz

actual_tar_sha="$(sha256sum /tmp/calendarfuse-source.tar.gz | awk '{print $1}')"
if [[ "$actual_tar_sha" != "$EXPECTED_TAR_SHA" ]]; then
  echo "CalendarFuse archive checksum mismatch." >&2
  echo "Expected: $EXPECTED_TAR_SHA" >&2
  echo "Actual:   $actual_tar_sha" >&2
  exit 1
fi

tar -tzf /tmp/calendarfuse-source.tar.gz >/dev/null
tar -xzf /tmp/calendarfuse-source.tar.gz -C .calendarfuse-build

required_files=(
  index.html
  app.html
  privacy.html
  terms.html
  support.html
  styles.css
  app.css
  site.js
  app.js
  vercel.json
)

for file in "${required_files[@]}"; do
  if [[ ! -f ".calendarfuse-build/$file" ]]; then
    echo "Built source is missing required file: $file" >&2
    exit 1
  fi
done

cp -a .calendarfuse-build/. dist/
rm -f dist/build.sh dist/package.json dist/vercel.json

for file in index.html app.html privacy.html terms.html support.html; do
  test -s "dist/$file"
done

echo "CalendarFuse verified source payload installed."
echo "Static site output is ready in dist/."
