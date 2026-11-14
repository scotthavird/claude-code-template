import React from "react";
import { interpolate, spring, type SpringConfig } from "remotion";
import { fonts } from "../brand/fonts";
import { color, motion } from "../brand/tokens";

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** 0..1 presence of a callout: springs in at `start`, eases out over the last frames. */
export function envelope(
  frame: number,
  start: number,
  end: number,
  fps: number,
  cfg: Partial<SpringConfig> = motion.enter,
): number {
  if (frame < start - 1 || frame > end + 12) return 0;
  const enter = spring({
    frame: frame - start,
    fps,
    config: cfg,
    durationInFrames: 14,
  });
  const exit = interpolate(frame, [end - 8, end + 2], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: motion.easeInOut,
  });
  return Math.max(0, Math.min(1, enter * exit));
}

/** Clay highlight box with a sweep-in stroke. */
export const HighlightBox: React.FC<{
  box: Box;
  p: number;
  pad?: number;
  radius?: number;
  strong?: boolean;
}> = ({ box, p, pad = 8, radius = 10, strong = false }) => {
  if (p <= 0.001) return null;
  const x = box.x - pad;
  const y = box.y - pad * 0.7;
  const w = box.w + pad * 2;
  const h = box.h + pad * 1.4;
  const per = 2 * (w + h);
  return (
    <svg
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        overflow: "visible",
        pointerEvents: "none",
      }}
      width={1}
      height={1}
    >
      <defs>
        <filter id="hl-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="8" />
        </filter>
      </defs>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={radius}
        fill={`rgba(217,119,87,${(strong ? 0.12 : 0.07) * p})`}
      />
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={radius}
        fill="none"
        stroke={color.clay}
        strokeOpacity={0.55 * p}
        strokeWidth={6}
        filter="url(#hl-glow)"
      />
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={radius}
        fill="none"
        stroke={color.clay}
        strokeWidth={2.5}
        strokeDasharray={per}
        strokeDashoffset={per * (1 - Math.min(1, p * 1.15))}
        strokeLinecap="round"
      />
    </svg>
  );
};

