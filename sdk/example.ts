/**
 * Minimal Agent SDK example in TypeScript.
 *
 * Requires ANTHROPIC_API_KEY in the environment. Run with:
 *   npm run example
 */
import { query } from "@anthropic-ai/claude-agent-sdk";

async function main() {
  const prompt = process.argv.slice(2).join(" ") ||
    "Summarize the top-level files in this repository in one sentence each.";

  const session = query({
    prompt,
    options: {
      // Reuse the same CLAUDE.md / settings / MCP config as the CLI by
      // pointing at the repo root.
      cwd: process.cwd(),
      permissionMode: "acceptEdits",
      model: "claude-sonnet-4-6",
      maxTurns: 20,
    },
  });

  for await (const message of session) {
    if (message.type === "assistant") {
      for (const block of message.message.content) {
        if (block.type === "text") {
          process.stdout.write(block.text);
        }
      }
    } else if (message.type === "result") {
      console.log(
        `\n\n— done. turns=${message.num_turns} cost=$${message.total_cost_usd.toFixed(4)}`,
      );
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
