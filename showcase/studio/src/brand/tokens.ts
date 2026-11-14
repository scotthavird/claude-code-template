/**
 * Brand tokens. Accent colors come straight from the template's own theme
 * (.claude/themes/anthropic-clay.json) so every film matches the template.
 */
import { Easing } from "remotion";
import theme from "../../../../.claude/themes/anthropic-clay.json";

const t = theme.colors;

export const color = {
  bg: "#141413", // near-black canvas
  bgDeep: "#0E0E0D",
  bgRaised: "#1F1E1D", // terminal window
  bgRaised2: "#2A2927",
  ink: "#F5F4EE", // primary text
  inkMuted: "#A8A49A",
  inkFaint: t.secondary, // #73726c
  muted: t.muted, // #91908a
  clay: t.accent, // #d97757 primary accent: highlights, CTA
  clayDeep: t.accentMuted, // #c6613f
  clayGlow: "rgba(217,119,87,.35)",
  claySoft: "rgba(217,119,87,.10)",
  sage: "#7FA37A", // success / "after" (softened theme.success)
  rust: "#C8553D", // problem / "before" (softened theme.error)
  sky: "#6A9BCC", // info callouts (softened theme.info)
  success: t.success,
  error: t.error,
  info: t.info,
  grid: "rgba(245,244,238,.055)",
  hairline: "rgba(245,244,238,.10)",
} as const;

export const type = {
  scale: {
    hero: 112,
    h1: 76,
    h2: 46,
    body: 30,
    mono: 22,
    caption: 34,
    eyebrow: 22,
  },
};

export const motion = {
  enter: { damping: 200, mass: 0.6 }, // no overshoot
  pop: { damping: 12, stiffness: 180 }, // chips, key-caps
  camera: { damping: 30, stiffness: 90, mass: 1 }, // zooms: slow and weighty
  ease: Easing.bezier(0.22, 1, 0.36, 1), // easeOutQuint
  easeInOut: Easing.bezier(0.65, 0, 0.35, 1),
  stagger: 3, // frames between words / lines
};

/**
 * Terminal palette: maps the colors Claude Code's dark theme emits onto the
 * brand. Unlisted truecolor values pass through untouched.
 */
export const terminal = {
  fg: "#E8E6DC",
  bg: color.bgRaised,
  map: {
    "#ffffff": "#F5F4EE",
    "#000000": color.bgRaised,
    "#d77757": color.clay,
    "#999999": "#9A968C",
    "#888888": "#5E5C57",
    "#373737": "#2E2D2A",
    "#b1b9f9": "#C9CCF5",
    "#af87ff": "#B79CF0",
  } as Record<string, string>,
  ansi: [
    "#1F1E1D",
    "#C8553D",
    "#7FA37A",
    "#D9A75B",
    "#6A9BCC",
    "#B48EAD",
    "#6FB3B8",
    "#E8E6DC",
    "#5E5C57",
    "#E0715A",
    "#98BE92",
    "#E8BE72",
    "#8DB4DD",
    "#C9A6C3",
    "#8CCBCF",
    "#F5F4EE",
  ],
};

/** xterm 256-color palette index -> hex, with the 16 base colors themed. */
export function paletteColor(n: number): string {
  if (n < 16) return terminal.ansi[n];
  if (n < 232) {
    const i = n - 16;
    const steps = [0, 95, 135, 175, 215, 255];
    const r = steps[Math.floor(i / 36)];
    const g = steps[Math.floor(i / 6) % 6];
    const b = steps[i % 6];
    return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
  }
  const v = 8 + (n - 232) * 10;
  return "#" + v.toString(16).padStart(2, "0").repeat(3);
}