/** Approximate rendered width of card text (Inter Tight 600 + mono spans). */
export function cardWidth(text: string, fontSize: number): number {
  const mono = (text.match(/\[[A-Z][^\]]*\]|`[^`]+`/g) ?? []).join("").length;
  return (
    (text.length - mono) * fontSize * 0.47 +
    mono * fontSize * 0.9 * 0.6 +
    fontSize * 1.6 +
    10
  );
}

const overlap = (a: Box, b: Box) =>
  Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) *
  Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));

export type Side =
  "below" | "above" | "right" | "outside-below" | "outside-above";

/** Window rect (screen space) and its left gutter, for cards placed outside the terminal. */
export interface WindowFrame {
  box: Box;
  gutterX: number;
}

/**
 * Pick a card position near `box` that covers as little terminal text (`avoid`)
 * as possible. Candidates are scored in preference order; overlap dominates.
 * When every spot inside the terminal covers text, the card moves outside the
 * window and its connector runs down the window's left gutter.
 */
export function placeCard(
  box: Box,
  cardW: number,
  cardH: number,
  avoid: Box[],
  frameW: number,
  frameH: number,
  prefer: "below" | "above" | "right",
  rowH: number,
  safeBottom: number,
  win?: WindowFrame,
): { x: number; y: number; side: Side } {
  const m = 36;
  const clampX = (x: number) => Math.max(m, Math.min(frameW - m - cardW, x));
  const alignX = clampX(box.x - 6);
  const right = {
    x: box.x + box.w + rowH * 1.1,
    y: box.y + box.h / 2 - cardH / 2,
    side: "right" as Side,
  };
  const below = (k: number) => ({
    x: alignX,
    y: box.y + box.h + rowH * (0.55 + k),
    side: "below" as Side,
  });
  const above = (k: number) => ({
    x: alignX,
    y: box.y - cardH - rowH * (0.55 + k),
    side: "above" as Side,
  });
  const ks = [0, 1, 2, 3, 4];
  const cands: { x: number; y: number; side: Side }[] =
    prefer === "above"
      ? [...ks.flatMap((k) => [above(k), below(k)]), right]
      : [right, ...ks.flatMap((k) => [below(k), above(k)])];
  if (win) {
    const gx = clampX(win.gutterX - 12);
    cands.push({
      x: gx,
      y: win.box.y + win.box.h + rowH * 0.9,
      side: "outside-below",
    });
    cands.push({
      x: gx,
      y: win.box.y - cardH - rowH * 0.9,
      side: "outside-above",
    });
  }
  let best = cands[0];
  let bestScore = Infinity;
  cands.forEach((c, i) => {
    const r = { x: c.x, y: c.y, w: cardW, h: cardH };
    const out =
      c.x < m - 1 ||
      c.x + cardW > frameW - m + 1 ||
      c.y < m ||
      c.y + cardH > frameH - m - safeBottom;
    const hit =
      avoid.reduce((acc, a) => acc + overlap(r, a), 0) + overlap(r, box) * 4;
    const score = (out ? 1e9 : 0) + hit + i * 40;
    if (score < bestScore) {
      bestScore = score;
      best = c;
    }
  });
  return best;
}

/** Text card with a connector to the box, placed to avoid covering terminal text. */
export const CalloutCard: React.FC<{
  box: Box;
  text: string;
  p: number;
  frameW: number;
  frameH: number;
  fontSize?: number;
  prefer?: "below" | "above" | "right";
  safeBottom?: number;
  avoid?: Box[];
  rowH?: number;
  win?: WindowFrame;
}> = ({
  box,
  text,
  p,
  frameW,
  frameH,
  fontSize = 32,
  prefer = "below",
  safeBottom = 0,
  avoid = [],
  rowH = 30,
  win,
}) => {
  if (p <= 0.001) return null;
  const padX = fontSize * 0.75;
  const padY = fontSize * 0.5;
  const cardW = Math.min(frameW * 0.86, cardWidth(text, fontSize) + padX);
  const cardH = fontSize * 1.3 + padY * 2;
  const pos = placeCard(
    box,
    cardW,
    cardH,
    avoid,
    frameW,
    frameH,
    prefer,
    rowH,
    safeBottom,
    win,
  );
  const { side } = pos;
  const down = side === "below" || side === "outside-below";
  const up = side === "above" || side === "outside-above";
  const lift = (1 - p) * 16 * (up ? 1 : down ? -1 : 0);
  const slide = side === "right" ? (1 - p) * -16 : 0;
  let d: string;
  let dot: [number, number];
  if (side === "right") {
    const x0 = box.x + box.w;
    const y0 = box.y + box.h / 2;
    const x1 = pos.x;
    d = `M${x0},${y0} L${x0 + (x1 - x0) * p},${y0}`;
    dot = [x0, y0];
  } else if (side === "outside-below" || side === "outside-above") {
    // elbow through the window gutter: box-left → gutter → card
    const gx = win ? win.gutterX : box.x - 16;
    const x0 = box.x;
    const y0 = box.y + box.h / 2;
    const y1 = side === "outside-below" ? pos.y : pos.y + cardH;
    const lenH = x0 - gx;
    const lenV = Math.abs(y1 - y0);
    const travel = (lenH + lenV) * p;
    const h = Math.min(lenH, travel);
    const v = Math.max(0, travel - lenH) * Math.sign(y1 - y0);
    d =
      `M${x0},${y0} L${x0 - h},${y0}` +
      (travel > lenH ? ` L${gx},${y0 + v}` : "");
    dot = [x0, y0];
  } else {
    const x0 = Math.max(box.x + 14, Math.min(box.x + box.w - 14, pos.x + 34));
    const y0 = down ? box.y + box.h : box.y;
    const y1 = down ? pos.y : pos.y + cardH;
    d = `M${x0},${y0} L${x0},${y0 + (y1 - y0) * p}`;
    dot = [x0, y0];
  }
  return (
    <>
      <svg
        style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}
        width={1}
        height={1}
      >
        <path
          d={d}
          stroke={color.clay}
          strokeWidth={2}
          fill="none"
          strokeOpacity={0.95}
          strokeLinejoin="round"
        />
        <circle cx={dot[0]} cy={dot[1]} r={4.5 * p} fill={color.clay} />
      </svg>
      <div
        style={{
          position: "absolute",
          left: pos.x + slide,
          top: pos.y + lift,
          width: "max-content",
          maxWidth: cardW + 40,
          height: cardH,
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          opacity: p,
          padding: `0 ${padX}px 0 ${padX + 6}px`,
          borderRadius: 14,
          background:
            "linear-gradient(180deg, rgba(46,45,42,.98), rgba(31,30,29,.98))",
          border: `1px solid rgba(217,119,87,.5)`,
          boxShadow:
            "0 18px 50px rgba(0,0,0,.6), 0 0 0 1px rgba(0,0,0,.3), 0 0 40px rgba(217,119,87,.18)",
          color: color.ink,
          fontFamily: fonts.display,
          fontWeight: 600,
          fontSize,
          letterSpacing: -0.2,
          whiteSpace: "nowrap",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: padY * 0.8,
            bottom: padY * 0.8,
            width: 4,
            borderRadius: 4,
            background: color.clay,
          }}
        />
        <span>
          <Rich text={text} />
        </span>
      </div>
    </>
  );
};
/** Renders `[BRACKETED]` and `code` spans in mono clay. */
export const Rich: React.FC<{ text: string; codeColor?: string }> = ({
  text,
  codeColor = color.clay,
}) => {
  const parts = text.split(/(\[[A-Z][^\]]*\]|`[^`]+`|\.env\b)/g);
  return (
    <>
      {parts.map((p, i) =>
        /^(\[.*\]|`.*`|\.env)$/.test(p) ? (
          <span
            key={i}
            style={{
              fontFamily: fonts.mono,
              fontWeight: 700,
              color: codeColor,
              fontSize: "0.9em",
              letterSpacing: 0,
            }}
          >
            {p.replace(/`/g, "")}
          </span>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
};

/** A key-cap chip that pops in and visibly "presses". */
export const KeyCap: React.FC<{
  keys: string[];
  x: number;
  y: number;
  frame: number;
  fps: number;
  size?: number;
}> = ({ keys, x, y, frame, fps, size = 64 }) => {
  if (frame < 0) return null;
  const pop = spring({ frame, fps, config: motion.pop });
  const press = interpolate(frame, [6, 9, 13], [0, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const out = interpolate(frame, [30, 38], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        display: "flex",
        gap: 10,
        transform: `translate(-50%, -50%) scale(${0.6 + 0.4 * pop}) translateY(${press * 4}px)`,
        opacity: Math.min(1, pop * 1.4) * out,
      }}
    >
      {keys.map((k) => (
        <div
          key={k}
          style={{
            minWidth: size,
            height: size,
            padding: `0 ${size * 0.28}px`,
            borderRadius: size * 0.22,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: fonts.body,
            fontWeight: 600,
            fontSize: size * 0.48,
            color: color.ink,
            background: "linear-gradient(180deg, #3A3936, #2A2927)",
            border: "1px solid rgba(245,244,238,.16)",
            boxShadow: `0 ${6 - press * 4}px 0 #141413, 0 ${10 - press * 6}px 24px rgba(0,0,0,.5), 0 0 ${30 * press}px rgba(217,119,87,.6)`,
          }}
        >
          {k}
        </div>
      ))}
    </div>
  );
};

