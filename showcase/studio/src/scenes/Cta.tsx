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
import { CommandPill } from "../components/ConfigCard";
import { Eyebrow } from "../components/Overlays";
import type { FilmData } from "../lib/film";
import { shapeOf, unit } from "../lib/layout";
import { StaggerLine } from "./Hook";

/** Template lockup: a prompt-caret mark + wordmark. Deliberately not an Anthropic logo. */
export const Lockup: React.FC<{ u: number; p: number }> = ({ u, p }) => (
  <div
    style={{ display: "flex", alignItems: "center", gap: 16 * u, opacity: p }}
  >
    <div
      style={{
        width: 52 * u,
        height: 52 * u,
        borderRadius: 14 * u,
        background: "linear-gradient(160deg, #E08A6C, #C6613F)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 0 30px rgba(217,119,87,.45)",
      }}
    >
      <svg width={30 * u} height={30 * u} viewBox="0 0 24 24">
        <path
          d="M5 7l5 5-5 5"
          fill="none"
          stroke="#141413"
          strokeWidth={2.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M12.5 17h6.5"
          stroke="#141413"
          strokeWidth={2.8}
          strokeLinecap="round"
        />
      </svg>
    </div>
    <div
      style={{
        fontFamily: fonts.display,
        fontWeight: 700,
        fontSize: 34 * u,
        color: color.ink,
        letterSpacing: -0.5 * u,
      }}
    >
      claude-code-template
    </div>
  </div>
);

export const Cta: React.FC<{ film: FilmData }> = ({ film }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const u = unit(width, height);
  const shape = shapeOf(width, height);
  const lock = spring({
    frame,
    fps,
    config: motion.enter,
    durationInFrames: 40,
  });
  const scale = interpolate(lock, [0, 1], [0.96, 1]);
  const cmd = spring({ frame: frame - 16, fps, config: motion.enter });
  const url = spring({ frame: frame - 26, fps, config: motion.enter });
  const glow = interpolate(frame, [20, 50], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill>
      <Background focus={[0.5, 0.5]} intensity={1.3 + glow * 0.3} />
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 46 * u,
          padding: 80 * u,
          transform: `scale(${scale})`,
        }}
      >
        <Eyebrow scale={u} tone={color.clay} p={lock}>
          Try it
        </Eyebrow>
        <StaggerLine
          text={film.spec.cta.line}
          size={(shape === "landscape" ? 92 : 84) * u}
          maxWidth={(shape === "landscape" ? 1500 : 940) * u}
        />
        <CommandPill
          command={film.spec.cta.command}
          fontSize={(shape === "landscape" ? 30 : 24) * u}
          p={cmd}
          glow={glow}
        />
        <div
          style={{
            fontFamily: fonts.mono,
            fontSize: 26 * u,
            color: color.inkMuted,
            opacity: url,
            letterSpacing: 0.3,
          }}
        >
          {film.spec.cta.url}
        </div>
        <div style={{ height: 10 * u }} />
        <Lockup u={u} p={url} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Social opener: hook line, then the reveal, in one scene. */
export { Hook } from "./Hook";
