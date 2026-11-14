/**
 * Record/replay API proxy (design §3.5). NOT IMPLEMENTED YET: stretch goal.
 *
 * Why it is not needed for re-renders: the pipeline already stores the chosen
 * take as text (features/<slug>/cast.cast). Every compile/render/docs run works
 * from that cast at $0. The proxy only matters for *re-recording* a scenario
 * deterministically (e.g. after a TUI change) without paying again.
 *
 * How to add it:
 *   1. `startProxy({ mode, cassetteDir, upstream })` starts an HTTP server on
 *      127.0.0.1:<port>. record: forward to https://api.anthropic.com, tee each
 *      SSE stream with chunk timings to cassette/NNN.jsonl. replay: serve them
 *      in order, keyed by (model, first tool name, ordinal within model).
 *   2. In record.ts, before createSandbox, start it and pass
 *      { ANTHROPIC_BASE_URL: proxy.url } through the AuthEnv env.
 *   3. Requires --auth api-key: claude.ai OAuth logins do not go through a
 *      custom ANTHROPIC_BASE_URL (design risk #2).
 *   4. cli.ts: `record --replay` -> mode 'replay', no credential needed, $0.
 *   5. Scrub cassettes (system prompt + file contents) with scripts/hooks/redact-secrets.sh
 *      before committing them.
 */
export type ProxyMode = "record" | "replay";

export interface ProxyHandle {
  url: string;
  close(): Promise<void>;
  /** Requests served (replay) or captured (record). */
  count(): number;
}

export async function startProxy(_o: {
  mode: ProxyMode;
  cassetteDir: string;
  upstream?: string;
}): Promise<ProxyHandle> {
  throw new Error(
    "replay proxy not implemented yet (see recorder/src/proxy.ts). Re-renders do not need it: they run from cast.cast at $0.",
  );
}
