# Agent SDK Starter

Build your own agents on top of Claude Code's tools and permissions
using the Agent SDK. This directory contains a minimal TypeScript and
Python example each.

## When to use the SDK vs. the CLI

- **CLI (`claude`)** — interactive coding, one-off automation, CI jobs
  (`claude -p "..."`).
- **SDK** — long-running services, custom orchestration, embedding Claude
  Code's agent loop inside your own product.

## TypeScript

```bash
cd sdk
npm install
npm run example      # runs example.ts
```

See [`example.ts`](./example.ts).

## Python

```bash
cd sdk
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python example.py
```

See [`example.py`](./example.py).

## Learn more

- [Agent SDK overview](https://code.claude.com/docs/en/agent-sdk/overview)
- [Agent loop internals](https://code.claude.com/docs/en/agent-sdk/agent-loop)
- [Custom tools](https://code.claude.com/docs/en/agent-sdk/custom-tools)
- [Streaming output](https://code.claude.com/docs/en/agent-sdk/streaming-output)
- [Permissions in the SDK](https://code.claude.com/docs/en/agent-sdk/permissions)
- [Subagents in the SDK](https://code.claude.com/docs/en/agent-sdk/subagents)
- [TypeScript SDK reference](https://code.claude.com/docs/en/agent-sdk/typescript)
- [Python SDK reference](https://code.claude.com/docs/en/agent-sdk/python)
