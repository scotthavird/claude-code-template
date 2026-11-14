#!/usr/bin/env tsx
/**
 * Render every output for one feature from its compiled film.json.
 *
 *   tsx studio/render.ts --slug <slug>              all outputs listed in spec.outputs
 *   tsx studio/render.ts --slug <slug> --only gif   just one (hero-16x9|hero-webm|social-9x16|social-1x1|gif|poster|captions)
 *   tsx studio/render.ts --slug <slug> --stills     QA stills: every scene + every callout midpoint, all aspect ratios
 *
 * Outputs land in showcase/out/<slug>/ (gitignored).
 */
import { bundle } from "@remotion/bundler";
import {
  renderMedia,
  renderStill,
  selectComposition,
} from "@remotion/renderer";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { FilmData } from "./src/lib/film";
import {
  buildCues,
  buildTimeline,
  calloutStart,
  toVtt,
  type Variant,
} from "./src/lib/timeline";

const here = path.dirname(fileURLToPath(import.meta.url));
const SHOWCASE = path.resolve(here, "..");
const argv = process.argv.slice(2);
const opt = (n: string) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 ? argv[i + 1] : undefined;
};
const slug = opt("slug") ?? argv.find((a) => !a.startsWith("--"));
if (!slug) {
  console.error("usage: render.ts --slug <slug> [--only <output>] [--stills]");
  process.exit(2);
}
const filmPath = path.join(here, "public", "features", slug, "film.json");
if (!fs.existsSync(filmPath)) {
  console.error(
    `missing ${filmPath}; run: pnpm --dir showcase compile --slug ${slug}`,
  );
  process.exit(1);
}
const film = JSON.parse(fs.readFileSync(filmPath, "utf8")) as FilmData;
const out = opt("out") ? path.resolve(opt("out")!) : path.join(SHOWCASE, "out", slug);
fs.mkdirSync(out, { recursive: true });

const kb = (p: string) => `${(fs.statSync(p).size / 1024).toFixed(0)} KB`;
const t0 = Date.now();

