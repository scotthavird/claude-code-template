#!/usr/bin/env tsx
/**
 * showcase recorder CLI
 *
 *   validate [--slug s]              validate one or all specs
 *   schema                           regenerate schema/feature.schema.json
 *   scaffold <slug>                  new spec.yaml + fixture/ from the template
 *   doctor [--auth mode]             check claude, auth and node-pty in a sandbox ($0)
 *   record --slug s [--takes n] [--all] [--auth mode] [--max-total-usd x] [--yes]
 *   compile --slug s                 cast.cast -> studio/public/features/<slug>/film.json
 *   screen --slug s --at <marker|sec>[+sec]   print the compiled screen at a moment (for writing match: regexes)
 *   build --slug s                   compile + render + docs (no recording)
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { zodToJsonSchema } from "zod-to-json-schema";
import { featureSchema } from "../../schema/feature.js";
import { resolveAuth, type AuthMode } from "./auth.js";
import { compile } from "./compile.js";
import { SHOWCASE_ROOT, featureDir } from "./paths.js";
import { record } from "./record.js";
import { createSandbox } from "./sandbox.js";
import { listSlugs, loadSpec, loadSpecResult } from "./spec.js";

const argv = process.argv.slice(2);
const cmd = argv[0];
const flag = (name: string) => argv.includes(`--${name}`);
const opt = (name: string): string | undefined => {
  const i = argv.indexOf(`--${name}`);
  if (i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--"))
    return argv[i + 1];
  const eq = argv.find((a) => a.startsWith(`--${name}=`));
  return eq?.split("=").slice(1).join("=");
};
/** Accept `--slug x`, `--slug=x` or a bare positional slug. */
const slugArg = () =>
  opt("slug") ??
  argv.slice(1).find((a) => !a.startsWith("--") && listSlugs().includes(a));

function requireSlug(): string {
  const s = slugArg();
  if (!s) {
    console.error(
      `usage: ${cmd} --slug <slug>   (known: ${listSlugs().join(", ") || "none"})`,
    );
    process.exit(2);
  }
  return s;
}

