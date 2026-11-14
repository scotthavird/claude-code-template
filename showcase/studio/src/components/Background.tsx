import { noise2D } from "@remotion/noise";
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { color } from "../brand/tokens";

/** Subtle grid + drifting clay glow. `focus` positions the glow (0..1 of the frame). */
export const Background: React.FC<{
  focus?: [number, number];
  intensity?: number;
  tone?: "clay" | "rust" | "sage";
  /** Freeze motion (GIF loops: static backgrounds compress far better). */
  still?: boolean;
}> = ({ focus = [0.5, 0.45], intensity = 1, tone = "clay", still = false }) => {
  const live = useCurrentFrame();
  const frame = still ? 0 : live;
  const { width, height } = useVideoConfig();
  const t = frame / 90;
  const dx = noise2D("bgx", t, 0) * width * 0.05;
  const dy = noise2D("bgy", 0, t) * height * 0.05;
  const gx = focus[0] * width + dx;
  const gy = focus[1] * height + dy;
  const cell = Math.round(Math.min(width, height) / 18);
  const tint =
    tone === "rust"
      ? "200,85,61"
      : tone === "sage"
        ? "127,163,122"
        : "217,119,87";
  const r = Math.max(width, height);
  return (
    <AbsoluteFill style={{ background: color.bg, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${color.grid} 1px, transparent 1px), linear-gradient(90deg, ${color.grid} 1px, transparent 1px)`,
          backgroundSize: `${cell}px ${cell}px`,
          backgroundPosition: `${(-frame * 0.15) % cell}px ${(-frame * 0.1) % cell}px`,
          maskImage: `radial-gradient(ellipse 70% 65% at ${gx}px ${gy}px, black 0%, rgba(0,0,0,.35) 55%, transparent 100%)`,
          WebkitMaskImage: `radial-gradient(ellipse 70% 65% at ${gx}px ${gy}px, black 0%, rgba(0,0,0,.35) 55%, transparent 100%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle ${r * 0.42}px at ${gx}px ${gy}px, rgba(${tint},${0.2 * intensity}) 0%, rgba(${tint},${0.07 * intensity}) 45%, transparent 75%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle ${r * 0.3}px at ${width - gx * 0.6}px ${height * 0.95}px, rgba(106,155,204,${0.05 * intensity}) 0%, transparent 70%)`,
        }}
      />
      {/* vignette */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,.55) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};
