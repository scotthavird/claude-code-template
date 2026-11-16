#!/usr/bin/env bash
# Download Remotion's Chrome Headless Shell and make sure it is fully unpacked.
#
#   pnpm --dir showcase setup
#
# `remotion browser ensure` can leave the zip only partly extracted (just
# ABOUT + LICENSE), and rendering then fails with "No browser found for
# rendering frames". This re-extracts the zip when the binary is missing.
set -euo pipefail

here="$(cd "$(dirname "$0")/.." && pwd)"
cd "$here"

# `ensure` itself exits non-zero ("should have downloaded browser") when the
# extraction is partial, so keep going and repair it below.
pnpm exec remotion browser ensure || echo "remotion browser ensure failed; checking the extracted binary"

dir="node_modules/.remotion/chrome-headless-shell"
for zip in "$dir"/chrome-headless-shell-*.zip; do
  [[ -f "$zip" ]] || continue
  name="$(basename "$zip" .zip)"             # chrome-headless-shell-mac-arm64
  platform="${name#chrome-headless-shell-}"  # mac-arm64
  bin="$dir/$platform/$name/chrome-headless-shell"
  if [[ ! -x "$bin" ]]; then
    echo "re-extracting $zip (binary missing)"
    unzip -q -o "$zip" -d "$dir/$platform"
  fi
  [[ -x "$bin" ]] && echo "browser ok: $bin"
done
