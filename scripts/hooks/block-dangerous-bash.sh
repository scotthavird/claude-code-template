#!/bin/bash
# PreToolUse hook for Bash.
# Blocks obviously dangerous shell patterns before execution.
#
# Exit codes:
#   0 = allow
#   2 = block with message on stderr (surfaced to the model)
#
# The matcher strips quoted string contents (single and double quotes) so
# that descriptive text appearing inside a heredoc or a --body argument
# does not trigger a block. Each pattern requires a shell command boundary
# (start of command, or a separator like ;, &&, ||, |) to reduce false
# positives further.

set -u

payload="$(cat)"

if ! command -v jq >/dev/null 2>&1; then
  exit 0
fi

cmd="$(printf '%s' "$payload" | jq -r '.tool_input.command // empty' 2>/dev/null)"
[ -z "$cmd" ] && exit 0

# Normalize $cmd before matching, in this order:
#   1. Strip shell comments (# to end of line), so dangerous patterns
#      described in comments don't trigger blocks.
#   2. Flatten newlines to spaces, so multi-line quoted regions and
#      heredoc bodies become single-line spans.
#   3. Strip single- and double-quoted content, so dangerous patterns
#      appearing as string literals (e.g. inside --body "...") don't
#      trigger blocks.
# Conservative: edge cases (escaped quotes, `#` inside URLs) may slip
# through. This is fine — the hook is a safety net, not the primary
# defense. Primary defense is the permissions deny list in settings.json.
no_comments="$(printf '%s' "$cmd" | sed -E 's/(^|[[:space:]])#.*$//')"
flat="$(printf '%s' "$no_comments" | tr '\n' ' ')"
check="$(printf '%s' "$flat" \
  | sed -e "s/'[^']*'//g" \
  | sed -e 's/"[^"]*"//g')"

block() {
  echo "BLOCKED by block-dangerous-bash hook: $1" >&2
  echo "Command: $cmd" >&2
  exit 2
}

# Command boundary: start of string, or after ; && || | (
boundary='(^|[[:space:]]*(;|&&|\|\||\||\()[[:space:]]*)'

if printf '%s' "$check" | grep -qE "${boundary}rm[[:space:]]+-rf?[[:space:]]+(/|~|\\\$HOME)([[:space:]]|\$|[^a-zA-Z0-9/_.-])"; then
  block "destructive recursive remove on root/home"
fi

if printf '%s' "$check" | grep -qE ':[[:space:]]*\(\)[[:space:]]*\{[[:space:]]*:\|:'; then
  block "fork bomb"
fi

if printf '%s' "$check" | grep -qE "${boundary}mkfs\."; then
  block "filesystem format"
fi

if printf '%s' "$check" | grep -qE "${boundary}dd[[:space:]]+[^|;]*if=/dev/[^|;]*of=/dev/sd"; then
  block "raw disk write"
fi

if printf '%s' "$check" | grep -qE "${boundary}chmod[[:space:]]+-R[[:space:]]+777"; then
  block "recursive world-writable permissions"
fi

if printf '%s' "$check" | grep -qE "(curl|wget)[[:space:]]+[^|]*\|[[:space:]]*(sh|bash)([[:space:]]|\$)"; then
  block "pipe-to-shell from network"
fi

if printf '%s' "$check" | grep -qE "git[[:space:]]+push[[:space:]]+(--force|-f)([[:space:]]|\$).*\b(main|master)\b"; then
  block "force-push to main/master"
fi

if printf '%s' "$check" | grep -qE "git[[:space:]]+reset[[:space:]]+--hard[[:space:]]+origin"; then
  block "hard reset to origin (may destroy work)"
fi

exit 0
