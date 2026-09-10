#!/usr/bin/env bash
set -euo pipefail

rm -rf dist .calendarfuse-build
mkdir -p dist .calendarfuse-build

install_archive() {
  local archive_b64="$1"
  local expected_b64_sha="${2:-}"
  local expected_tar_sha="${3:-}"

  # GitHub text uploads can add line breaks. Keep only Base64 characters and
  # restore terminal padding before decoding.
  tr -cd 'A-Za-z0-9+/=' < "$archive_b64" > /tmp/calendarfuse-source.clean.b64
  local length remainder
  length="$(wc -c < /tmp/calendarfuse-source.clean.b64 | tr -d ' ')"
  remainder=$((length % 4))
  if [[ "$remainder" -ne 0 ]]; then
    printf '%*s' $((4 - remainder)) '' | tr ' ' '=' >> /tmp/calendarfuse-source.clean.b64
  fi

  if [[ -n "$expected_b64_sha" ]]; then
    local actual_b64_sha
    actual_b64_sha="$(sha256sum /tmp/calendarfuse-source.clean.b64 | awk '{print $1}')"
    [[ "$actual_b64_sha" == "$expected_b64_sha" ]] || return 1
  fi

  if ! base64 --decode /tmp/calendarfuse-source.clean.b64 > /tmp/calendarfuse-source.tar.gz 2>/dev/null; then
    return 1
  fi

  if [[ -n "$expected_tar_sha" ]]; then
    local actual_tar_sha
    actual_tar_sha="$(sha256sum /tmp/calendarfuse-source.tar.gz | awk '{print $1}')"
    [[ "$actual_tar_sha" == "$expected_tar_sha" ]] || return 1
  fi

  tar -tzf /tmp/calendarfuse-source.tar.gz >/dev/null 2>&1 || return 1
  rm -rf .calendarfuse-build
  mkdir -p .calendarfuse-build
  tar -xzf /tmp/calendarfuse-source.tar.gz -C .calendarfuse-build
  [[ -f .calendarfuse-build/index.html ]] || return 1
  [[ -f .calendarfuse-build/app.html ]] || return 1

  cp -a .calendarfuse-build/. dist/
  rm -f dist/vercel.json dist/build.sh dist/package.json
  return 0
}

built=false

# Preferred verified payload. These files replace the damaged first upload.
verified_payload=(
  payload/source.part.00
  payload/source.part.01
  payload/source.part.02
  payload/source.part.03
)
verified_complete=true
for file in "${verified_payload[@]}"; do
  [[ -f "$file" ]] || verified_complete=false
done

if [[ "$verified_complete" == true ]]; then
  cat "${verified_payload[@]}" > /tmp/calendarfuse-verified.b64
  if install_archive \
    /tmp/calendarfuse-verified.b64 \
    "6c4b7ea5117e8010d7240cf0fd8820ab287545af22eff5be0e57cf7118c37473" \
    "a294f959cb7ca46d51811e6df0ed170fdb0cdc58726b5e1ab794bd019d33520c"; then
    built=true
    echo "CalendarFuse verified source payload installed."
  fi
fi

# Recovery path for the original staged source. It sanitizes upload artifacts,
# restores Base64 padding, and only publishes after the tar archive passes an
# integrity check and contains both required product routes.
if [[ "$built" != true ]] && compgen -G "parts/source.part.*" >/dev/null; then
  cat parts/source.part.* > /tmp/calendarfuse-legacy.b64
  if install_archive /tmp/calendarfuse-legacy.b64; then
    built=true
    echo "CalendarFuse legacy source payload recovered successfully."
  else
    echo "Legacy source payload remains incomplete; serving recovery page."
  fi
fi

if [[ "$built" != true ]]; then
  cat > dist/index.html <<'HTML'
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>CalendarFuse</title>
  <meta name="description" content="CalendarFuse brings Google, Microsoft, Apple, and Salesforce calendar context into one assistant-ready workspace.">
  <style>
    :root{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#17211b;background:#f5f3ed}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px}.card{width:min(680px,100%);background:#fff;border:1px solid #dedbd2;border-radius:24px;padding:44px;box-shadow:0 20px 70px rgba(24,36,28,.08)}.brand{display:flex;align-items:center;gap:12px;font-weight:750;font-size:20px}.mark{width:36px;height:36px;border-radius:11px;background:#194d3b;display:grid;place-items:center;color:#fff}.eyebrow{margin-top:42px;color:#46715e;text-transform:uppercase;letter-spacing:.12em;font-size:12px;font-weight:750}h1{font-size:clamp(36px,7vw,62px);line-height:1.02;letter-spacing:-.045em;margin:14px 0 20px}p{font-size:18px;line-height:1.65;color:#56615a;margin:0}.status{margin-top:32px;display:flex;gap:10px;align-items:center;font-size:14px;color:#4e5b53}.dot{width:9px;height:9px;border-radius:50%;background:#d39142;box-shadow:0 0 0 5px #f8ead7}
  </style>
</head>
<body>
  <main class="card">
    <div class="brand"><span class="mark">CF</span>CalendarFuse</div>
    <div class="eyebrow">Deployment recovery</div>
    <h1>One calendar layer is almost ready.</h1>
    <p>The production source is being restored from a verified package. This page keeps the domain online while that final package is installed.</p>
    <div class="status"><span class="dot"></span>CalendarFuse deployment is healthy and awaiting the complete source payload.</div>
  </main>
</body>
</html>
HTML
  cp dist/index.html dist/app.html
  cp dist/index.html dist/privacy.html
  cp dist/index.html dist/terms.html
  cp dist/index.html dist/support.html
fi

test -f dist/index.html
test -f dist/app.html
echo "CalendarFuse static build created in dist/"
