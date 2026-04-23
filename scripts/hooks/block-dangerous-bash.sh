#!/bin/bash
# PreToolUse hook for Bash.
# Blocks obviously dangerous shell patterns before execution.
#
# Exit codes:
#   0 = allow
#   2 = block with message on stderr (Claude Code surfaces this to the model)

set -u

payload="$(cat)"

if ! command -v jq >/dev/null 2>&1; then
  # Without jq we cannot reliably parse; fail open.
  exit 0
fi

cmd="$(printf '%s' "$payload" | jq -r '.tool_input.command // empty' 2>/dev/null)"
[ -z "$cmd" ] && exit 0

block() {
  echo "BLOCKED by block-dangerous-bash hook: $1" >&2
  echo "Command: $cmd" >&2
  exit 2
}

# Patterns that are almost never intentional.
case "$cmd" in
  *"rm -rf /"*|*"rm -rf /*"*|*"rm -rf ~"*|*"rm -rf \$HOME"*) block "destructive recursive remove on root/home" ;;
  *":(){ :|:& };:"*) block "fork bomb" ;;
  *"mkfs."*) block "filesystem format" ;;
  *"dd if=/dev/"*"of=/dev/sd"*) block "raw disk write" ;;
  *"chmod -R 777"*) block "recursive world-writable permissions" ;;
  *"curl "*" | sh"*|*"curl "*" | bash"*|*"wget "*" | sh"*|*"wget "*" | bash"*) block "pipe-to-shell from network" ;;
  *"git push --force"*main*|*"git push -f"*main*|*"git push --force"*master*|*"git push -f"*master*) block "force-push to main/master" ;;
  *"git reset --hard"*origin*) block "hard reset to origin (may destroy work)" ;;
  *"eval \$"*) block "eval of unquoted expansion" ;;
esac

exit 0