async function main() {
  switch (cmd) {
    case "validate": {
      const slugs = slugArg() ? [slugArg()!] : listSlugs();
      let bad = 0;
      for (const s of slugs) {
        const r = loadSpecResult(s);
        console.log(`${r.ok ? "✓" : "✗"} ${s}`);
        r.errors.forEach((e) => console.log(`    error: ${e}`));
        r.warnings.forEach((w) => console.log(`    warn:  ${w}`));
        if (!r.ok) bad++;
      }
      if (!slugs.length) console.log("no specs under showcase/features/");
      process.exit(bad ? 1 : 0);
    }
    case "schema": {
      const out = path.join(SHOWCASE_ROOT, "schema", "feature.schema.json");
      const json = zodToJsonSchema(featureSchema, {
        name: "FeatureSpec",
        $refStrategy: "none",
      });
      fs.writeFileSync(out, JSON.stringify(json, null, 2) + "\n");
      console.log(`wrote ${path.relative(process.cwd(), out)}`);
      return;
    }
    case "scaffold": {
      const slug = argv[1];
      if (!slug || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
        console.error("usage: scaffold <kebab-slug>");
        process.exit(2);
      }
      const dir = featureDir(slug);
      if (fs.existsSync(dir)) {
        console.error(`${dir} already exists`);
        process.exit(1);
      }
      fs.cpSync(path.join(SHOWCASE_ROOT, "schema", "template"), dir, {
        recursive: true,
      });
      const specPath = path.join(dir, "spec.yaml");
      fs.writeFileSync(
        specPath,
        fs.readFileSync(specPath, "utf8").replaceAll("__SLUG__", slug),
      );
      console.log(
        `scaffolded features/${slug}/ (spec.yaml + fixture/). Edit it, then: pnpm validate --slug ${slug}`,
      );
      return;
    }
    case "doctor": {
      const auth = resolveAuth((opt("auth") as AuthMode) ?? "auto");
      const slug = slugArg() ?? listSlugs()[0];
      const spec = loadSpec(slug);
      const sb = createSandbox(spec, 0, auth);
      const r = spawnSync("claude", ["auth", "status"], {
        cwd: sb.repo,
        env: sb.env,
        encoding: "utf8",
        timeout: 30000,
      });
      let status: {
        loggedIn?: boolean;
        authMethod?: string;
        apiProvider?: string;
      } = {};
      try {
        status = JSON.parse(r.stdout);
      } catch {
        /* not json */
      }
      console.log(`auth source:   ${auth.kind}`);
      console.log(
        `sandbox login: loggedIn=${status.loggedIn} method=${status.authMethod} provider=${status.apiProvider}`,
      );
      const v = spawnSync("claude", ["--version"], {
        env: sb.env,
        encoding: "utf8",
      });
      console.log(`claude:        ${v.stdout.trim()}`);
      fs.rmSync(sb.root, { recursive: true, force: true });
      process.exit(status.loggedIn ? 0 : 1);
    }
    case "record": {
      const slug = requireSlug();
      const spec = loadSpec(slug);
      const takes = opt("takes") ? Number(opt("takes")) : undefined;
      const n = Math.min(
        takes ?? spec.recorder.takes.max,
        spec.recorder.takes.max,
      );
      const worst = n * spec.recorder.budgetUsd;
      console.log(
        `record ${slug}: up to ${n} take(s) × $${spec.recorder.budgetUsd.toFixed(2)} = worst case $${worst.toFixed(2)} (model ${spec.recorder.model})`,
      );
      if (!flag("yes") && process.stdin.isTTY) {
        process.stdout.write("Spend real API credits? [y/N] ");
        const ans = await new Promise<string>((r) =>
          process.stdin.once("data", (d) => r(String(d).trim())),
        );
        if (!/^y/i.test(ans)) process.exit(1);
      }
      const { best } = await record(spec, {
        auth: (opt("auth") as AuthMode) ?? "auto",
        all: flag("all"),
        takes,
        maxTotalUsd: opt("max-total-usd")
          ? Number(opt("max-total-usd"))
          : undefined,
        keepSandbox: flag("keep"),
        verbose: flag("verbose"),
      });
      process.exit(best ? 0 : 1);
    }
    case "screen": {
      // Print the compiled screen at a marker or demo time: pnpm screen --slug s --at done [+0.5]
      const slug = requireSlug();
      const film = JSON.parse(fs.readFileSync(path.join(SHOWCASE_ROOT, "studio", "public", "features", slug, "film.json"), "utf8"));
      const at = opt("at") ?? "0";
      const [name, plus] = at.split("+");
      const t = (film.markers[name] ?? Number(name)) + Number(plus ?? 0);
      const { castAt, frameAt } = await import("../../studio/src/lib/film.js");
      const snap = frameAt(film.frames, castAt(film.table, t));
      console.log(`demo t=${t.toFixed(2)}s  cast=${castAt(film.table, t).toFixed(2)}s`);
      snap.l.forEach((li: number, y: number) => {
        let row = "";
        for (const r of film.lines[li]) row = row.padEnd(r.c, " ") + r.t;
        console.log(String(y).padStart(2) + " │" + row);
      });
      return;
    }
    case "compile": {
      const slug = requireSlug();
      await compile(loadSpec(slug));
      return;
    }
    case "build": {
      const slug = requireSlug();
      await compile(loadSpec(slug));
      const tsx = path.join(SHOWCASE_ROOT, "node_modules", ".bin", "tsx");
      const run = (...a: string[]) => {
        const r = spawnSync(tsx, a, { cwd: SHOWCASE_ROOT, stdio: "inherit" });
        if (r.status !== 0) process.exit(r.status ?? 1);
      };
      run("studio/render.ts", "--slug", slug);
      run("docs-gen/src/index.ts", "--slug", slug);
      return;
    }
    default:
      console.log(
        fs.readFileSync(new URL(import.meta.url), "utf8").split("*/")[0],
      );
      process.exit(cmd ? 2 : 0);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
