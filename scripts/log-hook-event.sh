#!/bin/bash

# Hook event logging script for Claude Code Template
# This script logs all hook events to JSON files for later analysis

# Get the current timestamp
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")

# Create logs directory if it doesn't exist
mkdir -p logs

# Read the hook input from stdin
HOOK_INPUT=$(cat)

# Parse the event type and other details from the input
EVENT_TYPE=$(echo "$HOOK_INPUT" | jq -r '.event // "unknown"')
TOOL_NAME=$(echo "$HOOK_INPUT" | jq -r '.tool.name // "unknown"')
TOOL_ARGS=$(echo "$HOOK_INPUT" | jq -c '.tool.arguments // {}')

# Create the log entry
LOG_ENTRY=$(jq -n \
  --arg timestamp "$TIMESTAMP" \
  --arg event_type "$EVENT_TYPE" \
  --arg tool_name "$TOOL_NAME" \
  --argjson tool_args "$TOOL_ARGS" \
  --argjson full_input "$HOOK_INPUT" \
  '{
    timestamp: $timestamp,
    event_type: $event_type,
    tool_name: $tool_name,
    tool_arguments: $tool_args,
    full_input: $full_input
  }')

# Log to both daily file and general events file
DATE=$(date +"%Y-%m-%d")
echo "$LOG_ENTRY" >> "logs/hooks-${DATE}.jsonl"
echo "$LOG_ENTRY" >> "logs/all-hooks.jsonl"

# Also log to event-specific file for easier filtering
echo "$LOG_ENTRY" >> "logs/${EVENT_TYPE,,}-events.jsonl"

# Output success message (optional, can be removed for cleaner logs)
echo "Logged $EVENT_TYPE event for tool $TOOL_NAME at $TIMESTAMP" >&2

# Return success
exit 0 