async function main() {
  console.log("bundling studio…");
  const serveUrl = await bundle({
    entryPoint: path.join(here, "src", "index.ts"),
    publicDir: path.join(here, "public"),
    onProgress: () => {},
  });
  const props = (variant: Variant, captions: boolean) => ({
    slug,
    variant,
    captions,
    film,
  });
  const comp = (id: string, variant: Variant, captions: boolean) =>
    selectComposition({ serveUrl, id, inputProps: props(variant, captions) });

  if (argv.includes("--stills")) {
    const dir = path.join(out, "stills");
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    const targets: {
      id: string;
      variant: Variant;
      captions: boolean;
      tag: string;
    }[] = [
      { id: "Hero", variant: "hero", captions: true, tag: "hero" },
      { id: "Social9x16", variant: "social", captions: true, tag: "9x16" },
      { id: "Social1x1", variant: "social", captions: true, tag: "1x1" },
      { id: "Loop", variant: "loop", captions: false, tag: "loop" },
    ];
    const only = opt("only");
    for (const tg of targets) {
      if (only && only !== tg.tag) continue;
      const composition = await comp(tg.id, tg.variant, tg.captions);
      const tl = buildTimeline(film, tg.variant);
      const frames: { f: number; name: string }[] = [];
      // --frames 120,240: explicit frames instead of the automatic scene/callout set
      const explicit = opt("frames")?.split(",").map(Number).filter((n) => Number.isFinite(n));
      if (explicit?.length) explicit.forEach((f) => frames.push({ f, name: "frame" }));
      for (const s of explicit?.length ? [] : tl.slots) {
        if (s.id === "demo") {
          const w = tl.demo;
          frames.push({
            f: s.from + Math.round(w.lead * film.fps) + 4,
            name: "demo-start",
          });
          for (const i of w.callouts) {
            const c = film.spec.callouts[i];
            const mid = calloutStart(film, c) + c.duration * 0.55;
            if (mid < w.start || mid > w.end) continue;
            frames.push({
              f:
                s.from +
                Math.round((w.lead + (mid - w.start) / w.rate) * film.fps),
              name: `callout${i}-${c.kind}`,
            });
          }
          for (const r of film.ramps) {
            const mid = (r.f0 + r.f1) / 2;
            if (mid >= w.start && mid <= w.end)
              frames.push({
                f:
                  s.from +
                  Math.round((w.lead + (mid - w.start) / w.rate) * film.fps),
                name: "speed-ramp",
              });
          }
          frames.push({ f: s.from + s.frames - 3, name: "demo-end" });
        } else {
          frames.push({ f: s.from + Math.round(s.frames * 0.62), name: s.id });
        }
      }
      for (const fr of frames) {
        const file = path.join(
          dir,
          `${tg.tag}-${String(fr.f).padStart(4, "0")}-${fr.name}.png`,
        );
        await renderStill({
          serveUrl,
          composition,
          inputProps: props(tg.variant, tg.captions),
          frame: Math.min(fr.f, composition.durationInFrames - 1),
          output: file,
          imageFormat: "png",
          scale: tg.tag === "hero" || tg.tag === "loop" ? 0.5 : 0.5,
        });
        console.log(`  still ${path.relative(SHOWCASE, file)}`);
      }
    }
    console.log(`stills done in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    return;
  }

  const wanted = new Set(opt("only") ? [opt("only")!] : film.spec.outputs);
  const log = (p: string) =>
    console.log(`  ✓ ${path.relative(SHOWCASE, p)}  ${kb(p)}`);
  const progress = (label: string) => {
    let last = -1;
    return ({ progress: p }: { progress: number }) => {
      const pct = Math.floor(p * 10) * 10;
      if (pct !== last) {
        last = pct;
        process.stdout.write(`\r  ${label} ${pct}%   `);
      }
    };
  };

  if (
    wanted.has("hero-16x9") ||
    wanted.has("hero-webm") ||
    wanted.has("poster")
  ) {
    const composition = await comp("Hero", "hero", true);
    console.log(
      `Hero: ${composition.durationInFrames} frames (${(composition.durationInFrames / composition.fps).toFixed(1)}s)`,
    );
    if (wanted.has("hero-16x9")) {
      const p = path.join(out, "hero-16x9.mp4");
      await renderMedia({
        serveUrl,
        composition,
        inputProps: props("hero", true),
        codec: "h264",
        crf: 18,
        pixelFormat: "yuv420p",
        outputLocation: p,
        onProgress: progress("hero mp4"),
      });
      process.stdout.write("\n");
      log(p);
    }
    if (wanted.has("hero-webm")) {
      const p = path.join(out, "hero.webm");
      await renderMedia({
        serveUrl,
        composition,
        inputProps: props("hero", true),
        codec: "vp9",
        crf: 30,
        outputLocation: p,
        onProgress: progress("hero webm"),
      });
      process.stdout.write("\n");
      log(p);
    }
    if (wanted.has("poster")) {
      const tl = buildTimeline(film, "hero");
      const reveal = tl.slots.find((s) => s.id === "reveal")!;
      const p = path.join(out, "poster.png");
      await renderStill({
        serveUrl,
        composition,
        inputProps: props("hero", true),
        frame: reveal.from + Math.round(reveal.frames * 0.7),
        output: p,
        imageFormat: "png",
        scale: 2 / 3,
      });
      log(p);
    }
  }
  for (const [key, id] of [
    ["social-9x16", "Social9x16"],
    ["social-1x1", "Social1x1"],
  ] as const) {
    if (!wanted.has(key)) continue;
    const composition = await comp(id, "social", true);
    const p = path.join(out, `${key}.mp4`);
    await renderMedia({
      serveUrl,
      composition,
      inputProps: props("social", true),
      codec: "h264",
      crf: 19,
      pixelFormat: "yuv420p",
      outputLocation: p,
      onProgress: progress(key),
    });
    process.stdout.write("\n");
    log(p);
  }
if (wanted.has("gif")) {
  const composition = await comp("Loop", "loop", false);
  const p = path.join(out, "loop.gif");
  // Two-pass palette GIF via ffmpeg (rectangle diffing keeps flat terminal
  // frames tiny); falls back to Remotion's GIF encoder without ffmpeg.
  const ffmpeg =
    spawnSync("ffmpeg", ["-version"], { stdio: "ignore" }).status === 0;
  if (ffmpeg) {
    const tmp = path.join(out, ".loop-src.mp4");
    await renderMedia({
      serveUrl,
      composition,
      inputProps: props("loop", false),
      codec: "h264",
      crf: 12,
      scale: 800 / 1920,
      outputLocation: tmp,
      onProgress: progress("gif source"),
    });
    process.stdout.write("\n");
    const vf =
      "fps=12,split[a][b];[a]palettegen=max_colors=64:stats_mode=diff[pal];" +
      "[b][pal]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle";
    const r = spawnSync(
      "ffmpeg",
      ["-y", "-loglevel", "error", "-i", tmp, "-vf", vf, "-loop", "0", p],
      { stdio: "inherit" },
    );
    fs.rmSync(tmp, { force: true });
    if (r.status !== 0) throw new Error("ffmpeg GIF encode failed");
  } else {
    await renderMedia({
      serveUrl,
      composition,
      inputProps: props("loop", false),
      codec: "gif",
      everyNthFrame: 2,
      numberOfGifLoops: null,
      scale: 800 / 1920,
      outputLocation: p,
      onProgress: progress("gif"),
    });
    process.stdout.write("\n");
  }
  log(p);
}
  if (wanted.has("captions")) {
    const p = path.join(out, "captions.vtt");
    fs.writeFileSync(p, toVtt(buildCues(film, buildTimeline(film, "hero"))));
    log(p);
    const ps = path.join(out, "captions-social.vtt");
    fs.writeFileSync(ps, toVtt(buildCues(film, buildTimeline(film, "social"))));
    log(ps);
  }
  fs.writeFileSync(
    path.join(out, "manifest.json"),
    JSON.stringify(
      {
        slug,
        version: film.spec.version,
        renderedAt: new Date().toISOString(),
        files: fs
          .readdirSync(out)
          .filter((f) => !f.startsWith("stills") && f !== "manifest.json")
          .map((f) => ({
            file: f,
            bytes: fs.statSync(path.join(out, f)).size,
          })),
      },
      null,
      2,
    ),
  );
  console.log(`done in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
