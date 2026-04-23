---
description: Trace a bug from symptom to root cause via the debugger subagent.
argument-hint: [error-message-or-description]
allowed-tools: Task, Read, Grep, Glob, Bash(git:*)
---

# Debug Command

Delegate to the `debugger` subagent. It will:

1. Confirm the symptom is fully specified (ask you if not).
2. Trace the stack through the code.
3. State a hypothesis with a falsifiable test.
4. Verify before proposing a fix.

## Your task

$ARGUMENTS

Pass the error message, stack trace, or reproduction to the debugger
subagent. Do not attempt a fix in the main loop until the subagent
reports root cause.
