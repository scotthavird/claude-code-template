/**
 * film.json: the compiled, render-ready form of one feature.
 * Shared by the recorder (writer) and the studio (reader). Pure; no React.
 */
import type { FeatureSpec } from "../../../schema/feature";

export type Point = [film: number, cast: number];

/** A styled run of cells. c = start column, t = text, s = style index, g = glyph cell width for single wide/non-ASCII glyphs. */
export interface Run {
  c: number;
  t: string;
  s: number;
  g?: number;
}

/** fg/bg: 'd' default, 'p<n>' 256-palette index, '#rrggbb' truecolor. */
export interface Style {
  fg: string;
  bg: string;
  b?: 1;
  d?: 1;
  i?: 1;
  u?: 1;
  v?: 1;
}

/** c = cast seconds this snapshot becomes visible; l = line ids (one per row). */
export interface Snapshot {
  c: number;
  l: number[];
}

/** Cell-space bounding box of a callout's match, resolved at film-demo time f. */
export interface Anchor {
  row: number;
  col: number;
  len: number;
  /** Height in rows (multi-line matches). */
  h?: number;
  f: number;
}

export interface FilmData {
  spec: FeatureSpec;
  fps: number;
  cols: number;
  rows: number;
  /** Demo length in film seconds after remapping. */
  duration: number;
  table: Point[];
  ramps: { f0: number; f1: number; speed: number }[];
  /** Film-demo seconds at which each marker is reached. */
  markers: Record<string, number>;
  styles: Style[];
  lines: Run[][];
  frames: Snapshot[];
  anchors: (Anchor | null)[];
}

export function castAt(table: Point[], film: number): number {
  if (film <= table[0][0]) return table[0][1];
  for (let i = 1; i < table.length; i++) {
    const [f1, c1] = table[i];
    if (film <= f1) {
      const [f0, c0] = table[i - 1];
      return f1 === f0 ? c1 : c0 + ((film - f0) / (f1 - f0)) * (c1 - c0);
    }
  }
  return table[table.length - 1][1];
}

export function frameAt(frames: Snapshot[], c: number): Snapshot {
  let lo = 0;
  let hi = frames.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (frames[mid].c <= c + 1e-6) lo = mid;
    else hi = mid - 1;
  }
  return frames[lo];
}
