import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadInterTight } from "@remotion/google-fonts/InterTight";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

const display = loadInterTight("normal", {
  weights: ["500", "600", "700", "800"],
  subsets: ["latin"],
});
const body = loadInter("normal", {
  weights: ["400", "500", "600"],
  subsets: ["latin"],
});
const mono = loadMono("normal", {
  weights: ["400", "500", "700", "800"],
  subsets: ["latin"],
});

export const fonts = {
  display: display.fontFamily,
  body: body.fontFamily,
  mono: `${mono.fontFamily}, Menlo, monospace`,
};
