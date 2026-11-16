---
description: Triage failing tests and hand back a /goal that keeps Claude fixing until the suite passes
argument-hint: [test-command] [--max-turns N]
allowed-tools: Bash(npm test:*), Bash(npm run:*), Bash(npx:*), Bash(pnpm:*), Bash(yarn:*), Bash(bun:*), Bash(pytest:*), Bash(go test:*), Bash(cargo:*), Bash(make:*), Read, Grep, Glob
disable-model-invocation: true
---

# Fix until green

Prepares a [`/goal`](https://code.claude.com/docs/en/goal) (v2.1.139+) for
the test suite. A goal makes Claude keep taking turns until a separate
evaluator model confirms the condition holds, so you don't have to type
"keep going".

A custom command can't run a built-in command such as `/goal` for you:
its text is sent to Claude as a prompt. So this command does the setup
and ends by printing one `/goal` line for you to run.

## Arguments

$ARGUMENTS

## Your task

1. **Pick the test command.** If the arguments name one, use it exactly.
   Otherwise look for it: the `scripts` in `package.json` (and which lock
   file is present: npm, pnpm, yarn or bun), `pytest.ini` /
   `pyproject.toml`, `go.mod`, `Cargo.toml`, a `test` target in a
   `Makefile`. If you can't tell, ask instead of guessing.
2. **Run it once** and record the baseline: how many tests fail, and the
   first error of each failing test. Don't fix anything yet.
3. **Spot anything that will stall the loop**: tests that need network
   access, secrets, a running service, or a manual step. List them.
   They'll fail on every turn, so they belong in the goal's constraints
   or need fixing by the user first.
4. **Write the goal.** Use one measurable end state, the check that proves
   it, the constraints that must hold on the way, and a turn bound
   (`--max-turns N` from the arguments, default 20):

   ```text
   /goal `<test command>` exits 0 with every test passing. Don't skip, delete or weaken tests, don't change test expectations unless the test itself is wrong (say so when you do), and don't edit unrelated files. Show the final test run. Or stop after <N> turns and summarize what is still failing.
   ```

5. **Reply with:**
   - the baseline (command, pass/fail counts, one line per failure)
   - any stall risks from step 3
   - the `/goal` line in its own code block, ready to paste
   - a reminder that `/goal` runs unattended only in auto mode (Shift+Tab);
     in Manual mode Claude still asks before each unlisted tool call, and
     `/goal clear` stops it early

Don't start fixing tests in this turn. Running `/goal` starts a turn with
the condition as its directive.

Headless alternative, for CI or a background session (one invocation runs
the loop to completion):

```bash
claude -p "/goal npm test exits 0 with every test passing, or stop after 20 turns" \
  --output-format stream-json --verbose
```
