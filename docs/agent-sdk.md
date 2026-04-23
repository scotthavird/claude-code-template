# Agent SDK

This template includes a [`sdk/`](../sdk/) directory with TypeScript and
Python starters. The SDK lets you embed Claude Code's agent loop inside
your own applications — build custom bots, automations, or review tools.

Full reference: [Agent SDK overview](https://code.claude.com/docs/en/agent-sdk/overview).

## When to reach for the SDK

| Need | Use |
|---|---|
| Interactive coding | CLI (`claude`) |
| One-off CI job | CLI headless (`claude -p "..."`) |
| Recurring scheduled job | [Routines](https://code.claude.com/docs/en/routines) |
| Long-running service, custom tools, custom orchestration | SDK |
| GitHub PR automation | [Claude Code Action](https://code.claude.com/docs/en/github-actions) |

## Key SDK concepts

- **`query()`** — the main entrypoint. Streams messages from the agent
  loop as an async iterable.
- **Options** — `cwd`, `permissionMode`, `model`, `maxTurns`, `tools`,
  `mcpServers`, `allowedTools`, `disallowedTools`.
- **Custom tools** — JSON Schema + handler. See
  [`sdk/custom-tool-example.ts`](../sdk/custom-tool-example.ts).
- **Hooks** — same lifecycle events as the CLI, intercepted in your
  process. See [SDK hooks](https://code.claude.com/docs/en/agent-sdk/hooks).
- **Sessions** — persist and resume conversations. See
  [sessions](https://code.claude.com/docs/en/agent-sdk/sessions).
- **Subagents** — spawn specialized agents programmatically. See
  [SDK subagents](https://code.claude.com/docs/en/agent-sdk/subagents).
- **Structured output** — constrain the final response to a JSON schema.
  See [structured outputs](https://code.claude.com/docs/en/agent-sdk/structured-outputs).

## Safety for production deployments

Read [Securely deploying AI agents](https://code.claude.com/docs/en/agent-sdk/secure-deployment)
before shipping an SDK-based service. The key points:

- Never run in `bypassPermissions` mode against a user's data without
  sandboxing.
- Validate every tool handler input — treat Claude-generated arguments
  as untrusted input.
- Set `maxTurns` and cost budgets.
- Log tool calls for audit.

## Observability

See [OpenTelemetry observability](https://code.claude.com/docs/en/agent-sdk/observability).
The SDK emits OTel spans for each turn and tool call — point them at
your collector of choice.
