/**
 * Spend tracking for interactive takes.
 *
 * `--max-budget-usd` only works with `--print`, so for interactive recordings
 * the recorder enforces the budget itself: it tails the sandbox session
 * transcript, prices every assistant message's usage, and kills the PTY when
 * the estimate crosses the spec's budgetUsd.
 */
import fs from "node:fs";
import path from "node:path";

/** USD per million tokens: [input, output, cacheWrite5m, cacheRead]. Keep conservative (round up). */
const PRICES: { match: RegExp; p: [number, number, number, number] }[] = [
  { match: /haiku/i, p: [1, 5, 1.25, 0.1] },
  { match: /sonnet/i, p: [3, 15, 3.75, 0.3] },
  { match: /opus/i, p: [5, 25, 6.25, 0.5] },
];
const FALLBACK: [number, number, number, number] = [15, 75, 18.75, 1.5];

interface Usage {
  input_tokens?: number;
  output_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
}

export function priceUsage(model: string, u: Usage): number {
  const p = PRICES.find((x) => x.match.test(model))?.p ?? FALLBACK;
  return (
    ((u.input_tokens ?? 0) * p[0] +
      (u.output_tokens ?? 0) * p[1] +
      (u.cache_creation_input_tokens ?? 0) * p[2] +
      (u.cache_read_input_tokens ?? 0) * p[3]) /
    1e6
  );
}

function findTranscripts(home: string, sessionId: string): string[] {
  const roots = [path.join(home, ".claude", "projects")];
  const out: string[] = [];
  for (const r of roots) {
    if (!fs.existsSync(r)) continue;
    for (const d of fs.readdirSync(r)) {
      const dir = path.join(r, d);
      if (!fs.statSync(dir).isDirectory()) continue;
      for (const f of fs.readdirSync(dir)) {
        if (f.endsWith(".jsonl")) out.push(path.join(dir, f));
      }
      const sub = path.join(dir, sessionId);
      if (fs.existsSync(sub)) {
        // subagent transcripts live next to the session
        const walk = (p: string) => {
          for (const f of fs.readdirSync(p)) {
            const fp = path.join(p, f);
            if (fs.statSync(fp).isDirectory()) walk(fp);
            else if (f.endsWith(".jsonl")) out.push(fp);
          }
        };
        walk(sub);
      }
    }
  }
  return out;
}

export interface SpendReport {
  usd: number;
  messages: number;
  models: string[];
}

/** Every assistant message in the sandbox's transcripts, deduplicated by message id. */
export function measureSpend(home: string, sessionId: string): SpendReport {
  const seen = new Map<string, number>();
  const models = new Set<string>();
  for (const file of findTranscripts(home, sessionId)) {
    let text = "";
    try {
      text = fs.readFileSync(file, "utf8");
    } catch {
      continue;
    }
    for (const line of text.split("\n")) {
      if (!line.includes('"usage"')) continue;
      try {
        const j = JSON.parse(line) as {
          message?: { id?: string; model?: string; usage?: Usage };
        };
        const m = j.message;
        if (!m?.usage || !m.model) continue;
        models.add(m.model);
        // streaming writes the same message id several times; the last write carries the final usage
        seen.set(m.id ?? `${file}:${seen.size}`, priceUsage(m.model, m.usage));
      } catch {
        /* partial line */
      }
    }
  }
  let usd = 0;
  for (const v of seen.values()) usd += v;
  return { usd, messages: seen.size, models: [...models] };
}
