/**
 * Hermetic sandbox for one take.
 *
 *   <root>/home                HOME, CLAUDE_CONFIG_DIR=<root>/home/.claude
 *   <root>/home/<repoName>     the fixture, git-initialised with a fixed commit
 *   <root>/bin                 PATH shims (claude, jq, git ...)
 *
 * The repo lives under HOME so the TUI prints `~/<repoName>` and no host path,
 * username or org name can reach the footage.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { FeatureSpec } from "../../schema/feature.js";
import type { AuthEnv } from "./auth.js";
import { TEMPLATE_ROOT, featureDir } from "./paths.js";

export interface Sandbox {
  root: string;
  home: string;
  configDir: string;
  repo: string;
  env: Record<string, string>;
  args: string[];
  sessionId: string;
}

/** Deterministic UUID (v5-shaped) from slug + take so session ids never reveal anything. */
export function stableUuid(...parts: (string | number)[]): string {
  const h = createHash("sha1").update(parts.join("/")).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${((parseInt(h[16], 16) & 0x3) | 0x8).toString(16)}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

function which(bin: string): string | null {
  try {
    return (
      execFileSync("/usr/bin/which", [bin], { encoding: "utf8" }).trim() || null
    );
  } catch {
    return null;
  }
}

function deepMerge(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...a };
  for (const [k, v] of Object.entries(b)) {
    const cur = out[k];
    if (
      v &&
      typeof v === "object" &&
      !Array.isArray(v) &&
      cur &&
      typeof cur === "object" &&
      !Array.isArray(cur)
    ) {
      out[k] = deepMerge(
        cur as Record<string, unknown>,
        v as Record<string, unknown>,
      );
    } else {
      out[k] = v;
    }
  }
  return out;
}

