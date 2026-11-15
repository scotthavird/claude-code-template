# Cross-Session Messaging

A condensed guide to letting your Claude Code sessions message each other.
See the [official doc](https://code.claude.com/docs/en/cross-session-messaging)
for the full rules. Checked against Claude Code v2.1.325.

When you run several sessions in parallel (one per worktree, or a fleet of
[background sessions](agent-view.md)), one of them often learns something
another needs: a schema changed, a migration finished, a decision was made.
Instead of you copy-pasting between terminals, Claude in one session can
send a short text message to another.

It's on by default from v2.1.224 (macOS, Linux, WSL 2) and v2.1.234
(native Windows). Nothing to enable.

## How it works

- Claude finds targets with the `ListAgents` tool and sends with
  `SendMessage`. You never call either yourself.
- A message is plain text that one Claude writes to another. It never
  carries the sender's history or files. To move a whole conversation,
  resume the session instead.
- On the same machine, messages travel over a per-session Unix socket (a
  named pipe on Windows), never through Anthropic servers. Sessions on
  your other machines or in the cloud are reached through Remote Control.
- A receiving session that's busy reads the message between tool calls.
  An idle one starts a new turn with it. Either way it counts toward usage
  like a prompt you typed.

## Send a message

Ask in plain words and let Claude write the message:

```text
Explain what we just changed in the auth middleware to the session working on the payments API
```

Or name the target with an `@` mention (v2.1.232+). Type `@` and the first
letters of the session's name, then pick it from the typeahead:

```text
Let @api-worker know the schema migration finished and rebasing on main is safe
```

Names with spaces go in quotes, such as `@"release notes"`. A session
answers to the name you gave it with `--name` or `/rename`, or the one
Claude Code generated. This template's
[`inject-context.sh`](../scripts/hooks/inject-context.sh) names sessions
after their feature branch, so the typeahead finds them by branch. A
branch name with a `/` needs quotes, such as `@"feature/auth-refactor"`;
picking it from the typeahead adds them for you.

On the receiving side the message shows as a dim one-line preview, for
example `› Message from @api-worker: Schema migration finished`. Press
`Ctrl+O` to read the full text.

Run `/list-agents` (alias `/peers`) to see which sessions Claude can
reach: this session's subagents and teammates, your other local sessions
including background ones, and, while connected to Remote Control, your
cloud and other-machine sessions. If `/list-agents` isn't recognized, the
session doesn't have messaging.

## Wait for another session without polling

Claude can ask a session on this machine for one notice when it next goes
idle or exits, through `SendMessage`'s `notify_when_idle` input (v2.1.236+,
needed in both sessions):

```text
Tell me when the migration session finishes what it's working on
```

The subscription starts no turn and spends no tokens in the watched
session. If that session is already idle, the notice comes back right
away. Subscriptions expire after 12 hours without a notice. Only the main
conversation can subscribe, and only to local sessions.

## Messages carry no authority

This is the part to internalize before building multi-session workflows.
When session A messages session B, B's Claude is told the text came from
another session, not from you (hardened in v2.1.166):

- **It can't approve anything.** A relayed message never counts as your
  consent and can't answer a pending permission prompt.
- **It can't change configuration.** The receiver won't edit permission
  settings, `CLAUDE.md` or other configuration because another session
  asked.
- **Slash commands don't run.** `/compact` in a message arrives as text.
- **Permission prompts still fire** in the receiving session, and auto
  mode blocks relayed permission requests.

Senders are also told never to ask another session for an action that was
denied in their own. Each session's permission boundary stays its own, so
messaging can't be used to launder a denied action through a session with
looser settings.

## Control what arrives: `crossSessionInbound`

| Value    | Inbound messages                                                      |
| -------- | --------------------------------------------------------------------- |
| `accept` | Delivered to Claude                                                   |
| `hold`   | Shown as a notice, not delivered                                      |
| `refuse` | Dropped                                                               |
| unset    | Decided per message from the two sessions' permission modes (default) |

With the key unset, a session that prompts for permissions (Manual, auto,
`acceptEdits`, `dontAsk`) accepts messages, except from a session that
bypasses permissions. A session in `bypassPermissions` holds every message
for your approval in a dialog, unless the sender bypasses too.

Precedence matters: managed settings, then `--settings`, then user
settings decide. A project or local value only applies when it's
stricter (`refuse` > `hold` > `accept`), so a repo can tighten but never
loosen what you set. To try it for one checkout, add this to your
gitignored `.claude/settings.local.json` (the template's
`settings.local.json.example` has it commented out):

```json
{
  "crossSessionInbound": "hold"
}
```

You can also pick the value in `/config` under **Messages from your other
sessions** (writes user settings).

Related keys:

- `dialogExpiry` (`"60s"`, `"5m"` default, `"10m"`, `"never"`): how long a
  held-message approval dialog waits before dropping the message. User or
  managed settings only, so it has no effect in project files.
- `isolatePeerMachines: true`: ask before any message leaves this machine,
  even in `bypassPermissions`. A `true` from any scope applies.

To stop a session sending and listing, deny the tools by bare name:

```json
{
  "permissions": { "deny": ["SendMessage", "ListAgents"] }
}
```

Denying `SendMessage` also removes messaging to subagents and agent-team
teammates, since the same tool serves both.

## Patterns that work

- **Parallel worktrees on one repo.** Each session tells the others what
  landed: "tell the other sessions in this repo that `UserService.find`
  now returns `null` instead of throwing".
- **Watch a long run.** Background a test or migration session with `/bg`,
  then from your working session: "tell me when the migration session is
  idle". You get one notice instead of checking.
- **Hand over a finding.** "Explain the root cause we just found to
  `@flaky-test`" beats re-explaining it there yourself.

## Limits

- Plain text only, capped at about a million characters per same-machine
  message.
- Rapid bursts to one session are refused at the sender, and repeated
  messages are rate-limited at the receiver, so a loop between two
  sessions stops on its own.
- `claude --bare` sessions don't bind an inbox, so they can't receive.
- A session in a container can't reach one on the host, and WSL 2 can't
  reach native Windows.
- `claude -p` workers do receive. To let one accept messages unattended,
  pass `--settings '{"crossSessionInbound":"accept"}'`.

## See also

- [Agent view and background sessions](agent-view.md)
- [Official: cross-session messaging](https://code.claude.com/docs/en/cross-session-messaging)
- [Official: agent teams](https://code.claude.com/docs/en/agent-teams), for sessions that coordinate as a team
