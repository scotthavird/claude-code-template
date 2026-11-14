import React from "react";
import {
  AbsoluteFill,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { fonts } from "../brand/fonts";
import { color, motion } from "../brand/tokens";
import { Background } from "../components/Background";
import { CommandPill, ConfigCard } from "../components/ConfigCard";
import { Eyebrow } from "../components/Overlays";
import type { FilmData } from "../lib/film";
import { shapeOf, unit } from "../lib/layout";

export const EnableCard: React.FC<{ film: FilmData; condensed?: boolean }> = ({
  film,
  condensed = false,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const u = unit(width, height);
  const shape = shapeOf(width, height);
  const e = film.spec.enable;
  const head = spring({ frame, fps, config: motion.enter });
  const install = spring({
    frame: frame - (condensed ? 26 : 44),
    fps,
    config: motion.enter,
  });
  const landscape = shape === "landscape";
  // Fit the code card to its longest line.
  const longest = Math.max(...e.code.split("\n").map((l) => l.length));
  const cardMax = landscape ? 980 * u : width - 100 * u;
  const codeFont = Math.min(27 * u, (cardMax - 48 * u) / (0.6 * longest + 2.6));
  const cardW = Math.min(cardMax, codeFont * (0.6 * longest + 2.6) + 56 * u);
  const leftW = landscape ? 730 * u : cardW;

  const left = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 26 * u,
        width: leftW,
        alignItems: landscape ? "flex-start" : "center",
        textAlign: landscape ? "left" : "center",
      }}
    >
      <Eyebrow scale={u} tone={color.clay} p={head}>
        How to enable
      </Eyebrow>
      <div
        style={{
          fontFamily: fonts.display,
          fontWeight: 800,
          fontSize: (landscape ? 76 : 68) * u,
          lineHeight: 1.02,
          letterSpacing: -2 * u,
          color: color.ink,
          opacity: head,
          transform: `translateY(${(1 - head) * 20}px)`,
        }}
      >
        One block of config.
      </div>
      <div
        style={{
          fontFamily: fonts.body,
          fontSize: 30 * u,
          lineHeight: 1.4,
          color: color.inkMuted,
          opacity: head,
        }}
      >
        Add it to{" "}
        <span
          style={{ fontFamily: fonts.mono, color: color.ink, fontSize: 27 * u }}
        >
          {e.file}
        </span>
        {e.install ? ", or install the plugin:" : "."}
      </div>
      {e.install ? (
        <div style={{ marginTop: 8 * u }}>
          <CommandPill
            command={e.install}
            // Shrink long install commands so the pill stays inside its column.
            fontSize={Math.min(
              (landscape ? 20 : 19) * u,
              (leftW - 56 * u) / (0.6 * (e.install.length + 5)),
            )}
            p={install}
          />
        </div>
      ) : null}
    </div>
  );

  return (
    <AbsoluteFill>
      <Background focus={landscape ? [0.68, 0.5] : [0.5, 0.62]} intensity={1} />
      <AbsoluteFill
        style={{
          flexDirection: landscape ? "row" : "column",
          alignItems: "center",
          justifyContent: "center",
          gap: (landscape ? 70 : 56) * u,
          padding: `${60 * u}px ${70 * u}px ${landscape ? 150 * u : 60 * u}px`,
        }}
      >
        {left}
        <ConfigCard
          file={e.file}
          lang={e.lang}
          code={e.code}
          highlight={e.highlight}
          frame={frame - 4}
          fps={fps}
          fontSize={codeFont}
          width={cardW}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
