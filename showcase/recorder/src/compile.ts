/**
 * compile: cast.cast -> film.json (screen timeline, remap table, anchors).
 *
 *  1. Remap: a piecewise-linear table film-seconds -> cast-seconds built from
 *     edit.in/out, idle compression, speed ramps and holds.
 *  2. Screen: @xterm/headless replays the cast; one snapshot per film frame,
 *     deduplicated, as styled cell runs. Colors stay symbolic (default /
 *     palette index / rgb) so the studio can re-theme them.
 *  3. Anchors: each callout's `match:` regex resolved to a cell bounding box
 *     on the screen at that moment.
 *  4. Leak check: fails if anything path-, email- or key-shaped survived.
 */
import fs from "node:fs";
import os from "node:os";
import { createRequire } from "node:module";
import path from "node:path";
import type { FeatureSpec } from "../../schema/feature.js";
import {
  castAt,
  type Anchor,
  type FilmData,
  type Point,
  type Run,
  type Snapshot,
  type Style,
} from "../../studio/src/lib/film.js";
import { castMarkers, readCast } from "./cast.js";
import { STUDIO_PUBLIC, featureDir } from "./paths.js";

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Terminal } =
  require("@xterm/headless") as typeof import("@xterm/headless");

export const FPS = 30;

/** Build film->cast table. Holds are flat segments; ramps divide time; idle gaps are clamped. */
export function buildRemap(
  eventTimes: number[],
  markers: Record<string, number>,
  edit: FeatureSpec["edit"],
): {
  table: Point[];
  filmAtMarker: Record<string, number>;
  duration: number;
  ramps: { f0: number; f1: number; speed: number }[];
} {
  const cIn = markers[edit.in];
  const cOut = markers[edit.out];
  if (cIn === undefined || cOut === undefined)
    throw new Error("edit.in / edit.out markers are missing from the cast");
  const ramps = edit.remap.map((r) => ({
    a: markers[r.from],
    b: markers[r.to],
    speed: r.speed,
  }));
  const holds = new Map<number, number>();
  for (const h of edit.hold)
    holds.set(markers[h.at], (holds.get(markers[h.at]) ?? 0) + h.seconds);

  const knots = [
    ...new Set([
      cIn,
      cOut,
      ...eventTimes,
      ...Object.values(markers),
      ...ramps.flatMap((r) => [r.a, r.b]),
    ]),
  ]
    .filter((t) => t >= cIn && t <= cOut)
    .sort((a, b) => a - b);
  const table: Point[] = [[0, cIn]];
  let f = 0;
  const holdAt = (c: number) => {
    const h = holds.get(c);
    if (h) {
      f += h;
      table.push([f, c]);
    }
  };
  holdAt(cIn);
  const filmRamps: { f0: number; f1: number; speed: number }[] = [];
  for (let i = 1; i < knots.length; i++) {
    const a = knots[i - 1];
    const b = knots[i];
    const gap = b - a;
    const ramp = ramps.find((r) => a >= r.a && b <= r.b);
    let film = ramp ? gap / ramp.speed : gap;
    if (!ramp && gap > edit.idleMax) film = edit.idleMax;
    if (ramp) {
      const last = filmRamps[filmRamps.length - 1];
      if (last && Math.abs(last.f1 - f) < 1e-6 && last.speed === ramp.speed)
        last.f1 = f + film;
      else filmRamps.push({ f0: f, f1: f + film, speed: ramp.speed });
    }
    f += film;
    table.push([f, b]);
    holdAt(b);
  }
  const filmAtMarker: Record<string, number> = {};
  for (const [name, c] of Object.entries(markers)) {
    if (c < cIn || c > cOut) continue;
    const idx = table.findIndex(([, tc]) => tc >= c - 1e-9);
    filmAtMarker[name] = idx <= 0 ? 0 : table[idx][0];
  }
  return { table, filmAtMarker, duration: f, ramps: filmRamps };
}

type Cell = import("@xterm/headless").IBufferCell;
function colorOf(mode: "fg" | "bg", cell: Cell): string {
  if (mode === "fg") {
    if (cell.isFgDefault()) return "d";
    if (cell.isFgRGB())
      return "#" + cell.getFgColor().toString(16).padStart(6, "0");
    return "p" + cell.getFgColor();
  }
  if (cell.isBgDefault()) return "d";
  if (cell.isBgRGB())
    return "#" + cell.getBgColor().toString(16).padStart(6, "0");
  return "p" + cell.getBgColor();
}

