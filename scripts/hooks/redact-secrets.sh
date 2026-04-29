#!/bin/bash
# PostToolUse hook for Bash | Read | Grep tool output redaction.
# Demonstrates the v2.1.122 hookSpecificOutput.updatedToolOutput field,
# which lets a PostToolUse hook rewrite the tool output the model sees.
#
# Use case: prevent secret-shaped strings (API keys, JWTs, AWS creds)
# from being read by Claude even if they slip into a Bash result or a
# grep over a file the deny-list missed.
#
# Conservative: redaction is fail-open. If anything goes wrong we leave
# the output untouched.

set -u

payload="$(cat)"

if ! command -v jq >/dev/null 2>&1; then
  exit 0
fi

# Only act on textual output. tool_output may be a string or an object.
output_text="$(printf '%s' "$payload" | jq -r '
  (.tool_output // .tool_response // empty)
  | if type == "string" then .
    elif type == "object" and has("output") then .output
    elif type == "object" and has("text") then .text
    else empty
    end
' 2>/dev/null)"

[ -z "$output_text" ] && exit 0

# Patterns to redact. Add to taste.
redacted="$(printf '%s' "$output_text" | sed -E \
  -e 's/(sk-ant-api[0-9-]+-[A-Za-z0-9_-]{20,})/[REDACTED-anthropic-key]/g' \
  -e 's/(sk-[A-Za-z0-9_-]{20,})/[REDACTED-openai-style-key]/g' \
  -e 's/(AKIA[0-9A-Z]{16})/[REDACTED-aws-access-key]/g' \
  -e 's/(ghp_[A-Za-z0-9]{36})/[REDACTED-github-pat]/g' \
  -e 's/(github_pat_[A-Za-z0-9_]{82})/[REDACTED-github-fine-grained-pat]/g' \
  -e 's/(eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)/[REDACTED-jwt]/g' \
  -e 's/(xox[abprs]-[A-Za-z0-9-]{10,})/[REDACTED-slack-token]/g')"

# If nothing changed, exit silently.
if [ "$redacted" = "$output_text" ]; then
  exit 0
fi

# Emit hookSpecificOutput.updatedToolOutput as JSON on stdout.
# Claude Code reads stdout as a JSON object when a hook wants to mutate
# tool output (per v2.1.122).
jq -n --arg text "$redacted" '{
  hookSpecificOutput: {
    updatedToolOutput: $text
  }
}'

exit 0
