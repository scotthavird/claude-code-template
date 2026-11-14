import React from "react";
import { fonts } from "../brand/fonts";
import { color } from "../brand/tokens";

export const TITLEBAR = 50;

/** macOS-style window chrome. Children are the terminal content. */
export const Window: React.FC<{
  title: string;
  width: number;
  height: number;
  padX: number;
  padY: number;
  children: React.ReactNode;
  glow?: number;
  scale?: number;
}> = ({ title, width, height, padX, padY, children, glow = 1, scale = 1 }) => {
  const dot = (c: string) => (
    <div
      style={{
        width: 14 * scale,
        height: 14 * scale,
        borderRadius: 99,
        background: c,
        opacity: 0.9,
      }}
    />
  );
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 16 * scale,
        background: `linear-gradient(180deg, #232220 0%, ${color.bgRaised} 22%, #1B1A19 100%)`,
        border: `1px solid ${color.hairline}`,
        boxShadow: [
          `0 ${40 * scale}px ${120 * scale}px rgba(0,0,0,.55)`,
          `0 0 0 1px rgba(0,0,0,.4)`,
          `0 0 ${140 * scale}px rgba(217,119,87,${0.16 * glow})`,
          "inset 0 1px 0 rgba(255,255,255,.05)",
        ].join(", "),
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div
        style={{
          height: TITLEBAR * scale,
          display: "flex",
          alignItems: "center",
          padding: `0 ${20 * scale}px`,
          gap: 9 * scale,
          borderBottom: `1px solid rgba(245,244,238,.06)`,
          background: "rgba(255,255,255,.015)",
        }}
      >
        {dot("#E0715A")}
        {dot("#E8BE72")}
        {dot("#98BE92")}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            textAlign: "center",
            fontFamily: fonts.body,
            fontSize: 17 * scale,
            fontWeight: 500,
            color: color.inkFaint,
            letterSpacing: 0.2,
          }}
        >
          {title}
        </div>
      </div>
      <div style={{ padding: `${padY}px ${padX}px` }}>{children}</div>
    </div>
  );
};