/** Things that must never be on screen. */
const LEAK_PATTERNS: RegExp[] = [
  /\/Users\/[A-Za-z0-9._-]+/,
  /\/home\/[A-Za-z0-9._-]+/,
  /\/var\/folders\//,
  /['’]s Organization/,
  /sk-ant-(api|oat|admin)\d\d-[A-Za-z0-9_-]{40,}/,
  /[A-Za-z0-9._%+-]+@(?!example\.com)[A-Za-z0-9-]+\.[a-z]{2,}/,
];

export async function compile(spec: FeatureSpec): Promise<FilmData> {
  const castPath = path.join(featureDir(spec.slug), "cast.cast");
  if (!fs.existsSync(castPath))
    throw new Error(`no ${castPath}; run: pnpm record --slug ${spec.slug}`);
  const cast = readCast(castPath);
  const markers = castMarkers(cast);

  // Raw leak check over every event (including bytes that never render, e.g. OSC titles).
  const host = [os.userInfo().username, os.homedir()].filter((v) => v && v.length >= 4);
  const rawText = cast.events.map((e) => e[2]).join("");
  const rawLeaks = [
    ...host.filter((h) => rawText.includes(h)).map(() => "host username/home path"),
    ...LEAK_PATTERNS.filter((re) => re.test(rawText)).map((re) => String(re)),
  ];
  if (rawLeaks.length) {
    throw new Error(`leak check failed on raw cast (${[...new Set(rawLeaks)].join(", ")}). Add a scrub: rule and re-record.`);
  }
  console.log(`leak check: raw cast clean (${cast.events.length} events)`);
  const outputs = cast.events.filter((e) => e[1] === "o");
  const { table, filmAtMarker, duration, ramps } = buildRemap(
    outputs.map((e) => e[0]),
    markers,
    spec.edit,
  );
  const cols = cast.header.width;
  const rows = cast.header.height;
  const term = new Terminal({
    cols,
    rows,
    scrollback: 0,
    allowProposedApi: true,
  });

  const styles: Style[] = [];
  const styleIdx = new Map<string, number>();
  const lines: Run[][] = [];
  const lineIdx = new Map<string, number>();
  const texts: string[] = [];
  const frames: Snapshot[] = [];

  const internStyle = (s: Style) => {
    const k = JSON.stringify(s);
    let i = styleIdx.get(k);
    if (i === undefined) {
      i = styles.length;
      styles.push(s);
      styleIdx.set(k, i);
    }
    return i;
  };

  const snapshotRow = (y: number): { runs: Run[]; text: string } => {
    const buf = term.buffer.active;
    const line = buf.getLine(buf.viewportY + y);
    const runs: Run[] = [];
    if (!line) return { runs, text: "" };
    const chars: string[] = new Array(cols).fill(" ");
    let cell = line.getCell(0)!;
    let cur: Run | null = null;
    for (let x = 0; x < cols; x++) {
      cell = line.getCell(x, cell)!;
      const w = cell.getWidth();
      if (w === 0) continue;
      const ch = cell.getChars() || " ";
      chars[x] = ch;
      const s: Style = {
        fg: colorOf("fg", cell),
        bg: colorOf("bg", cell),
        ...(cell.isBold() ? { b: 1 } : {}),
        ...(cell.isDim() ? { d: 1 } : {}),
        ...(cell.isItalic() ? { i: 1 } : {}),
        ...(cell.isUnderline() ? { u: 1 } : {}),
        ...(cell.isInverse() ? { v: 1 } : {}),
      };
      const si = internStyle(s);
      const wide = w === 2 || (ch.codePointAt(0) ?? 0) > 0x7e;
      if (cur && cur.s === si && !wide) {
        cur.t += ch;
      } else {
        cur = { c: x, t: ch, s: si, ...(wide ? { g: w } : {}) };
        runs.push(cur);
        if (wide) cur = null;
      }
    }
    // drop trailing blank runs with default background
    while (runs.length) {
      const r = runs[runs.length - 1];
      const st = styles[r.s];
      if (st.bg === "d" && !st.v && r.t.trim() === "") runs.pop();
      else break;
    }
    return { runs, text: chars.join("") };
  };

  const snapshot = (c: number) => {
    const ids: number[] = [];
    for (let y = 0; y < rows; y++) {
      const { runs, text } = snapshotRow(y);
      const k = JSON.stringify(runs);
      let i = lineIdx.get(k);
      if (i === undefined) {
        i = lines.length;
        lines.push(runs);
        texts.push(text);
        lineIdx.set(k, i);
      }
      ids.push(i);
    }
    const prev = frames[frames.length - 1];
    if (prev && prev.l.join() === ids.join()) return;
    frames.push({ c: Math.floor(c * 1e5) / 1e5, l: ids });
  };

  const write = (data: string) => new Promise<void>((r) => term.write(data, r));

  // One snapshot per film frame (only if something changed).
  const totalFrames = Math.ceil(duration * FPS);
  let ei = 0;
  for (let k = 0; k <= totalFrames; k++) {
    const c = castAt(table, k / FPS);
    let wrote = false;
    while (ei < outputs.length && outputs[ei][0] <= c + 1e-6) {
      await write(outputs[ei][2]);
      ei++;
      wrote = true;
    }
    if (wrote || k === 0) snapshot(c);
  }
  term.dispose();

  // Screen text at cast time c
  const frameAt = (c: number) => {
    let lo = 0;
    let hi = frames.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (frames[mid].c <= c + 1e-6) lo = mid;
      else hi = mid - 1;
    }
    return frames[lo];
  };
  const screenRows = (c: number) => frameAt(c).l.map((i) => texts[i]);

  // Leak check over every distinct line ever shown
  const leaks = texts.flatMap((t) =>
    LEAK_PATTERNS.filter((re) => re.test(t)).map(
      (re) => `${re} in: ${t.trim().slice(0, 60)}…`,
    ),
  );
  if (leaks.length) {
    throw new Error(
      `leak check failed (add a scrub: rule and re-record, or fix the fixture):\n  ${leaks.join("\n  ")}`,
    );
  }

  // Anchors
  const warnings: string[] = [];
  const anchors: (Anchor | null)[] = spec.callouts.map((co, idx) => {
    const f0 = filmAtMarker[co.at];
    if (f0 === undefined) {
      warnings.push(`callout ${idx}: marker ${co.at} outside edit window`);
      return null;
    }
    const re = new RegExp(co.match, "g");
    const start = f0 + (co.offset ?? 0);
    // Try the middle of the callout first, then scan its window.
    const probes = [0.5, 0.25, 0.75, 0.05, 0.95].map(
      (p) => start + Math.min(co.duration, duration - start) * p,
    );
    for (const f of probes) {
      // Match across the whole screen (rows joined by \n) so a regex can span lines.
      const rowsText = screenRows(castAt(table, f)).map((t) => t.padEnd(cols, " ").slice(0, cols));
      const joined = rowsText.join("\n");
      const hits = [...joined.matchAll(re)].filter((m) => m[0].length > 0);
      if (!hits.length) continue;
      const m = co.occurrence === "last" ? hits[hits.length - 1] : hits[0];
      const a = m.index ?? 0;
      const b = a + m[0].length;
      const r0 = Math.floor(a / (cols + 1));
      const r1 = Math.floor((b - 1) / (cols + 1));
      let c0 = cols;
      let c1 = 0;
      for (let r = r0; r <= r1; r++) {
        const rowStart = r * (cols + 1);
        const s0 = Math.max(a, rowStart) - rowStart;
        const s1 = Math.min(b, rowStart + cols) - rowStart;
        const seg = rowsText[r].slice(s0, s1);
        const lead = seg.length - seg.trimStart().length;
        const trail = seg.length - seg.trimEnd().length;
        if (seg.trim() === "") continue;
        c0 = Math.min(c0, s0 + lead);
        c1 = Math.max(c1, s1 - trail);
      }
      return { row: r0, col: c0, len: Math.max(1, c1 - c0), h: r1 - r0 + 1, f };
    }
    warnings.push(
      `callout ${idx} (${co.kind} @${co.at}): /${co.match}/ not found on screen`,
    );
    return null;
  });

  // Re-layout: collapse runs of rows that are blank in *every* frame down to a
  // single spacer row. Tighter window, bigger type, nothing real is removed.
  const blankLine = (i: number) => lines[i].every((r) => r.t.trim() === "" && styles[r.s].bg === "d" && !styles[r.s].v);
  const alwaysBlank = Array.from({ length: rows }, (_, y) => frames.every((fr) => blankLine(fr.l[y])));
  const keep: number[] = [];
  for (let y = 0; y < rows; y++) {
    if (alwaysBlank[y] && y > 0 && alwaysBlank[y - 1] && keep.length && alwaysBlank[keep[keep.length - 1]]) continue;
    keep.push(y);
  }
  // drop a leading spacer too
  while (keep.length && alwaysBlank[keep[0]]) keep.shift();
  const rowMap = new Map(keep.map((y, i) => [y, i]));
  for (const fr of frames) fr.l = keep.map((y) => fr.l[y]);
  for (const a of anchors) if (a) a.row = rowMap.get(a.row) ?? a.row;
  const outRows = keep.length;

  const film: FilmData = {
    spec,
    fps: FPS,
    cols,
    rows: outRows,
    duration,
    table,
    ramps,
    markers: filmAtMarker,
    styles,
    lines,
    frames,
    anchors,
  };
  const dir = path.join(STUDIO_PUBLIC, "features", spec.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "film.json"), JSON.stringify(film));
  fs.writeFileSync(
    path.join(featureDir(spec.slug), "anchors.json"),
    JSON.stringify(
      spec.callouts.map((c, i) => ({
        at: c.at,
        kind: c.kind,
        match: c.match,
        anchor: anchors[i],
      })),
      null,
      2,
    ) + "\n",
  );
  const kb = (fs.statSync(path.join(dir, "film.json")).size / 1024).toFixed(0);
  console.log(
    `compiled ${spec.slug}: demo ${duration.toFixed(2)}s, ${frames.length} snapshots, ${lines.length} unique lines, ${kb} KB` +
      `\n  markers: ${Object.entries(filmAtMarker)
        .map(([k, v]) => `${k}@${v.toFixed(2)}`)
        .join(" ")}` +
      `\n  anchors: ${anchors.map((a, i) => (a ? `#${i} r${a.row}c${a.col}+${a.len}` : `#${i} MISSING`)).join("  ")}`,
  );
  warnings.forEach((w) => console.warn(`  warn: ${w}`));
  return film;
}
