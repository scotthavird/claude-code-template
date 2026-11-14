# Feature Showcase Pipeline

One `features/<slug>/spec.yaml` + one `features/<slug>/fixture/` turns into a
marketing-grade film of a Claude Code feature, recorded from the **real**
`claude` CLI:

| Output (`showcase/out/<slug>/`)       | What                                                               |
| ------------------------------------- | ------------------------------------------------------------------ |
| `hero-16x9.mp4`, `hero.webm`          | 1920×1080 hero film: hook → problem → reveal → demo → enable → CTA |
| `social-9x16.mp4`, `social-1x1.mp4`   | 1080-wide social cuts of the strongest beats                       |
| `loop.gif`                            | 800px seamless loop of the demo for READMEs                        |
| `poster.png`                          | 1280×720 poster                                                    |
| `captions.vtt`, `captions-social.vtt` | captions (the films are silent with burned-in captions)            |

`pnpm docs` then writes `docs/features/<slug>.md` and copies only `loop.gif` and
`poster.png` into `docs/features/<slug>/`. MP4/WebM are uploaded as GitHub
Release assets (tag `showcase-<slug>`), never committed.

## How it works

```
spec.yaml + fixture/
  └─ record   node-pty drives `claude` in a hermetic sandbox (fake HOME, fixed git identity,
              no MCP, project settings only), types the scenario, waits on the rendered screen,
              scores takes, scrubs paths/emails/keys  →  features/<slug>/cast.cast (asciicast v2 + markers)
  └─ compile  @xterm/headless replays the cast; idle compression, speed ramps and holds become a
              film→cast time table; one styled-cell snapshot per frame; callout regexes → cell boxes;
              leak check  →  studio/public/features/<slug>/film.json
  └─ render   Remotion 4.0.331 draws the terminal as vector text with the clay brand (colors from
              .claude/themes/anthropic-clay.json), camera zooms to anchors, cards avoid covering text
  └─ docs     docs/features/<slug>.md + gallery + README block
```

Re-rendering never touches the API: everything after `record` runs from `cast.cast`.

## Commands (run from the repo root)

```bash
pnpm install                                  # once (pnpm@10.10.0, see packageManager)
pnpm --dir showcase exec remotion browser ensure

pnpm --dir showcase new <slug>                # scaffold spec.yaml + fixture/ from schema/template
pnpm --dir showcase validate --slug <slug>    # zod schema + marker cross-checks
pnpm --dir showcase doctor --slug <slug>      # $0: is the sandbox logged in?
pnpm --dir showcase record --slug <slug>      # LIVE: spends credits, asks to confirm (--yes to skip)
pnpm --dir showcase compile --slug <slug>     # cast → film.json, prints anchors + markers
pnpm --dir showcase screen --slug <slug> --at done+0.5   # print the screen to write match: regexes
pnpm --dir showcase still --slug <slug> [--out dir]      # QA stills for every scene/callout/aspect
pnpm --dir showcase render --slug <slug> [--only gif]    # all outputs → out/<slug>/
pnpm --dir showcase docs --slug <slug>        # docs page + gallery
pnpm --dir showcase build --slug <slug>       # compile + render + docs (no recording)
pnpm --dir showcase studio                    # Remotion Studio on http://localhost:3100
```

Or from Claude Code: `/showcase <slug>` or `/showcase "2.1.130: <changelog bullet>"`
(uses the `showcase-spec-writer` and `showcase-director` subagents).

## Auth for recording

The sandbox has its own HOME, so the host login is invisible to it. In order:

1. `ANTHROPIC_API_KEY` (preferred; also what the future replay proxy needs)
2. `CLAUDE_CODE_OAUTH_TOKEN` from `claude setup-token`
3. `--auth host-login` (macOS, the default fallback): the sandbox HOME gets a symlink to
   `~/Library/Keychains` only, and `claude` reads its own keychain login. No credential
   passes through the recorder.

Interactive `claude` ignores `--max-budget-usd` (it only works with `-p`), so the recorder
enforces `recorder.budgetUsd` itself by pricing the sandbox transcript every second and
killing the take when it crosses the budget. Spend per take is logged in
`features/<slug>/takes/spend.json`.

## Writing a spec

See `schema/feature.ts` (every field documented) and `features/redact-tool-output/spec.yaml`.
Tips:

- `wait:` regexes match the rendered screen. Don't wait for text you typed.
  `idle: 2.0` waits until the screen stops changing (the model finished).
- `callouts[].match` is a regex over the whole screen with rows joined by `\n`.
  `text` is the short card label; `caption` is the burned-in sentence.
- `edit.hold` freezes the picture at a marker (that's where callouts live);
  `edit.remap` speeds up a span (a "4× SPEED" chip is shown so latency is never overstated).
- Fixture secrets must be obviously fake.

## Not built yet

- **Replay proxy** (`recorder/src/proxy.ts` has the interface and the steps to add it).
- **CI** (`.github/workflows/showcase.yml`): replay-only render on PRs, `workflow_dispatch` live record.
  Because renders already run from the committed `cast.cast`, CI can render without the proxy:
  `pnpm install && pnpm --dir showcase exec remotion browser ensure && pnpm --dir showcase build --slug <slug>`.
- **VHS fallback recorder** (`recorder.engine: vhs`) and `/showcase-since`.
