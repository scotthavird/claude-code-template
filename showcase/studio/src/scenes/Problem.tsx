import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { fonts } from "../brand/fonts";
import { color, motion } from "../brand/tokens";
import { Background } from "../components/Background";
import { Eyebrow, Rich } from "../components/Overlays";
import { Window } from "../components/Window";
import type { FilmData } from "../lib/film";
import { shapeOf, unit } from "../lib/layout";
import { problemBeat } from "../lib/timeline";

/** Secret-looking substrings in the "before" terminal turn rust. */
const SECRETISH =
  /(sk-[A-Za-z0-9_-]+…?|AKIA[0-9A-Z]+…?|ghp_[A-Za-z0-9]+…?|eyJ[\w.-]+…?|xox[a-z]-[\w-]+…?)/g;

const IS_SECRET = new RegExp(`^${SECRETISH.source}$`);

const BeforeTerminal: React.FC<{
  lines: string[];
  u: number;
  width: number;
  danger: number;
  dim: number;
}> = ({ lines, u, width, danger, dim }) => {
  const frame = useCurrentFrame();
  const shake =
    danger > 0 && danger < 1 ? Math.sin(frame * 2.3) * 7 * (1 - danger) * u : 0;
  return (
    <div
      style={{
        transform: `translateX(${shake}px)`,
        opacity: 1 - dim * 0.55,
        filter: dim > 0 ? `saturate(${1 - dim * 0.6})` : undefined,
      }}
    >
      <Window
        title="before: no hook"
        width={width}
        height={(lines.length * 54 + 44) * u + 50 * u}
        padX={28 * u}
        padY={20 * u}
        scale={u}
        glow={0}
      >
        <div
          style={{
            fontFamily: fonts.mono,
            fontSize: 30 * u,
            lineHeight: `${54 * u}px`,
            whiteSpace: "pre",
            color: "#E8E6DC",
          }}
        >
          {lines.map((ln, i) => (
            <div key={i}>
              {ln.replace('⏺', '●').split(SECRETISH).map((part, k) =>
                IS_SECRET.test(part) ? (
                  <span
                    key={k}
                    style={{
                      color: "#FFB4A2",
                      background: `rgba(200,85,61,${0.18 + 0.25 * danger})`,
                      borderRadius: 6,
                      padding: `0 ${6 * u}px`,
                      boxShadow: `0 0 ${24 * danger}px rgba(200,85,61,.55)`,
                    }}
                  >
                    {part}
                  </span>
                ) : (
                  <span
                    key={k}
                    style={{
                      color: /^[⏺●]/.test(part) ? color.inkMuted : undefined,
                    }}
                  >
                    {part}
                  </span>
                ),
              )}
            </div>
          ))}
        </div>
      </Window>
      <div
        style={{
          position: "absolute",
          inset: -2,
          borderRadius: 16 * u,
          border: `2px solid rgba(200,85,61,${0.8 * danger * (1 - dim)})`,
          pointerEvents: "none",
        }}
      />
    </div>
  );
};

export const Problem: React.FC<{ film: FilmData }> = ({ film }) => {
  const frame = useCurrentFrame();
  const { width, height, fps, durationInFrames } = useVideoConfig();
  const u = unit(width, height);
  const shape = shapeOf(width, height);
  const beats = film.spec.problem;
  const lastIdx = beats.length - 1;
  const lastBeat = problemBeat(film, lastIdx, durationInFrames, fps);
  const danger = spring({
    frame: frame - 8,
    fps,
    config: { damping: 14, stiffness: 120 },
  });
  const dim = interpolate(frame, [lastBeat.from, lastBeat.from + 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const termIn = spring({ frame, fps, config: motion.enter });
  const lines = film.spec.before.length
    ? film.spec.before
    : ["⏺ Read(.env)", "  API_KEY=sk-live-…"];
  const termW = (shape === "landscape" ? 860 : 940) * u;

  const beatList = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 30 * u,
        maxWidth: shape === "landscape" ? 860 * u : width - 120 * u,
      }}
    >
      <Eyebrow scale={u} tone={color.rust}>
        The problem
      </Eyebrow>
      {beats.map((b, i) => {
        const bt = problemBeat(film, i, durationInFrames, fps);
        const p = spring({ frame: frame - bt.from, fps, config: motion.enter });
        const isLast = i === lastIdx;
        const past = !isLast && frame > bt.from + bt.frames ? 1 : 0;
        const fade = interpolate(
          frame,
          [bt.from + bt.frames, bt.from + bt.frames + 10],
          [0, 1],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        );
        return (
          <div
            key={i}
            style={{
              fontFamily: fonts.display,
              fontWeight: isLast ? 800 : 700,
              fontSize: (isLast ? 68 : 58) * u,
              textWrap: "balance",
              lineHeight: 1.08,
              letterSpacing: -1.2 * u,
              color: isLast ? color.clay : color.ink,
              opacity: p * (past ? 1 - fade * 0.62 : 1),
              transform: `translateY(${(1 - p) * 26}px)`,
            }}
          >
            <Rich text={b} codeColor={isLast ? color.ink : color.clay} />
          </div>
        );
      })}
    </div>
  );

  return (
    <AbsoluteFill>
      <Background
        focus={shape === "landscape" ? [0.3, 0.5] : [0.5, 0.3]}
        tone={dim > 0.5 ? "clay" : "rust"}
        intensity={0.9}
      />
      <AbsoluteFill
        style={{
          flexDirection: shape === "landscape" ? "row" : "column",
          alignItems: "center",
          justifyContent: "center",
          gap: (shape === "landscape" ? 90 : 70) * u,
          padding: 60 * u,
        }}
      >
        <div
          style={{
            position: "relative",
            opacity: termIn,
            transform: `translateY(${(1 - termIn) * 30}px)`,
          }}
        >
          <BeforeTerminal
            lines={lines}
            u={u}
            width={termW}
            danger={danger}
            dim={dim}
          />
        </div>
        {beatList}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
