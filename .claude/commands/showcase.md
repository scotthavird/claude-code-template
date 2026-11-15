---
description: Turn a Claude Code feature into a marketing-grade film + docs page via the Feature Showcase Pipeline.
argument-hint: <slug> | "<version>: <changelog bullet>"
allowed-tools: Bash(pnpm --dir showcase:*), Bash(ls:*), Read, Edit, Write, Agent
---

# /showcase

Argument: `$ARGUMENTS`

You run the Feature Showcase Pipeline in `showcase/` (see `showcase/README.md`).
One `showcase/features/<slug>/spec.yaml` + `fixture/` becomes a 16:9 hero film,
9:16 and 1:1 social cuts, a loop GIF, a poster, captions and `docs/features/<slug>.md`.

## Steps

1. **Resolve the spec.**
   - If `$ARGUMENTS` is an existing directory under `showcase/features/`, use it.
   - Otherwise treat it as a changelog entry and delegate to the
     `showcase-spec-writer` subagent. It writes `spec.yaml` + `fixture/` and
     returns the slug plus any risky `wait:` regexes.
2. **Validate:** `pnpm --dir showcase validate --slug <slug>`. Fix errors in the spec until it passes.
3. **Check auth for free:** `pnpm --dir showcase doctor --slug <slug>`.
   If not logged in, stop and tell the user to set `ANTHROPIC_API_KEY` (or
   `CLAUDE_CODE_OAUTH_TOKEN` from `claude setup-token`), or to pass `--auth host-login` on macOS.
4. **Record (spends real credits).** If `showcase/features/<slug>/cast.cast` already
   exists and the spec's scenario did not change, skip this step. Otherwise print the worst
   case (`takes.max × budgetUsd`, shown by the record command) and **ask the user to confirm**, then:
   `pnpm --dir showcase record --slug <slug> --yes`
   On a failed take, read the printed final screen, loosen the failing `wait:`/`expect:`
   regex, and retry at most once more.
5. **Compile:** `pnpm --dir showcase compile --slug <slug>`. Every anchor must resolve;
   use `pnpm --dir showcase screen --slug <slug> --at <marker>`
   to see the exact screen text when fixing a `match:` regex.
6. **Direct (visual QA, $0):** delegate to the `showcase-director` subagent with the slug.
   Apply the spec edits it returns, recompile, and repeat. At most two loops.
7. **Render:** `pnpm --dir showcase render --slug <slug>` (2–5 min).
8. **Docs:** `pnpm --dir showcase docs --slug <slug>`.
9. **Report** the output paths and sizes from `showcase/out/<slug>/manifest.json`,
   the spend from `showcase/features/<slug>/takes/spend.json`, and the director's verdict.
   Remind the user that MP4/WebM/VTT go to Havoptic's shared R2 media bucket
   (`pnpm --dir showcase upload --slug <slug>`, served from
   `https://media.havoptic.com/showcase/claude-code-template/<slug>/`) and only
   `docs/features/<slug>/{loop.gif,poster.png}` are committed. Uploading publishes
   the files publicly, so confirm with the user before running it. Offer `/commit` and `/pr`.

## Rules

- Never print or commit credentials. Never put real usernames, host paths or org names in a spec or fixture.
- Fixture secrets must be obviously fake (`FAKE`, `demo`, `not-real`).
- Re-renders after the first recording cost $0: tweak timing, zoom and copy in the spec, then compile + render again.