export const SpeedChip: React.FC<{
  speed: number;
  p: number;
  x: number;
  y: number;
  scale?: number;
}> = ({ speed, p, x, y, scale = 1 }) => {
  if (p <= 0.001) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translate(-100%, 0) scale(${0.85 + 0.15 * p})`,
        transformOrigin: "right top",
        opacity: p,
        display: "flex",
        alignItems: "center",
        gap: 8 * scale,
        padding: `${7 * scale}px ${14 * scale}px`,
        borderRadius: 999,
        background: "rgba(20,20,19,.85)",
        border: `1px solid ${color.hairline}`,
        color: color.inkMuted,
        fontFamily: fonts.mono,
        fontWeight: 700,
        fontSize: 18 * scale,
        letterSpacing: 0.5,
      }}
    >
      <svg width={16 * scale} height={12 * scale} viewBox="0 0 16 12">
        <path d="M0 0 L7 6 L0 12 Z M8 0 L15 6 L8 12 Z" fill={color.clay} />
      </svg>
      {speed}× SPEED
    </div>
  );
};

/** Burned-in caption pill. */
export const Caption: React.FC<{
  text: string;
  p: number;
  y: number;
  frameW: number;
  fontSize?: number;
}> = ({ text, p, y, frameW, fontSize = 34 }) => {
  if (p <= 0.001 || !text) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        width: frameW,
        top: y,
        display: "flex",
        justifyContent: "center",
        opacity: p,
        transform: `translateY(${(1 - p) * 10}px)`,
      }}
    >
      <div
        style={{
          maxWidth: frameW * 0.86,
          padding: `${fontSize * 0.34}px ${fontSize * 0.7}px`,
          borderRadius: 12,
          background: "rgba(14,14,13,.78)",
          border: "1px solid rgba(245,244,238,.08)",
          color: color.ink,
          fontFamily: fonts.body,
          fontWeight: 500,
          fontSize,
          lineHeight: 1.3,
          textAlign: "center",
          textWrap: "balance",
          letterSpacing: -0.1,
          boxShadow: "0 10px 30px rgba(0,0,0,.35)",
        }}
      >
        <Rich text={text} />
      </div>
    </div>
  );
};

export const VersionChip: React.FC<{
  version: string;
  p: number;
  scale?: number;
}> = ({ version, p, scale = 1 }) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 10 * scale,
      padding: `${8 * scale}px ${18 * scale}px`,
      borderRadius: 999,
      border: `1.5px solid rgba(217,119,87,.6)`,
      background: "rgba(217,119,87,.12)",
      color: color.clay,
      fontFamily: fonts.mono,
      fontWeight: 700,
      fontSize: 24 * scale,
      transform: `scale(${0.7 + 0.3 * p})`,
      opacity: Math.min(1, p * 1.3),
    }}
  >
    <div
      style={{
        width: 9 * scale,
        height: 9 * scale,
        borderRadius: 99,
        background: color.clay,
        boxShadow: `0 0 12px ${color.clay}`,
      }}
    />
    Claude Code v{version}
  </div>
);

export const Eyebrow: React.FC<{
  children: React.ReactNode;
  p?: number;
  scale?: number;
  tone?: string;
}> = ({ children, p = 1, scale = 1, tone = color.inkMuted }) => (
  <div
    style={{
      fontFamily: fonts.mono,
      fontWeight: 700,
      fontSize: 22 * scale,
      letterSpacing: 4 * scale,
      textTransform: "uppercase",
      color: tone,
      opacity: p,
    }}
  >
    {children}
  </div>
);
