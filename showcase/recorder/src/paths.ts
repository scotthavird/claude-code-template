import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

/** showcase/ */
export const SHOWCASE_ROOT = path.resolve(here, "..", "..");
/** the template repo root (parent of showcase/) */
export const TEMPLATE_ROOT = path.resolve(SHOWCASE_ROOT, "..");
export const FEATURES_DIR = path.join(SHOWCASE_ROOT, "features");
export const OUT_DIR = path.join(SHOWCASE_ROOT, "out");
/** Generated Remotion public dir (gitignored). */
export const STUDIO_PUBLIC = path.join(SHOWCASE_ROOT, "studio", "public");

export const featureDir = (slug: string) => path.join(FEATURES_DIR, slug);
export const takesDir = (slug: string) => path.join(featureDir(slug), "takes");
export const outDir = (slug: string) => path.join(OUT_DIR, slug);