export function createSandbox(
  spec: FeatureSpec,
  take: number,
  auth: AuthEnv,
): Sandbox {
  const base = fs.realpathSync(os.tmpdir());
  const root = path.join(base, "showcase", spec.slug, `take-${take}`);
  fs.rmSync(root, { recursive: true, force: true });
  const home = path.join(root, "home");
  const configDir = path.join(home, ".claude");
  const repoName = spec.recorder.repoName;
  const repo = path.join(home, repoName);
  const bin = path.join(root, "bin");
  fs.mkdirSync(configDir, { recursive: true });
  fs.mkdirSync(bin, { recursive: true });

  // host-login: macOS resolves the login keychain via $HOME, so expose only
  // ~/Library/Keychains to the sandbox. `claude` then reads its own
  // "Claude Code-credentials" item; the token never passes through the recorder.
  if (auth.kind === "host-login" && process.platform === "darwin") {
    const realKeychains = path.join(os.homedir(), "Library", "Keychains");
    fs.mkdirSync(path.join(home, "Library"), { recursive: true });
    fs.symlinkSync(realKeychains, path.join(home, "Library", "Keychains"));
  }

  // 1. Fixture -> repo
  const fixture = path.join(featureDir(spec.slug), "fixture");
  fs.cpSync(fixture, repo, { recursive: true });
  for (const c of spec.recorder.copy) {
    const dest = path.join(repo, c.to);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.join(TEMPLATE_ROOT, c.from), dest);
    fs.chmodSync(dest, fs.statSync(path.join(TEMPLATE_ROOT, c.from)).mode);
  }

  // 2. Project settings (merged with the spec's recorder.settings)
  const settingsPath = path.join(repo, ".claude", "settings.json");
  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
  const existing = fs.existsSync(settingsPath)
    ? JSON.parse(fs.readFileSync(settingsPath, "utf8"))
    : {};
  const settings = deepMerge(
    deepMerge(
      {
        spinnerTipsEnabled: false,
        includeCoAuthoredBy: false,
        cleanupPeriodDays: 1,
        env: { DISABLE_AUTOUPDATER: "1" },
      },
      existing,
    ),
    spec.recorder.settings as Record<string, unknown>,
  );
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n");

  // 3. Global state: skip onboarding, trust dialog, release notes and tips.
  const version = (() => {
    try {
      return execFileSync("claude", ["--version"], { encoding: "utf8" }).split(
        " ",
      )[0];
    } catch {
      return "0.0.0";
    }
  })();
  const globalState = {
    hasCompletedOnboarding: true,
    lastOnboardingVersion: version,
    lastReleaseNotesSeen: version,
    theme: "dark",
    numStartups: 50,
    autoUpdates: false,
    hasSeenTasksHint: true,
    hasUsedBackslashReturn: true,
    shiftEnterKeyBindingInstalled: true,
    bypassPermissionsModeAccepted: true,
    tipsHistory: {},
    projects: {
      [repo]: {
        hasTrustDialogAccepted: true,
        hasCompletedProjectOnboarding: true,
        projectOnboardingSeenCount: 5,
        allowedTools: [],
      },
    },
  };
  fs.writeFileSync(
    path.join(configDir, ".claude.json"),
    JSON.stringify(globalState, null, 2),
  );
  fs.writeFileSync(
    path.join(home, ".claude.json"),
    JSON.stringify(globalState, null, 2),
  );

  // 4. git init with a fixed identity and date
  const gitEnv = {
    ...process.env,
    HOME: home,
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_AUTHOR_NAME: "dev",
    GIT_AUTHOR_EMAIL: "dev@example.com",
    GIT_COMMITTER_NAME: "dev",
    GIT_COMMITTER_EMAIL: "dev@example.com",
    GIT_AUTHOR_DATE: "2026-01-01T09:00:00Z",
    GIT_COMMITTER_DATE: "2026-01-01T09:00:00Z",
  };
  const git = (...a: string[]) =>
    execFileSync("git", a, { cwd: repo, env: gitEnv, stdio: "ignore" });
  git("init", "-q", "-b", "main");
  git("add", "-A");
  git("commit", "-q", "-m", "Initial commit");

  // 5. PATH shims: only what the scenario needs, no host bin dirs with usernames in them.
  for (const b of ["claude", "jq", "git", "node", "sed", "grep", "cat", "ls"]) {
    const p = which(b);
    if (p) fs.symlinkSync(fs.realpathSync(p), path.join(bin, b));
  }

  const sessionId = stableUuid(spec.slug, take, Date.now());
  const env: Record<string, string> = {
    HOME: home,
    ...(auth.isolateConfigDir ? { CLAUDE_CONFIG_DIR: configDir } : {}),
    USER: "dev",
    LOGNAME: "dev",
    SHELL: "/bin/bash",
    PS1: "$ ",
    TERM: "xterm-256color",
    COLORTERM: "truecolor",
    LANG: "en_US.UTF-8",
    LC_ALL: "en_US.UTF-8",
    TZ: "UTC",
    PATH: `${bin}:/usr/bin:/bin:/usr/sbin:/sbin`,
    TMPDIR: path.join(root, "tmp") + "/",
    DISABLE_AUTOUPDATER: "1",
    CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",
    DISABLE_TELEMETRY: "1",
    DISABLE_ERROR_REPORTING: "1",
    CLAUDE_CODE_DISABLE_TERMINAL_TITLE: "1",
    ...spec.recorder.env,
    ...auth.env,
  };
  fs.mkdirSync(env.TMPDIR, { recursive: true });

  const args = [
    "--model",
    spec.recorder.model,
    "--setting-sources",
    "project,local",
    "--strict-mcp-config",
    "--permission-mode",
    spec.recorder.permissionMode,
    "--session-id",
    sessionId,
  ];
  if (spec.recorder.mode === "headless") {
    args.push(
      "--max-budget-usd",
      String(spec.recorder.budgetUsd),
      "--no-session-persistence",
    );
  }
  if (spec.recorder.pluginDir) args.push("--plugin-dir", TEMPLATE_ROOT);
  args.push(...spec.recorder.args);

  return { root, home, configDir, repo, env, args, sessionId };
}
