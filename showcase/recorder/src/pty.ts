/**
 * node-pty driver: spawns `claude` in the sandbox and runs a scenario
 * (type / key / wait / idle / sleep / marker / expect) against it.
 *
 * A live @xterm/headless terminal mirrors the PTY so `wait:` regexes match the
 * *rendered* screen (not raw escape codes), and so terminal queries that the
 * TUI sends (DA1, DSR cursor position, ...) get real xterm answers.
 */
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import type { Step } from "../../schema/feature.js";
import { CastWriter } from "./cast.js";

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pty = require("node-pty") as typeof import("node-pty");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Terminal } =
  require("@xterm/headless") as typeof import("@xterm/headless");

/** node-pty's prebuilt spawn-helper sometimes loses +x under pnpm. Heal it. */
function ensureSpawnHelper() {
  try {
    const root = path.dirname(require.resolve("node-pty/package.json"));
    for (const dir of [
      path.join(root, "prebuilds", `${process.platform}-${process.arch}`),
      path.join(root, "build", "Release"),
    ]) {
      const helper = path.join(dir, "spawn-helper");
      if (fs.existsSync(helper)) fs.chmodSync(helper, 0o755);
    }
  } catch {
    /* best effort */
  }
}

export const KEYS: Record<string, string> = {
  enter: "\r",
  tab: "\t",
  "shift+tab": "\x1b[Z",
  esc: "\x1b",
  up: "\x1b[A",
  down: "\x1b[B",
  right: "\x1b[C",
  left: "\x1b[D",
  backspace: "\x7f",
  space: " ",
  "ctrl+c": "\x03",
  "ctrl+d": "\x04",
  "ctrl+l": "\x0c",
  "ctrl+r": "\x12",
};

/** Small deterministic PRNG so typing jitter is identical across takes. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface RunOptions {
  command: string;
  args: string[];
  cwd: string;
  env: Record<string, string>;
  cols: number;
  rows: number;
  seed: number;
  /** Called every second; return a string to abort the take (e.g. budget exceeded). */
  watchdog?: () => string | null;
  maxSeconds?: number;
  log?: (msg: string) => void;
}

export interface RunResult {
  ok: boolean;
  failures: string[];
  writer: CastWriter;
  /** Full rendered buffer text at the end (scrollback + screen). */
  finalText: string;
  /** All output with escape codes stripped, for absent: checks. */
  plainOutput: string;
  aborted?: string;
}

const sleep = (s: number) => new Promise((r) => setTimeout(r, s * 1000));

export function stripAnsi(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(
    /\x1b\[[0-9;?<>=]*[ -/]*[@-~]|\x1b\][^\x07\x1b]*(\x07|\x1b\\)|\x1b[PX^_][^\x1b]*\x1b\\|\x1b[@-Z\\-_]/g,
    "",
  );
}

