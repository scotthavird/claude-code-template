#!/usr/bin/env bash
# Upload a rendered film to Havoptic's shared R2 media bucket.
#
#   pnpm --dir showcase upload --slug <slug> [--only <file>]... [--dry-run]
#
# Key layout: showcase/<repo>/<slug>/<file>, served at
# https://media.havoptic.com/showcase/<repo>/<slug>/<file>.
#
# Auth, in order:
#   1. S3 API (CI): CLOUDFLARE_R2_MEDIA_ACCESS_KEY_ID +
#      CLOUDFLARE_R2_MEDIA_SECRET_ACCESS_KEY + CLOUDFLARE_ACCOUNT_ID, an R2
#      token scoped to the bucket. Uploads with `aws s3 cp` (preinstalled on
#      GitHub's ubuntu runners). Bucket-scoped tokens only work over S3: the
#      REST object API that wrangler uses refuses them with a 401.
#   2. wrangler (laptop): `wrangler login` OAuth, or an account-wide
#      CLOUDFLARE_API_TOKEN.
#
# --only <file> uploads just that file (repeatable). --dry-run prints what
# would be uploaded, and with which backend, without touching the bucket.
set -euo pipefail

slug=""
dry_run=0
only=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --slug) slug="$2"; shift 2 ;;
    --only) only+=("$2"); shift 2 ;;
    --dry-run) dry_run=1; shift ;;
    *) echo "unknown arg: $1" >&2; exit 2 ;;
  esac
done
[[ -n "$slug" ]] || { echo "usage: upload.sh --slug <slug> [--only <file>]... [--dry-run]" >&2; exit 2; }

here="$(cd "$(dirname "$0")/.." && pwd)"
out="$here/out/$slug"
[[ -d "$out" ]] || { echo "no render at $out — run: pnpm --dir showcase render --slug $slug" >&2; exit 1; }

bucket="${SHOWCASE_MEDIA_BUCKET:-havoptic-prod-media}"
repo="${SHOWCASE_MEDIA_REPO:-claude-code-template}"
prefix="showcase/$repo/$slug"

# Paths are versioned by slug; re-renders overwrite in place, so keep the
# edge TTL modest rather than immutable.
cache="public, max-age=86400"

files=(hero-16x9.mp4 hero.webm social-9x16.mp4 social-1x1.mp4 captions.vtt captions-social.vtt poster.png)
if [[ ${#only[@]} -gt 0 ]]; then
  for f in "${only[@]}"; do
    [[ " ${files[*]} " == *" $f "* ]] || { echo "--only $f: not one of: ${files[*]}" >&2; exit 2; }
  done
  files=("${only[@]}")
fi

if [[ -n "${CLOUDFLARE_R2_MEDIA_ACCESS_KEY_ID:-}" && -n "${CLOUDFLARE_R2_MEDIA_SECRET_ACCESS_KEY:-}" ]]; then
  [[ -n "${CLOUDFLARE_ACCOUNT_ID:-}" ]] || { echo "CLOUDFLARE_ACCOUNT_ID is required with the R2 S3 credentials" >&2; exit 1; }
  backend=s3
  endpoint="https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com"
  if [[ $dry_run -eq 0 ]]; then
    command -v aws >/dev/null || { echo "aws CLI not found (needed for the S3 upload path)" >&2; exit 1; }
  fi
else
  backend=wrangler
fi
echo "backend: $backend"

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

put_s3() {
  # Credentials go in through the environment only, never argv. Newer AWS
  # CLIs add CRC checksums to every request by default; R2 has been picky
  # about those, so only send them when an operation requires one.
  AWS_ACCESS_KEY_ID="$CLOUDFLARE_R2_MEDIA_ACCESS_KEY_ID" \
  AWS_SECRET_ACCESS_KEY="$CLOUDFLARE_R2_MEDIA_SECRET_ACCESS_KEY" \
  AWS_SESSION_TOKEN="" \
  AWS_DEFAULT_REGION=auto \
  AWS_REQUEST_CHECKSUM_CALCULATION=when_required \
  AWS_RESPONSE_CHECKSUM_VALIDATION=when_required \
    aws s3 cp "$1" "s3://$bucket/$2" \
      --endpoint-url "$endpoint" \
      --content-type "$3" \
      --cache-control "$cache" \
      --only-show-errors
}

put_wrangler() {
  npx -y wrangler@4 r2 object put "$bucket/$2" \
    --file "$1" \
    --content-type "$3" \
    --cache-control "$cache" \
    --remote >/dev/null
}

uploaded=0
for f in "${files[@]}"; do
  [[ -f "$out/$f" ]] || { echo "skip $f (not rendered)"; continue; }
  type="$(type_for "$f")"
  if [[ $dry_run -eq 1 ]]; then
    echo "[dry-run] $out/$f → $bucket/$prefix/$f ($type, $cache)"
    continue
  fi
  echo "→ $bucket/$prefix/$f"
  "put_$backend" "$out/$f" "$prefix/$f" "$type"
  uploaded=$((uploaded + 1))
done

if [[ $dry_run -eq 1 ]]; then
  echo "dry run: nothing uploaded"
else
  echo "done ($uploaded file(s)): https://media.havoptic.com/$prefix/"
fi
