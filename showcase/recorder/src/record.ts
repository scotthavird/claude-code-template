/**
 * `record`: run up to takes.max live takes in fresh sandboxes, score them,
 * scrub them, and promote the best one to features/<slug>/cast.cast.
 */
import fs from "node:fs";
import path from "node:path";
import type { FeatureSpec } from "../../schema/feature.js";
import {
  hostIdentifiers,
  resolveAuth,
  secretValues,
  type AuthMode,
} from "./auth.js";
import { castMarkers, scrubCast, writeCast, type Cast } from "./cast.js";
import { featureDir, takesDir } from "./paths.js";
import { runScenario } from "./pty.js";
import { createSandbox } from "./sandbox.js";
import { pickBest, scoreTake, type TakeReport } from "./score.js";
import { measureSpend } from "./usage.js";

export interface RecordOptions {
  auth: AuthMode;
  /** Run every take and keep the best instead of stopping at the first pass. */
  all: boolean;
  /** Override takes.max (never above the spec's value). */
  takes?: number;
  /** Ledger of total spend across takes, so callers can enforce a session cap. */
  maxTotalUsd?: number;
  keepSandbox?: boolean;
  verbose?: boolean;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Built-in scrubs applied to every cast on top of spec.scrub. */
export function scrubRules(
  spec: FeatureSpec,
  extraLiterals: string[],
): { find: RegExp; replace: string }[] {
  return [
    ...extraLiterals.map((v) => ({
      find: new RegExp(escapeRe(v), "g"),
      replace: "~",
    })),
    ...spec.scrub.map((r) => ({
      find: new RegExp(r.find, "g"),
      replace: r.replace,
    })),
    { find: /\/(private\/)?var\/folders\/[^\s'"]+/g, replace: "~/demo" },
    { find: /\/Users\/[A-Za-z0-9._-]+/g, replace: "~" },
    { find: /\/home\/[A-Za-z0-9._-]+/g, replace: "~" },
    {
      find: /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[a-z]{2,}/g,
      replace: "dev@example.com",
    },
    { find: /[\w.'’ -]{1,60}['’]s Organization/g, replace: "Demo Org" },
    {
      find: /sk-ant-(api|oat|admin)\d\d-[A-Za-z0-9_-]{40,}/g,
      replace: "[key]",
    },
  ];
}

export async function record(
  spec: FeatureSpec,
  o: RecordOptions,
): Promise<{ best: TakeReport | null; reports: TakeReport[]; spend: number }> {
  if (spec.recorder.engine !== "pty")
    throw new Error(
      `recorder.engine=${spec.recorder.engine} is not implemented yet (see recorder/src/vhs.ts)`,
    );
  if (spec.recorder.budgetUsd > 2)
    throw new Error("budgetUsd above $2 is refused");
  const auth = resolveAuth(o.auth);
  console.log(
    `auth: ${auth.kind} (no credential is written to disk or printed)`,
  );
  const max = Math.min(
    o.takes ?? spec.recorder.takes.max,
    spec.recorder.takes.max,
  );
  const dir = takesDir(spec.slug);
  fs.mkdirSync(dir, { recursive: true });
  const rules = scrubRules(spec, [...secretValues(auth), ...hostIdentifiers()]);
  const reports: TakeReport[] = [];
  const casts = new Map<number, Cast>();
  let spend = 0;
  const existing = fs
    .readdirSync(dir)
    .filter((f) => /^take-\d+\.cast$/.test(f)).length;

  for (let i = 1; i <= max; i++) {
    const take = existing + i;
    if (
      o.maxTotalUsd !== undefined &&
      spend + spec.recorder.budgetUsd > o.maxTotalUsd
    ) {
      console.log(
        `stop: another take could exceed the session cap of $${o.maxTotalUsd}`,
      );
      break;
    }
    console.log(
      `\n▶ take ${take} (${i}/${max}), budget $${spec.recorder.budgetUsd.toFixed(2)}`,
    );
    const sb = createSandbox(spec, take, auth);
    const args =
      spec.recorder.mode === "headless" ? [...sb.args, "-p"] : sb.args;
    let lastSpend = 0;
    const result = await runScenario(spec.scenario, {
      command: "claude",
      args,
      cwd: sb.repo,
      env: sb.env,
      cols: spec.recorder.size.cols,
      rows: spec.recorder.size.rows,
      seed: [...spec.slug].reduce((a, c) => a * 31 + c.charCodeAt(0), 7),
      maxSeconds: Math.max(120, spec.recorder.takes.targetSeconds * 6),
      log: (m) => console.log(m),
      watchdog: () => {
        lastSpend = measureSpend(sb.home, sb.sessionId).usd;
        return lastSpend > spec.recorder.budgetUsd
          ? `spend $${lastSpend.toFixed(3)} > budget $${spec.recorder.budgetUsd}`
          : null;
      },
    });
    await new Promise((r) => setTimeout(r, 500));
    const takeSpend = Math.max(
      lastSpend,
      measureSpend(sb.home, sb.sessionId).usd,
    );
    spend += takeSpend;
    const cast = scrubCast(result.writer.toCast(), rules);
    casts.set(take, cast);
    const report = scoreTake(
      take,
      cast,
      result.plainOutput,
      result.failures,
      takeSpend,
      spec.edit,
      spec.recorder.takes.targetSeconds,
    );
    reports.push(report);
    writeCast(path.join(dir, `take-${take}.cast`), cast);
    fs.writeFileSync(
      path.join(dir, `take-${take}.json`),
      JSON.stringify(report, null, 2),
    );
    if (o.verbose || !report.ok) {
      console.log("----- final screen (scrubbed) -----");
      console.log(
        rules
          .reduce((a, r) => a.replace(r.find, r.replace), result.finalText)
          .split("\n")
          .slice(-spec.recorder.size.rows)
          .join("\n"),
      );
      console.log("-----------------------------------");
    }
    console.log(
      `  take ${take}: ${report.ok ? "PASS" : "FAIL"} score=${report.score} spend≈$${takeSpend.toFixed(4)} used=${report.usedSeconds.toFixed(1)}s` +
        (report.failures.length
          ? `\n    - ${report.failures.join("\n    - ")}`
          : ""),
    );
    if (!o.keepSandbox) fs.rmSync(sb.root, { recursive: true, force: true });
    if (report.ok && !o.all) break;
  }

  const best = pickBest(reports);
  if (best) {
    const cast = casts.get(best.take)!;
    writeCast(path.join(featureDir(spec.slug), "cast.cast"), cast);
    fs.writeFileSync(
      path.join(featureDir(spec.slug), "markers.json"),
      JSON.stringify(
        {
          take: best.take,
          markers: castMarkers(cast),
          spendUsd: best.spendUsd,
        },
        null,
        2,
      ) + "\n",
    );
    console.log(
      `\n✓ promoted take ${best.take} → features/${spec.slug}/cast.cast`,
    );
  } else {
    console.log("\n✗ no passing take; nothing promoted");
  }
  console.log(`total spend this run ≈ $${spend.toFixed(4)}`);
  const ledger = path.join(dir, "spend.json");
  const prev = fs.existsSync(ledger)
    ? (JSON.parse(fs.readFileSync(ledger, "utf8")) as {
        totalUsd: number;
        takes: number;
      })
    : { totalUsd: 0, takes: 0 };
  fs.writeFileSync(
    ledger,
    JSON.stringify(
      { totalUsd: prev.totalUsd + spend, takes: prev.takes + reports.length },
      null,
      2,
    ),
  );
  return { best, reports, spend };
}
