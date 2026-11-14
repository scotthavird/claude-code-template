/**
 * Auth for the recording sandbox.
 *
 * The sandbox runs `claude` with an isolated HOME, so the host's settings,
 * memory, plugins and MCP servers are invisible to it. Credentials reach it in
 * one of three ways. The recorder never writes a credential to disk and never
 * logs one; anything credential-shaped is also scrubbed from casts.
 *
 * Precedence (`--auth auto`):
 *   1. ANTHROPIC_API_KEY        Preferred. The only mode the replay proxy can use
 *                               (ANTHROPIC_BASE_URL + OAuth is not supported).
 *   2. CLAUDE_CODE_OAUTH_TOKEN  A long-lived token from `claude setup-token`.
 *   3. host-login               No credential passes through the recorder at all:
 *                               the sandbox keeps an isolated HOME but leaves
 *                               CLAUDE_CONFIG_DIR unset, so `claude` itself finds
 *                               the host's claude.ai login in the macOS keychain
 *                               ("Claude Code-credentials"). Run `claude auth status`
 *                               via `pnpm doctor` to check it works.
 */

export type AuthMode = "auto" | "api-key" | "oauth-env" | "host-login";

export interface AuthEnv {
  kind: "api-key" | "oauth-env" | "host-login";
  /** Env vars to add to the child. */
  env: Record<string, string>;
  /** host-login must not override CLAUDE_CONFIG_DIR (the keychain service name depends on it). */
  isolateConfigDir: boolean;
}

export function resolveAuth(mode: AuthMode = "auto"): AuthEnv {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const oauth = process.env.CLAUDE_CODE_OAUTH_TOKEN;
  if ((mode === "auto" || mode === "api-key") && apiKey) {
    return {
      kind: "api-key",
      env: { ANTHROPIC_API_KEY: apiKey },
      isolateConfigDir: true,
    };
  }
  if ((mode === "auto" || mode === "oauth-env") && oauth) {
    return {
      kind: "oauth-env",
      env: { CLAUDE_CODE_OAUTH_TOKEN: oauth },
      isolateConfigDir: true,
    };
  }
  if (mode === "auto" || mode === "host-login") {
    if (process.platform !== "darwin" && mode === "auto") {
      throw new Error(
        "No ANTHROPIC_API_KEY or CLAUDE_CODE_OAUTH_TOKEN set (host-login is macOS-only).",
      );
    }
    // Keychain lookups use the real account name.
    const user = process.env.USER ?? "";
    return {
      kind: "host-login",
      env: user ? { USER: user, LOGNAME: user } : {},
      isolateConfigDir: false,
    };
  }
  throw new Error(
    [
      `--auth ${mode}: no credential found.`,
      "Set ANTHROPIC_API_KEY, or run `claude setup-token` and export CLAUDE_CODE_OAUTH_TOKEN,",
      "or use --auth host-login (macOS) to let claude read the host login itself.",
    ].join("\n"),
  );
}

/** Values that must never appear in casts, screens or logs. */
export function secretValues(auth: AuthEnv): string[] {
  return Object.entries(auth.env)
    .filter(([k]) => k !== "USER" && k !== "LOGNAME")
    .map(([, v]) => v)
    .filter((v) => v.length >= 12);
}

/** Host identifiers to scrub from casts (username, home path). */
export function hostIdentifiers(): string[] {
  const out = new Set<string>();
  if (process.env.HOME) out.add(process.env.HOME);
  return [...out].filter((v) => v.length >= 3);
}
