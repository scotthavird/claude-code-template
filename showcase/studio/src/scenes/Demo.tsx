import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { color, motion } from "../brand/tokens";
import { Background } from "../components/Background";
import {
  CalloutCard,
  HighlightBox,
  KeyCap,
  SpeedChip,
  envelope,
  type Box,
} from "../components/Overlays";
import { CELL_W, LINE_H, TerminalGrid } from "../components/Terminal";
import { TITLEBAR, Window } from "../components/Window";
import { castAt, frameAt, type FilmData } from "../lib/film";
import { calloutStart, demoTimeAt, type DemoWindow } from "../lib/timeline";

export interface DemoLayout {
  /** Box the window must fit in (frame coords). */
  area: { x: number; y: number; w: number; h: number };
  /** Where a zoom target is centered. */
  focus: [number, number];
  cardFont: number;
  /** Space kept free at the bottom for captions (cards avoid it). */
  safeBottom: number;
  chrome: number; // chrome scale
}

export function demoLayout(
  width: number,
  height: number,
  captions: boolean,
): DemoLayout {
  if (height > width * 1.3) {
    // 9:16
    return {
      area: { x: 36, y: 430, w: width - 72, h: height - 430 - 360 },
      focus: [width / 2, height * 0.5],
      cardFont: 34,
      safeBottom: 0,
      chrome: 0.8,
    };
  }
  if (Math.abs(height - width) < 10) {
    // 1:1
    return {
      area: {
        x: 36,
        y: 70,
        w: width - 72,
        h: height - 70 - (captions ? 190 : 70),
      },
      focus: [width / 2, height * 0.44],
      cardFont: 30,
      safeBottom: captions ? 170 : 0,
      chrome: 0.75,
    };
  }
  return {
    area: {
      x: 150,
      y: 60,
      w: width - 300,
      h: height - 60 - (captions ? 165 : 60),
    },
    focus: [width / 2, height * 0.45],
    cardFont: 34,
    safeBottom: captions ? 150 : 0,
    chrome: 1,
  };
}

