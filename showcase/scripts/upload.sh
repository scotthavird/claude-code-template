#!/usr/bin/env bash
# Upload a rendered film to Havoptic's shared R2 media bucket.
#
#   pnpm --dir showcase upload --slug <slug>
#
# Key layout: showcase/<repo>/<slug>/<file>, served at
# https://media.havoptic.com/showcase/<repo>/<slug>/<file>.
# Auth: wrangler OAuth locally (`wrangler login`), or CLOUDFLARE_API_TOKEN
# (an R2 token scoped to the bucket) in CI.
set -euo pipefail

slug=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --slug) slug="$2"; shift 2 ;;
    *) echo "unknown arg: $1" >&2; exit 2 ;;
  esac
done
[[ -n "$slug" ]] || { echo "usage: upload.sh --slug <slug>" >&2; exit 2; }

here="$(cd "$(dirname "$0")/.." && pwd)"
out="$here/out/$slug"
[[ -d "$out" ]] || { echo "no render at $out — run: pnpm --dir showcase render --slug $slug" >&2; exit 1; }

bucket="${SHOWCASE_MEDIA_BUCKET:-havoptic-prod-media}"
repo="${SHOWCASE_MEDIA_REPO:-claude-code-template}"
prefix="showcase/$repo/$slug"

# Paths are versioned by slug; re-renders overwrite in place, so keep the
# edge TTL modest rather than immutable.
cache="public, max-age=86400"

type_for() {
  case "$1" in
    *.mp4) echo video/mp4 ;;
    *.webm) echo video/webm ;;
    *.vtt) echo text/vtt ;;
    *.png) echo image/png ;;
    *.gif) echo image/gif ;;
    *) echo application/octet-stream ;;
  esac
}

for f in hero-16x9.mp4 hero.webm social-9x16.mp4 social-1x1.mp4 captions.vtt captions-social.vtt poster.png; do
  [[ -f "$out/$f" ]] || { echo "skip $f (not rendered)"; continue; }
  echo "→ $bucket/$prefix/$f"
  npx -y wrangler@4 r2 object put "$bucket/$prefix/$f" \
    --file "$out/$f" \
    --content-type "$(type_for "$f")" \
    --cache-control "$cache" \
    --remote >/dev/null
done

echo "done: https://media.havoptic.com/$prefix/"
