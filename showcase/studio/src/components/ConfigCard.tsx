import React from "react";
import { interpolate, spring } from "remotion";
import { fonts } from "../brand/fonts";
import { color, motion } from "../brand/tokens";

type Tok = { t: string; c: string; w?: number };

/** Tiny tokenizer: enough for json / yaml / bash / markdown config snippets. */
export function tokenize(line: string, lang: string): Tok[] {
  const out: Tok[] = [];
  const push = (t: string, c: string, w?: number) => t && out.push({ t, c, w });
  if (lang === "bash" || (lang === "yaml" && /^\s*#/.test(line))) {
    if (/^\s*#/.test(line)) return [{ t: line, c: color.inkFaint }];
    const m = line.match(/^(\s*)(\$?\s*)(\S+)(.*)$/);
    if (m) {
      push(m[1], color.ink);
      push(m[2], color.inkFaint);
      push(m[3], color.clay, 700);
      push(m[4], color.ink);
      return out;
    }
  }
  const re =
    lang === "yaml"
      ? /("[^"]*"|'[^']*'|[\w.-]+(?=\s*:)|[{}[\],:]|-?\d+(\.\d+)?|true|false|null|\s+|[^\s"'{}[\],:]+)/g
      : /("(?:[^"\\]|\\.)*"|[{}[\],:]|-?\d+(\.\d+)?|true|false|null|\s+|[^\s"{}[\],:]+)/g;
  const parts = line.match(re) ?? [line];
  parts.forEach((p, i) => {
    const rest = parts.slice(i + 1).join("");
    if (/^\s+$/.test(p)) push(p, color.ink);
    else if (/^[{}[\],]$/.test(p)) push(p, color.inkFaint);
    else if (p === ":") push(p, color.inkFaint);
    else if (/^["']/.test(p) || /^[\w.-]+$/.test(p)) {
      const isKey = /^\s*:/.test(rest);
      push(p, isKey ? "#9CC0E6" : "#E8B48F", isKey ? 500 : 400);
    } else if (/^-?\d/.test(p) || /^(true|false|null)$/.test(p))
      push(p, "#B79CF0");
    else push(p, color.ink);
  });
  return out;
}

export const ConfigCard: React.FC<{
  file: string;
  lang: string;
  code: string;
  highlight: number[];
  frame: number;
  fps: number;
  fontSize?: number;
  width: number;
  typeOn?: boolean;
}> = ({
  file,
  lang,
  code,
  highlight,
  frame,
  fps,
  fontSize = 28,
  width,
  typeOn = true,
}) => {
  const lines = code.replace(/\n$/, "").split("\n");
  const lh = fontSize * 1.55;
  const enter = spring({ frame, fps, config: motion.enter });
  return (
    <div
      style={{
        width,
        borderRadius: 18,
        overflow: "hidden",
        background: "linear-gradient(180deg, #232220, #1B1A19)",
        border: `1px solid ${color.hairline}`,
        boxShadow:
          "0 40px 100px rgba(0,0,0,.5), 0 0 120px rgba(217,119,87,.12)",
        transform: `translateY(${(1 - enter) * 30}px)`,
        opacity: enter,
      }}
    >
      {/* file tab */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          height: 54,
          background: "rgba(0,0,0,.22)",
          paddingLeft: 18,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            height: 44,
            padding: "0 20px",
            borderRadius: "10px 10px 0 0",
            background: "#232220",
            borderTop: `2px solid ${color.clay}`,
            fontFamily: fonts.mono,
            fontSize: fontSize * 0.68,
            color: color.ink,
          }}
        >
          <svg width={16} height={18} viewBox="0 0 16 18">
            <path
              d="M2 1h8l4 4v12H2z"
              fill="none"
              stroke={color.clay}
              strokeWidth={1.6}
            />
          </svg>
          {file}
        </div>
      </div>
      <div
        style={{
          position: "relative",
          padding: `${fontSize * 0.8}px 0`,
          fontFamily: fonts.mono,
          fontSize,
          lineHeight: `${lh}px`,
          whiteSpace: "pre",
        }}
      >
        {lines.map((ln, i) => {
          const at = 6 + i * 3;
          const p = typeOn
            ? interpolate(frame, [at, at + 6], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: motion.ease,
              })
            : 1;
          const hl = highlight.includes(i + 1);
          const sweepStart =
            6 + lines.length * 3 + 6 + highlight.indexOf(i + 1) * 6;
          const sweep = hl
            ? interpolate(frame, [sweepStart, sweepStart + 14], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: motion.ease,
              })
            : 0;
          return (
            <div
              key={i}
              style={{
                position: "relative",
                display: "flex",
                height: lh,
                opacity: p,
                transform: `translateX(${(1 - p) * -12}px)`,
              }}
            >
              {hl ? (
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 2,
                    bottom: 2,
                    width: `${sweep * 100}%`,
                    background:
                      "linear-gradient(90deg, rgba(217,119,87,.20), rgba(217,119,87,.06))",
                    borderLeft: `4px solid ${color.clay}`,
                  }}
                />
              ) : null}
              <div
                style={{
                  width: fontSize * 2.6,
                  textAlign: "right",
                  paddingRight: fontSize * 0.9,
                  color: hl ? color.clay : "#4A4945",
                  position: "relative",
                }}
              >
                {i + 1}
              </div>
              <div style={{ position: "relative" }}>
                {tokenize(ln, lang).map((tk, k) => (
                  <span
                    key={k}
                    style={{ color: tk.c, fontWeight: tk.w ?? 400 }}
                  >
                    {tk.t}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/** `$ command` pill with a copy glyph. */
export const CommandPill: React.FC<{
  command: string;
  fontSize?: number;
  p?: number;
  glow?: number;
}> = ({ command, fontSize = 28, p = 1, glow = 0 }) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: fontSize * 0.6,
      padding: `${fontSize * 0.55}px ${fontSize * 0.9}px`,
      borderRadius: 14,
      background: "rgba(14,14,13,.85)",
      border: `1px solid rgba(217,119,87,${0.35 + 0.4 * glow})`,
      boxShadow: `0 20px 60px rgba(0,0,0,.45), 0 0 ${60 * glow}px rgba(217,119,87,${0.35 * glow})`,
      fontFamily: fonts.mono,
      fontSize,
      color: color.ink,
      opacity: p,
      transform: `translateY(${(1 - p) * 16}px)`,
      whiteSpace: "nowrap",
    }}
  >
    <span style={{ color: color.clay, fontWeight: 700 }}>$</span>
    <span>{command}</span>
    <svg
      width={fontSize * 0.8}
      height={fontSize * 0.8}
      viewBox="0 0 20 20"
      style={{ marginLeft: fontSize * 0.2, opacity: 0.6 }}
    >
      <rect
        x="6"
        y="6"
        width="11"
        height="11"
        rx="2.5"
        fill="none"
        stroke={color.inkMuted}
        strokeWidth="1.6"
      />
      <path
        d="M13 4V3.5A1.5 1.5 0 0 0 11.5 2h-8A1.5 1.5 0 0 0 2 3.5v8A1.5 1.5 0 0 0 3.5 13H4"
        fill="none"
        stroke={color.inkMuted}
        strokeWidth="1.6"
      />
    </svg>
  </div>
);