export const Demo: React.FC<{
  film: FilmData;
  win: DemoWindow;
  captions: boolean;
  title: string;
  loop?: boolean;
}> = ({ film, win, captions, title, loop = false }) => {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();
  const L = demoLayout(width, height, captions);
  const padX = 30 * L.chrome;
  const padY = 22 * L.chrome;
  const tb = TITLEBAR * L.chrome;
  const fs = Math.min(
    (L.area.w - 2 * padX) / (film.cols * CELL_W),
    (L.area.h - tb - 2 * padY) / (film.rows * LINE_H),
  );
  const cw = fs * CELL_W;
  const lh = fs * LINE_H;
  const winW = film.cols * cw + 2 * padX;
  const winH = film.rows * lh + 2 * padY + tb;
  const wx = L.area.x + (L.area.w - winW) / 2;
  const wy = L.area.y + (L.area.h - winH) / 2;
  const ox = wx + padX;
  const oy = wy + tb + padY;

  const d = demoTimeAt(win, frame, fps);
  const cast = castAt(film.table, d);
  const toFrame = (demoSec: number) =>
    (win.lead + (demoSec - win.start) / win.rate) * fps;

  // Callouts in this cut, with frame windows and identity-space boxes.
  const items = win.callouts
    .map((i) => {
      const c = film.spec.callouts[i];
      const a = film.anchors[i];
      const s = calloutStart(film, c);
      return {
        i,
        c,
        a,
        start: toFrame(s),
        end: toFrame(s + c.duration),
        box: a
          ? ({
              x: ox + a.col * cw,
              y: oy + a.row * lh,
              w: a.len * cw,
              h: (a.h ?? 1) * lh,
            } as Box)
          : null,
      };
    })
    .filter((x) => x.box && x.end > 0 && x.start < durationInFrames);

  // Base camera (social cuts): crop to the columns that actually carry text so
  // type stays legible on a phone. Landscape keeps the whole window (B = 1).
  let B = 1;
  let b0x = 0;
  let b0y = 0;
  if (width < height * 1.3) {
    const ext: number[] = [];
    for (const fr of film.frames) {
      if (fr.c < castAt(film.table, win.start) - 1e-6 || fr.c > castAt(film.table, win.end) + 1e-6) continue;
      for (const li of fr.l) {
        const runs = film.lines[li].filter((r) => r.t.trim() !== "" && !/^[─━│┃╭╮╰╯]+$/.test(r.t.trim()));
        if (runs.length) {
          const last = runs[runs.length - 1];
          ext.push(last.c + (last.g ?? last.t.trimEnd().length));
        }
      }
    }
    ext.sort((x, y) => x - y);
    const p90 = ext.length ? ext[Math.floor(ext.length * 0.9)] : film.cols;
    const contentCols = Math.max(44, Math.min(film.cols, p90 + 3));
    B = Math.max(1, Math.min(2.2, (L.area.w - padX) / (contentCols * cw + padX), L.area.h / winH));
    b0x = L.area.x - B * wx;
    b0y = L.area.y + L.area.h / 2 - B * (wy + winH / 2);
  }
  const base = (b: Box): Box => ({ x: B * b.x + b0x, y: B * b.y + b0y, w: B * b.w, h: B * b.h });

  // Zoom camera: weighted toward the active zoom callout (in base-camera space).
  let camP = 0;
  let camBox: Box | null = null;
  let camZoom = 1;
  for (const it of items) {
    if (it.c.kind !== "zoom" || !it.box) continue;
    const enter = spring({ frame: frame - it.start, fps, config: motion.camera });
    const exit = spring({ frame: frame - (it.end - 10), fps, config: motion.camera });
    const p = Math.max(0, Math.min(1, enter - exit));
    if (p > camP) {
      camP = p;
      camBox = base(it.box);
      camZoom = Math.max(1, Math.min((it.c.zoom ?? 1.8) / Math.sqrt(B), (width * 0.88) / camBox.w));
    }
  }
  const S = 1 + (camZoom - 1) * camP;
  let Tx = 0;
  let Ty = 0;
  if (camBox) {
    const bx = camBox.x + camBox.w / 2;
    const by = camBox.y + camBox.h / 2;
    const cx = bx + (L.focus[0] - bx) * camP;
    const cy = by + (L.focus[1] - by) * camP;
    Tx = cx - S * bx;
    Ty = cy - S * by;
  }
  // total transform: screen = s * p + (tx, ty)
  const s = S * B;
  const tx = S * b0x + Tx;
  const ty = S * b0y + Ty;
  const toScreen = (b: Box): Box => ({
    x: s * b.x + tx,
    y: s * b.y + ty,
    w: s * b.w,
    h: s * b.h,
  });

  // Window rect + left text gutter in screen space (cards may sit outside the window).
  const wTL = { x: s * wx + tx, y: s * wy + ty };
  const winFrame = {
    box: { x: wTL.x, y: wTL.y, w: s * winW, h: s * winH },
    gutterX: Math.max(24, s * (ox - padX * 0.5) + tx),
  };

  // Text currently on screen (screen space): callout cards try not to cover it.
  const snap = frameAt(film.frames, cast);
  const avoid: Box[] = [];
  snap.l.forEach((li, y) => {
    const runs = film.lines[li].filter((r) => r.t.trim() !== "");
    if (!runs.length) return;
    const c0 = runs[0].c + (runs[0].t.length - runs[0].t.trimStart().length);
    const last = runs[runs.length - 1];
    const c1 = last.c + (last.g ?? last.t.trimEnd().length);
    avoid.push(toScreen({ x: ox + c0 * cw, y: oy + y * lh, w: (c1 - c0) * cw, h: lh }));
  });

  // Entrance: the terminal settles in from slightly larger and blurred.
  const enter = loop
    ? 1
    : spring({ frame, fps, config: motion.enter, durationInFrames: 24 });
  const entScale = interpolate(enter, [0, 1], [1.06, 1]);
  const blur = (1 - enter) * 10;

  // Loop: crossfade back to frame 0 so the GIF loops seamlessly.
  const loopFade = loop
    ? interpolate(
        frame,
        [durationInFrames - win.tail * fps, durationInFrames - 1],
        [0, 1],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
      )
    : 0;

  // Spotlight for the strongest active callout/zoom.
  let spot: { box: Box; p: number } | null = null;
  for (const it of items) {
    if (it.c.kind === "keycap") continue;
    const p = envelope(frame, it.start, it.end, fps);
    if (p > 0 && (!spot || p > spot.p)) spot = { box: toScreen(it.box!), p };
  }

  const speed = film.ramps
    .map((r) => ({
      r,
      p: envelope(frame, toFrame(r.f0), toFrame(r.f1), fps, motion.pop),
    }))
    .find((x) => x.p > 0);

  const terminalLayer = (castTime: number, key: string) => (
    <div
      key={key}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width,
        height,
        transformOrigin: "0 0",
        transform: `translate(${tx}px, ${ty}px) scale(${s})`,
      }}
    >
      <div style={{ position: "absolute", left: wx, top: wy }}>
        <Window
          title={title}
          width={winW}
          height={winH}
          padX={padX}
          padY={padY}
          scale={L.chrome}
          glow={1 + camP * 0.6}
        >
          <TerminalGrid film={film} castTime={castTime} fontSize={fs} />
        </Window>
      </div>
    </div>
  );

  return (
    <AbsoluteFill>
      <Background
        focus={[(wx + winW / 2) / width, (wy + winH / 2) / height]}
        intensity={1 + camP * 0.4}
        still={loop}
      />
      <AbsoluteFill
        style={{
          transform: `scale(${entScale})`,
          filter: blur > 0.2 ? `blur(${blur}px)` : undefined,
          opacity: enter,
        }}
      >
        {terminalLayer(cast, "live")}
        {loopFade > 0 ? (
          <div style={{ position: "absolute", inset: 0, opacity: loopFade }}>
            {terminalLayer(castAt(film.table, win.start), "loop")}
          </div>
        ) : null}

        {/* spotlight: darken everything except the active box */}
        {spot ? (
          <div
            style={{
              position: "absolute",
              left: spot.box.x - 14,
              top: spot.box.y - 10,
              width: spot.box.w + 28,
              height: spot.box.h + 20,
              borderRadius: 14,
              boxShadow: `0 0 0 4000px rgba(10,10,9,${0.42 * spot.p * (1 - loopFade)})`,
              pointerEvents: "none",
            }}
          />
        ) : null}

        {items.map((it) => {
          const p = envelope(frame, it.start, it.end, fps) * (1 - loopFade);
          if (p <= 0) return null;
          const b = toScreen(it.box!);
          if (it.c.kind === "keycap") {
            return (
              <KeyCap
                key={it.i}
                keys={it.c.keys ?? ["⏎"]}
                x={Math.min(width - 80, b.x + b.w + 70 * L.chrome)}
                y={b.y + b.h / 2}
                frame={frame - it.start}
                fps={fps}
                size={60 * L.chrome}
              />
            );
          }
          return (
            <React.Fragment key={it.i}>
              <HighlightBox
                box={b}
                p={p}
                pad={10 * Math.max(1, s * 0.8)}
                strong={it.c.kind !== "highlight"}
              />
              {it.c.text ? (
                <CalloutCard
                  box={{ x: b.x - 10, y: b.y - 8, w: b.w + 20, h: b.h + 16 }}
                  text={it.c.text}
                  p={p}
                  frameW={width}
                  frameH={height}
                  fontSize={L.cardFont}
                  prefer={it.c.kind === "highlight" ? "right" : "below"}
                  safeBottom={L.safeBottom}
                  avoid={avoid}
                  rowH={lh * s}
                  win={winFrame}
                />
              ) : null}
            </React.Fragment>
          );
        })}

        {speed ? (
          <SpeedChip
            speed={speed.r.speed}
            p={speed.p}
            x={Math.min(width - 30, s * (wx + winW - 18) + tx)}
            y={Math.max(20, s * (wy + tb + 14) + ty)}
            scale={L.chrome * 1.3}
          />
        ) : null}
      </AbsoluteFill>
      {/* caption scrim: keeps zoomed terminal text from showing through burned-in captions */}
      {captions ? (
        <AbsoluteFill
          style={{
            pointerEvents: "none",
            opacity: camP,
            background:
              height > width * 1.3
                ? `linear-gradient(180deg, ${color.bg}F2 0%, ${color.bg}CC 17%, ${color.bg}00 24%)`
                : `linear-gradient(180deg, ${color.bg}00 0%, ${color.bg}00 76%, ${color.bg}D9 86%, ${color.bg}F2 100%)`,
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};
