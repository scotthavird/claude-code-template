import React from "react";
import {
  AbsoluteFill,
  interpolate,
  random,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { fonts } from "../brand/fonts";
import { color, motion } from "../brand/tokens";
import { Background } from "../components/Background";
import { Eyebrow, Rich, VersionChip } from "../components/Overlays";
import type { FilmData } from "../lib/film";
import { shapeOf, unit } from "../lib/layout";

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&*+=<>/";

/** Feature name: mono characters scramble and resolve, then morph into the display face. */
export const NameResolve: React.FC<{
  name: string;
  size: number;
  startFrame?: number;
}> = ({ name, size, startFrame = 0 }) => {
  const frame = useCurrentFrame() - startFrame;
  const { fps } = useVideoConfig();
  const resolveEnd = 16;
  const morph = spring({
    frame: frame - resolveEnd,
    fps,
    config: motion.enter,
    durationInFrames: 18,
  });
  const chars = name.split("").map((ch, i) => {
    if (ch === " ") return " ";
    const settle = 3 + i * 0.9;
    if (frame >= settle) return ch;
    return GLYPHS[
      Math.floor(
        random(`${name}-${i}-${Math.floor(frame / 2)}`) * GLYPHS.length,
      )
    ];
  });
  const appear = interpolate(frame, [0, 6], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "relative",
        height: size * 1.12,
        display: "flex",
        justifyContent: "center",
        opacity: appear,
      }}
    >
      <div
        style={{
          position: "absolute",
          whiteSpace: "pre",
          fontFamily: fonts.mono,
          fontWeight: 700,
          fontSize: size * 0.82,
          lineHeight: `${size * 1.12}px`,
          color: color.clay,
          opacity: 1 - morph,
          letterSpacing: size * 0.02,
          filter: `blur(${morph * 6}px)`,
        }}
      >
        {chars.join("")}
      </div>
      <div
        style={{
          whiteSpace: "pre",
          fontFamily: fonts.display,
          fontWeight: 800,
          fontSize: size,
          lineHeight: `${size * 1.12}px`,
          letterSpacing: -size * 0.035 * morph,
          color: color.ink,
          opacity: morph,
          filter: `blur(${(1 - morph) * 6}px)`,
          transform: `scale(${0.97 + 0.03 * morph})`,
        }}
      >
        {name}
      </div>
    </div>
  );
};

export const RevealBlock: React.FC<{
  film: FilmData;
  startFrame?: number;
  compact?: boolean;
}> = ({ film, startFrame = 0, compact = false }) => {
  const frame = useCurrentFrame() - startFrame;
  const { width, height, fps } = useVideoConfig();
  const u = unit(width, height);
  const shape = shapeOf(width, height);
  const name = film.spec.name ?? film.spec.title;
  const chip = spring({ frame: frame - 2, fps, config: motion.pop });
  const tag = spring({ frame: frame - 22, fps, config: motion.enter });
  const wipe = interpolate(frame, [14, 34], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: motion.ease,
  });
  const nameSize =
    (shape === "landscape" ? 150 : name.length > 12 ? 118 : 140) * u;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: (compact ? 26 : 34) * u,
        textAlign: "center",
      }}
    >
      <VersionChip version={film.spec.version} p={chip} scale={u * 1.1} />
      <NameResolve name={name} size={nameSize} startFrame={startFrame + 4} />
      <div
        style={{
          width: 520 * u * wipe,
          height: 5 * u,
          borderRadius: 9,
          background: `linear-gradient(90deg, transparent, ${color.clay}, transparent)`,
          marginTop: -6 * u,
        }}
      />
      <div
        style={{
          maxWidth: (shape === "landscape" ? 1500 : 900) * u,
          textWrap: "balance",
          fontFamily: fonts.display,
          fontWeight: 600,
          fontSize: (shape === "landscape" ? 48 : 52) * u,
          lineHeight: 1.22,
          letterSpacing: -0.6 * u,
          color: color.inkMuted,
          opacity: tag,
          transform: `translateY(${(1 - tag) * 18}px)`,
        }}
      >
        <Rich text={film.spec.tagline} />
      </div>
    </div>
  );
};

export const Reveal: React.FC<{ film: FilmData }> = ({ film }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const u = unit(width, height);
  const sweep = interpolate(frame, [0, 22], [-0.2, 1.2], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: motion.ease,
  });
  return (
    <AbsoluteFill>
      <Background focus={[0.5, 0.48]} intensity={1.25} />
      {/* clay light sweep */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(100deg, transparent ${sweep * 100 - 18}%, rgba(217,119,87,.16) ${sweep * 100}%, transparent ${sweep * 100 + 18}%)`,
        }}
      />
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          padding: 80 * u,
        }}
      >
        <Eyebrow scale={u} tone={color.inkFaint} p={0}>
          {" "}
        </Eyebrow>
        <RevealBlock film={film} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
