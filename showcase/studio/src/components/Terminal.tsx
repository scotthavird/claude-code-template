import React from "react";
import { fonts } from "../brand/fonts";
import { paletteColor, terminal } from "../brand/tokens";
import { frameAt, type FilmData, type Style } from "../lib/film";

export const CELL_W = 0.6; // JetBrains Mono advance, in em
export const LINE_H = 1.36;

/** Glyphs whose fallback fonts render as color emoji or with odd widths. */
const GLYPH: Record<string, string> = {
  "⏺": "●",
  "⏵": "▸",
  "⏩": "»",
  "✻": "✻",
};

/** Block elements (U+2580..U+259F) as quadrant bitmasks: TL=1 TR=2 BL=4 BR=8. Drawn as rects so they tile seamlessly. */
const QUAD: Record<string, number> = {
  '▀': 3, '▄': 12, '█': 15, '▌': 5, '▐': 10, '▖': 4, '▗': 8, '▘': 1,
  '▙': 13, '▚': 9, '▛': 7, '▜': 11, '▝': 2, '▞': 6, '▟': 14,
};

const Block: React.FC<{ mask: number; x: number; w: number; h: number; fg: string; bg: string }> = ({ mask, x, w, h, fg, bg }) => {
  const q = [
    [1, 0, 0],
    [2, 0.5, 0],
    [4, 0, 0.5],
    [8, 0.5, 0.5],
  ] as const;
  return (
    <div style={{ position: 'absolute', left: x, top: 0, width: w, height: h, background: bg }}>
      {q.map(([bit, qx, qy]) =>
        mask & bit ? (
          <div key={bit} style={{ position: 'absolute', left: qx * w - 0.25, top: qy * h - 0.25, width: w / 2 + 0.5, height: h / 2 + 0.5, background: fg }} />
        ) : null,
      )}
    </div>
  );
};

function resolve(c: string, fallback: string): string {
  if (c === "d") return fallback;
  if (c[0] === "p") return paletteColor(Number(c.slice(1)));
  return terminal.map[c] ?? c;
}

function styleCss(s: Style): React.CSSProperties {
  let fg = resolve(s.fg, terminal.fg);
  let bg = s.bg === "d" ? "transparent" : resolve(s.bg, terminal.bg);
  if (s.v) {
    const nf = s.bg === "d" ? terminal.bg : bg;
    bg = s.fg === "d" ? terminal.fg : fg;
    fg = nf;
  }
  return {
    color: fg,
    background: bg,
    fontWeight: s.b ? 700 : 400,
    fontStyle: s.i ? "italic" : "normal",
    opacity: s.d ? 0.6 : 1,
    textDecoration: s.u ? "underline" : "none",
  };
}

export const TerminalGrid: React.FC<{
  film: FilmData;
  /** Cast seconds. */
  castTime: number;
  fontSize: number;
  /** Rows whose text should glow (e.g. a highlighted match). */
  dimOthers?: number;
}> = ({ film, castTime, fontSize }) => {
  const snap = frameAt(film.frames, castTime);
  const cw = fontSize * CELL_W;
  const lh = fontSize * LINE_H;
  return (
    <div
      style={{
        position: "relative",
        width: film.cols * cw,
        height: film.rows * lh,
        fontFamily: fonts.mono,
        fontSize,
        lineHeight: `${lh}px`,
        fontVariantLigatures: "none",
        fontFeatureSettings: '"liga" 0, "calt" 0',
        whiteSpace: "pre",
      }}
    >
      {snap.l.map((li, y) => (
        <div
          key={y}
          style={{
            position: "absolute",
            left: 0,
            top: y * lh,
            height: lh,
            width: "100%",
          }}
        >
          {film.lines[li].map((r, k) => {
            const w = (r.g ?? r.t.length) * cw;
            if (r.g && QUAD[r.t] !== undefined) {
              const css = styleCss(film.styles[r.s]);
              return <Block key={k} mask={QUAD[r.t]} x={r.c * cw} w={w} h={lh} fg={String(css.color)} bg={String(css.background)} />;
            }
            const text = r.g ? (GLYPH[r.t] ?? r.t) : r.t;
            return (
              <span
                key={k}
                style={{
                  position: "absolute",
                  left: r.c * cw,
                  top: 0,
                  width: w,
                  height: lh,
                  textAlign: r.g ? "center" : "left",
                  overflow: "visible",
                  ...styleCss(film.styles[r.s]),
                }}
              >
                {text}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};