export async function runScenario(
  steps: Step[],
  o: RunOptions,
): Promise<RunResult> {
  ensureSpawnHelper();
  const log = o.log ?? (() => {});
  const writer = new CastWriter({
    version: 2,
    width: o.cols,
    height: o.rows,
    timestamp: 1767258000, // fixed: 2026-01-01T09:00:00Z
    env: { TERM: "xterm-256color", SHELL: "/bin/bash" },
  });
  const term = new Terminal({
    cols: o.cols,
    rows: o.rows,
    scrollback: 5000,
    allowProposedApi: true,
  });
  let lastChange = writer.now();
  let raw = "";
  let exited = false;

  const child = pty.spawn(o.command, o.args, {
    name: "xterm-256color",
    cols: o.cols,
    rows: o.rows,
    cwd: o.cwd,
    env: o.env,
  });
  child.onData((d) => {
    writer.output(d);
    raw += d;
    lastChange = writer.now();
    term.write(d);
  });
  // xterm answers terminal queries (DA, DSR, ...) exactly like a real terminal would.
  term.onData((d) => {
    if (!exited) child.write(d);
  });
  child.onExit(() => {
    exited = true;
  });

  const screenText = () => {
    const b = term.buffer.active;
    const lines: string[] = [];
    for (let i = 0; i < b.length; i++)
      lines.push(b.getLine(i)?.translateToString(true) ?? "");
    return lines.join("\n");
  };
  const visibleText = () => {
    const b = term.buffer.active;
    const lines: string[] = [];
    for (let i = b.viewportY; i < b.viewportY + o.rows; i++)
      lines.push(b.getLine(i)?.translateToString(true) ?? "");
    return lines.join("\n");
  };
  const flush = () => new Promise<void>((r) => term.write("", r));

  const failures: string[] = [];
  let aborted: string | undefined;
  const deadline = writer.now() + (o.maxSeconds ?? 240);
  const guard = setInterval(() => {
    const why =
      o.watchdog?.() ??
      (writer.now() > deadline
        ? `take exceeded ${o.maxSeconds ?? 240}s`
        : null);
    if (why && !aborted) {
      aborted = why;
      log(`  ! abort: ${why}`);
      try {
        child.kill();
      } catch {
        /* already gone */
      }
    }
  }, 1000);

  const rand = mulberry32(o.seed);
  const send = (s: string) => {
    writer.input(s);
    child.write(s);
  };

  try {
    for (const step of steps) {
      if (aborted || exited) break;
      if ("marker" in step) {
        writer.marker(step.marker);
        log(`  [${writer.now().toFixed(2)}s] marker ${step.marker}`);
      } else if ("sleep" in step) {
        await sleep(step.sleep);
      } else if ("type" in step) {
        const cps = step.cps ?? 24;
        for (const ch of step.type) {
          send(ch);
          // human cadence: base interval with seeded jitter, a touch longer after spaces
          const base = 1 / cps;
          await sleep(base * (0.55 + rand() * 0.9) * (ch === " " ? 1.35 : 1));
        }
      } else if ("key" in step) {
        for (let i = 0; i < (step.repeat ?? 1); i++) {
          send(KEYS[step.key]);
          await sleep(0.08);
        }
      } else if ("wait" in step) {
        const re = new RegExp(step.wait, "m");
        const until = writer.now() + (step.timeout ?? 60);
        let hit = false;
        while (writer.now() < until && !aborted && !exited) {
          await flush();
          if (re.test(screenText())) {
            hit = true;
            break;
          }
          await sleep(0.05);
        }
        if (!hit) {
          failures.push(
            `wait /${step.wait}/ timed out after ${step.timeout ?? 60}s`,
          );
          log(
            `  ! wait timed out: /${step.wait}/\n----- screen -----\n${visibleText()}\n------------------`,
          );
          break;
        }
      } else if ("idle" in step) {
        const until = writer.now() + (step.timeout ?? 60);
        // Spinners redraw constantly while the model works; a quiet screen means it is done.
        while (writer.now() < until && !aborted && !exited) {
          if (writer.now() - lastChange >= step.idle) break;
          await sleep(0.05);
        }
        if (writer.now() >= until)
          failures.push(
            `idle ${step.idle}s never reached within ${step.timeout ?? 60}s`,
          );
      } else if ("expect" in step) {
        await flush();
        const re = new RegExp(step.expect, "m");
        const hay = step.absent
          ? `${stripAnsi(raw)}\n${screenText()}`
          : screenText();
        const found = re.test(hay);
        if (step.absent ? found : !found) {
          failures.push(
            step.absent
              ? `expected /${step.expect}/ to be ABSENT but it appeared`
              : `expected /${step.expect}/ on screen`,
          );
        }
      }
    }
  } finally {
    clearInterval(guard);
  }
  await flush();
  const finalText = screenText();
  if (!exited) {
    // Leave politely so the transcript is flushed, then make sure it is gone.
    child.write("\x03");
    await sleep(0.3);
    child.write("\x03");
    await sleep(0.8);
    try {
      child.kill();
    } catch {
      /* gone */
    }
  }
  if (aborted) failures.push(`aborted: ${aborted}`);
  term.dispose();
  return {
    ok: failures.length === 0,
    failures,
    writer,
    finalText,
    plainOutput: stripAnsi(raw),
    aborted,
  };
}
