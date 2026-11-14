#!/bin/bash
# PostToolUse hook for Bash | Read | Grep tool output redaction.
# Demonstrates the v2.1.122 hookSpecificOutput.updatedToolOutput field,
# which lets a PostToolUse hook rewrite the tool output the model sees.
#
# Use case: prevent secret-shaped strings (API keys, JWTs, AWS creds)
# from being read by Claude even if they slip into a Bash result or a
# grep over a file the deny-list missed.
#
# updatedToolOutput must have the same shape as the tool's own output
# (e.g. Read returns {type, file: {filePath, content, ...}}, Bash returns
# {stdout, stderr, ...}), so we walk tool_response and redact every string
# inside it, keeping the structure intact.
#
# Conservative: redaction is fail-open. If anything goes wrong we leave
# the output untouched.

set -u

payload="$(cat)"

if ! command -v jq >/dev/null 2>&1; then
  exit 0
fi

# Patterns to redact. Add to taste. Order matters: specific before generic.
result="$(printf '%s' "$payload" | jq -c '
  def redact:
    gsub("sk-ant-api[0-9-]+-[A-Za-z0-9_-]{20,}"; "[REDACTED-anthropic-key]")
    | gsub("sk-[A-Za-z0-9_-]{20,}"; "[REDACTED-openai-style-key]")
    | gsub("AKIA[0-9A-Z]{16}"; "[REDACTED-aws-access-key]")
    | gsub("ghp_[A-Za-z0-9]{36}"; "[REDACTED-github-pat]")
    | gsub("github_pat_[A-Za-z0-9_]{82}"; "[REDACTED-github-fine-grained-pat]")
    | gsub("eyJ[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+"; "[REDACTED-jwt]")
    | gsub("xox[abprs]-[A-Za-z0-9-]{10,}"; "[REDACTED-slack-token]");
  (.tool_response // .tool_output // empty) as $out
  | ($out | walk(if type == "string" then redact else . end)) as $red
  | if $red == $out then empty
    else {hookSpecificOutput: {hookEventName: "PostToolUse", updatedToolOutput: $red}}
    end
' 2>/dev/null)"

# Nothing matched (or jq failed): exit silently, output untouched.
[ -z "$result" ] && exit 0

printf '%s\n' "$result"
exit 0
