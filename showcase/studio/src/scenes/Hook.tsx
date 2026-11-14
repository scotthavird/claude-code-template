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
import type { FilmData } from "../lib/film";
import { shapeOf, unit } from "../lib/layout";

/** Words stagger up one by one; `.env` / `code` render as mono clay chips. */
export const StaggerLine: React.FC<{
  text: string;
  size: number;
  startFrame?: number;
  weight?: number;
  maxWidth: number;
  align?: "center" | "left";
}> = ({
  text,
  size,
  startFrame = 0,
  weight = 800,
  maxWidth,
  align = "center",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = text.split(" ");
  // Balance wrapped lines (no one-word orphans): shrink the box to an even share of the text.
  const est = text.length * size * 0.5;
  const lines = Math.ceil(est / maxWidth);
  const boxW = lines > 1 ? Math.min(maxWidth, (est / lines) * 1.12) : maxWidth;
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: align === "center" ? "center" : "flex-start",
        columnGap: size * 0.26,
        rowGap: size * 0.06,
        maxWidth: boxW,
        fontFamily: fonts.display,
        fontWeight: weight,
        fontSize: size,
        lineHeight: 1.04,
        letterSpacing: -size * 0.025,
        color: color.ink,
      }}
    >
      {words.map((w, i) => {
        const p = spring({
          frame: frame - startFrame - i * motion.stagger,
          fps,
          config: motion.enter,
        });
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              overflow: "hidden",
              paddingBottom: size * 0.08,
            }}
          >
            <span
              style={{
                display: "inline-block",
                transform: `translateY(${(1 - p) * 105}%)`,
                opacity: p,
              }}
            >
              <Rich text={w} />
            </span>
          </span>
        );
      })}
    </div>
  );
};

export const GlyphPulse: React.FC<{ size: number; category: string }> = ({
  size,
  category,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame, fps, config: motion.pop });
  const ring = (frame % 45) / 45;
  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        transform: `scale(${p})`,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: size * 0.28,
          border: `2px solid ${color.clay}`,
          opacity: 1 - ring,
          transform: `scale(${1 + ring * 0.5})`,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: size * 0.28,
          background: "linear-gradient(160deg, #E08A6C, #C6613F)",
          boxShadow: `0 0 ${size * 0.8}px rgba(217,119,87,.5)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CategoryIcon category={category} size={size * 0.5} />
      </div>
    </div>
  );
};

export const CategoryIcon: React.FC<{
  category: string;
  size: number;
  stroke?: string;
}> = ({ category, size, stroke = "#141413" }) => {
  const common = {
    fill: "none",
    stroke,
    strokeWidth: 2.2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  const paths: Record<string, React.ReactNode> = {
    hooks: (
      <>
        <path d="M12 3v7a4 4 0 0 1-8 0V8" {...common} />
        <path d="M12 3a3 3 0 0 1 3 3v2" {...common} />
        <circle cx="12" cy="3" r="1.4" fill={stroke} />
        <path d="M15 14h6M18 11v6" {...common} />
      </>
    ),
    commands: <path d="M5 7l5 5-5 5M12 17h7" {...common} />,
    skills: (
      <path
        d="M12 3l2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5z"
        {...common}
      />
    ),
    agents: (
      <>
        <rect x="5" y="8" width="14" height="10" rx="3" {...common} />
        <path d="M12 4v4M9 13h.01M15 13h.01" {...common} />
      </>
    ),
    mcp: <path d="M7 7h10v10H7zM3 12h4M17 12h4M12 3v4M12 17v4" {...common} />,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      {paths[category] ?? <path d="M4 12h16M12 4v16" {...common} />}
    </svg>
  );
};

export const Hook: React.FC<{ film: FilmData }> = ({ film }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const u = unit(width, height);
  const shape = shapeOf(width, height);
  const eyebrow = spring({ frame: frame - 2, fps, config: motion.enter });
  const size = (shape === "landscape" ? 116 : 104) * u;
  return (
    <AbsoluteFill>
      <Background focus={[0.5, 0.42]} intensity={0.9} tone="rust" />
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 44 * u,
          padding: 80 * u,
        }}
      >
        <GlyphPulse size={92 * u} category={film.spec.category} />
        <div style={{ transform: `translateY(${(1 - eyebrow) * 10}px)` }}>
          <Eyebrow p={eyebrow} scale={u} tone={color.inkMuted}>
            Claude Code · {film.spec.category}
          </Eyebrow>
        </div>
        {film.spec.hook.map((line, i) => (
          <StaggerLine
            key={i}
            text={line}
            size={size}
            startFrame={6 + i * 12}
            maxWidth={width - 160 * u}
          />
        ))}
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at 50% 50%, transparent 60%, rgba(200,85,61,${interpolate(frame, [20, 60], [0, 0.12], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}) 100%)`,
        }}
      />
    </AbsoluteFill>
  );
};
