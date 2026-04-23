"""Minimal Agent SDK example in Python.

Requires ANTHROPIC_API_KEY in the environment. Run with:
    python example.py "your prompt here"
"""

import asyncio
import sys

from claude_agent_sdk import ClaudeAgentOptions, query


async def main() -> None:
    prompt = " ".join(sys.argv[1:]) or (
        "Summarize the top-level files in this repository in one sentence each."
    )

    options = ClaudeAgentOptions(
        cwd=".",
        permission_mode="acceptEdits",
        model="claude-sonnet-4-6",
        max_turns=20,
    )

    async for message in query(prompt=prompt, options=options):
        # Stream assistant text as it arrives.
        msg_type = getattr(message, "type", None)
        if msg_type == "assistant":
            for block in message.message.content:
                if getattr(block, "type", None) == "text":
                    print(block.text, end="", flush=True)
        elif msg_type == "result":
            print(
                f"\n\n— done. turns={message.num_turns} "
                f"cost=${message.total_cost_usd:.4f}"
            )


if __name__ == "__main__":
    asyncio.run(main())
