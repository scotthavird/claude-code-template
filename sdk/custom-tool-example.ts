/**
 * Example: give Claude a custom tool via the Agent SDK.
 *
 * Custom tools are the main extension point for the SDK. Each tool is
 * declared as JSONSchema + a handler, and becomes callable by Claude
 * like any built-in tool.
 */
import { query, tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

const weather = tool({
  name: "get_weather",
  description: "Return the current temperature in Celsius for a city.",
  inputSchema: z.object({
    city: z.string().describe("City name, e.g. 'Berlin'"),
  }),
  handler: async ({ city }) => {
    // Stubbed. In a real tool, call a weather API here.
    const fake: Record<string, number> = { Berlin: 14, Tokyo: 22, Austin: 31 };
    const c = fake[city];
    if (c === undefined) throw new Error(`no data for ${city}`);
    return { temperature_c: c };
  },
});

async function main() {
  const session = query({
    prompt: "What's the weather in Berlin and Tokyo? Which is warmer?",
    options: {
      model: "claude-sonnet-4-6",
      tools: [weather],
      maxTurns: 6,
    },
  });

  for await (const message of session) {
    if (message.type === "assistant") {
      for (const block of message.message.content) {
        if (block.type === "text") process.stdout.write(block.text);
      }
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
