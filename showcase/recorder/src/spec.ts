import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { featureSchema, type FeatureSpec } from "../../schema/feature.js";
import { FEATURES_DIR, featureDir } from "./paths.js";

export function listSlugs(): string[] {
  if (!fs.existsSync(FEATURES_DIR)) return [];
  return fs
    .readdirSync(FEATURES_DIR)
    .filter((d) => fs.existsSync(path.join(FEATURES_DIR, d, "spec.yaml")))
    .sort();
}

export interface LoadResult {
  slug: string;
  ok: boolean;
  spec?: FeatureSpec;
  errors: string[];
  warnings: string[];
}

export function loadSpecResult(slug: string): LoadResult {
  const file = path.join(featureDir(slug), "spec.yaml");
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!fs.existsSync(file))
    return { slug, ok: false, errors: [`missing ${file}`], warnings };
  let raw: unknown;
  try {
    raw = YAML.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    return {
      slug,
      ok: false,
      errors: [`YAML: ${(e as Error).message}`],
      warnings,
    };
  }
  const parsed = featureSchema.safeParse(raw);
  if (!parsed.success) {
    for (const issue of parsed.error.issues)
      errors.push(`${issue.path.join(".") || "(root)"}: ${issue.message}`);
    return { slug, ok: false, errors, warnings };
  }
  const spec = parsed.data;
  if (spec.slug !== slug)
    errors.push(`slug "${spec.slug}" must equal its directory name "${slug}"`);
  if (!fs.existsSync(path.join(featureDir(slug), "fixture")))
    errors.push("missing fixture/ directory");
  if (spec.recorder.budgetUsd * spec.recorder.takes.max > 2.5) {
    warnings.push(
      `worst-case spend $${(spec.recorder.budgetUsd * spec.recorder.takes.max).toFixed(2)} (budget x takes)`,
    );
  }
  if (!spec.scenario.some((s) => "expect" in s))
    warnings.push("scenario has no expect: assertions");
  if (spec.recorder.pluginDir)
    warnings.push(
      "pluginDir loads every template component into the sandbox; prefer recorder.copy",
    );
  return { slug, ok: errors.length === 0, spec, errors, warnings };
}

export function loadSpec(slug: string): FeatureSpec {
  const r = loadSpecResult(slug);
  if (!r.ok || !r.spec)
    throw new Error(`spec ${slug} is invalid:\n  ${r.errors.join("\n  ")}`);
  return r.spec;
}
