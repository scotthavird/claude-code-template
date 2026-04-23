#!/bin/bash
# PostToolUse hook for Edit|Write|MultiEdit.
# Runs the appropriate formatter on the file Claude just modified.
#
# Claude Code passes the tool input/output as JSON on stdin:
#   { "tool_name": "Edit", "tool_input": { "file_path": "..." }, ... }
#
# Exit 0 = success, non-zero = advisory (logged, not blocking).

set -u

payload="$(cat)"

if ! command -v jq >/dev/null 2>&1; then
  exit 0
fi

file="$(printf '%s' "$payload" | jq -r '.tool_input.file_path // .tool_input.path // empty' 2>/dev/null)"
[ -z "$file" ] && exit 0
[ ! -f "$file" ] && exit 0

case "$file" in
  *.ts|*.tsx|*.js|*.jsx|*.json|*.md|*.mdx|*.css|*.scss|*.html|*.yaml|*.yml)
    if command -v npx >/dev/null 2>&1 && [ -f package.json ]; then
      npx --no-install prettier --write "$file" >/dev/null 2>&1 || true
    fi
    ;;
  *.py)
    if command -v ruff >/dev/null 2>&1; then
      ruff format "$file" >/dev/null 2>&1 || true
      ruff check --fix --quiet "$file" >/dev/null 2>&1 || true
    elif command -v black >/dev/null 2>&1; then
      black --quiet "$file" >/dev/null 2>&1 || true
    fi
    ;;
  *.go)
    command -v gofmt >/dev/null 2>&1 && gofmt -w "$file" >/dev/null 2>&1 || true
    ;;
  *.rs)
    command -v rustfmt >/dev/null 2>&1 && rustfmt --quiet "$file" >/dev/null 2>&1 || true
    ;;
  *.sh)
    command -v shfmt >/dev/null 2>&1 && shfmt -w "$file" >/dev/null 2>&1 || true
    ;;
esac

exit 0
