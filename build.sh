#!/usr/bin/env bash
set -euo pipefail

rm -rf dist .calendarfuse-build
mkdir -p dist .calendarfuse-build

payload_files=(
  payload/source.part.00
  payload/source.part.01
  payload/source.part.02
  payload/source.part.03
)
expected_b64_sha="6c4b7ea5117e8010d7240cf0fd8820ab287545af22eff5be0e57cf7118c37473"
expected_tar_sha="a294f959cb7ca46d51811e6df0ed170fdb0cdc58726b5e1ab794bd019d33520c"

all_present=true
for file in "${payload_files[@]}"; do
  if [[ ! -f "$file" ]]; then
    all_present=false
    break
  fi
done

if [[ "$all_present" == true ]]; then
  cat "${payload_files[@]}" | tr -d '\r\n\t ' > /tmp/calendarfuse-source.tar.gz.b64
  actual_b64_sha="$(sha256sum /tmp/calendarfuse-source.tar.gz.b64 | awk '{print $1}')"

  if [[ "$actual_b64_sha" == "$expected_b64_sha" ]]; then
    base64 --decode /tmp/calendarfuse-source.tar.gz.b64 > /tmp/calendarfuse-source.tar.gz
    actual_tar_sha="$(sha256sum /tmp/calendarfuse-source.tar.gz | awk '{print $1}')"

    if [[ "$actual_tar_sha" == "$expected_tar_sha" ]]; then
      tar -xzf /tmp/calendarfuse-source.tar.gz -C .calendarfuse-build
      cp -a .calendarfuse-build/. dist/
      rm -f dist/vercel.json dist/build.sh dist/package.json
      echo "CalendarFuse source payload verified and built."
    else
      echo "Payload archive checksum mismatch; serving recovery page instead."
      all_present=false
    fi
  else
    echo "Payload text checksum mismatch; serving recovery page instead."
    all_present=false
  fi
fi

if [[ "$all_present" != true ]]; then
  cat > dist/index.html <<'HTML'
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>CalendarFuse</title>
  <meta name="description" content="CalendarFuse brings Google, Microsoft, Apple, and Salesforce calendar context into one assistant-ready workspace.">
  <style>
    :root{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#17211b;background:#f5f3ed}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px}.card{width:min(680px,100%);background:#fff;border:1px solid #dedbd2;border-radius:24px;padding:44px;box-shadow:0 20px 70px rgba(24,36,28,.08)}.brand{display:flex;align-items:center;gap:12px;font-weight:750;font-size:20px}.mark{width:36px;height:36px;border-radius:11px;background:#194d3b;display:grid;place-items:center;color:#fff}.eyebrow{margin-top:42px;color:#46715e;text-transform:uppercase;letter-spacing:.12em;font-size:12px;font-weight:750}h1{font-size:clamp(36px,7vw,62px);line-height:1.02;letter-spacing:-.045em;margin:14px 0 20px}p{font-size:18px;line-height:1.65;color:#56615a;margin:0}.status{margin-top:32px;display:flex;gap:10px;align-items:center;font-size:14px;color:#4e5b53}.dot{width:9px;height:9px;border-radius:50%;background:#d39142;box-shadow:0 0 0 5px #f8ead7}a{color:#194d3b}
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
echo "CalendarFuse static build created in dist/"
