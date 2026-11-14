/**
 * Timeline math shared by the compositions (React) and render.ts (Node):
 * scene lengths, transition overlaps, demo windows, callout windows and
 * captions. Pure functions of FilmData; no React, no Remotion runtime.
 */
import type { Callout } from "../../../schema/feature";
import type { FilmData } from "./film";

export type Variant = "hero" | "social" | "loop";
export type SceneId =
  "hook" | "problem" | "reveal" | "demo" | "enable" | "cta" | "open";
export type TransitionKind = "wipe" | "slide" | "fade" | "none";

/** Seconds. */
export const LEN = {
  hook: 2.7,
  problem: 4.6,
  reveal: 3.1,
  enable: 5.4,
  cta: 4.0,
  demoLead: 0.9,
  demoTail: 0.9,
  open: 3.4,
  socialEnable: 3.4,
  socialCta: 3.2,
  loopFade: 0.6,
};
export const TRANSITION_FRAMES = 14;
export const LOOP_RATE = 1.7;

export interface Slot {
  id: SceneId;
  from: number; // absolute frame
  frames: number;
  /** Transition INTO the next slot. */
  next: TransitionKind;
}

export interface DemoWindow {
  /** Demo-film seconds [start, end] shown in this cut. */
  start: number;
  end: number;
  /** Demo-film seconds per composition second. */
  rate: number;
  lead: number;
  tail: number;
  callouts: number[];
}

export interface Timeline {
  fps: number;
  slots: Slot[];
  total: number;
  demo: DemoWindow;
}

export const calloutStart = (film: FilmData, c: Callout) =>
  (film.markers[c.at] ?? 0) + (c.offset ?? 0);

export function demoWindow(film: FilmData, variant: Variant): DemoWindow {
  const all = film.spec.callouts.map((_, i) => i);
  if (variant === "social") {
    const idx = all.filter((i) => film.spec.callouts[i].social);
    const use = idx.length ? idx : all;
    const s = Math.min(
      ...use.map((i) => calloutStart(film, film.spec.callouts[i])),
    );
    const e = Math.max(
      ...use.map(
        (i) =>
          calloutStart(film, film.spec.callouts[i]) +
          film.spec.callouts[i].duration,
      ),
    );
    // Back up a little before the first social callout so the payoff is seen arriving.
    const start = Math.max(0, s - 2.4);
    return {
      start,
      end: Math.min(film.duration, e + 0.4),
      rate: 1,
      lead: 0.5,
      tail: 0.5,
      callouts: use,
    };
  }
  if (variant === "loop") {
    return {
      start: 0,
      end: film.duration,
      rate: LOOP_RATE,
      lead: 0,
      tail: LEN.loopFade,
      callouts: all,
    };
  }
  return {
    start: 0,
    end: film.duration,
    rate: 1,
    lead: LEN.demoLead,
    tail: LEN.demoTail,
    callouts: all,
  };
}

export const demoFrames = (w: DemoWindow, fps: number) =>
  Math.round(((w.end - w.start) / w.rate + w.lead + w.tail) * fps);

/** Composition-local demo frame -> demo-film seconds. */
export function demoTimeAt(w: DemoWindow, frame: number, fps: number): number {
  const t = w.start + (frame / fps - w.lead) * w.rate;
  return Math.max(w.start, Math.min(w.end, t));
}

export function buildTimeline(film: FilmData, variant: Variant): Timeline {
  const fps = film.fps;
  const f = (s: number) => Math.round(s * fps);
  const demo = demoWindow(film, variant);
  const plan: { id: SceneId; frames: number; next: TransitionKind }[] =
    variant === "hero"
      ? [
          { id: "hook", frames: f(LEN.hook), next: "wipe" },
          { id: "problem", frames: f(LEN.problem), next: "slide" },
          { id: "reveal", frames: f(LEN.reveal), next: "fade" },
          { id: "demo", frames: demoFrames(demo, fps), next: "wipe" },
          { id: "enable", frames: f(LEN.enable), next: "slide" },
          { id: "cta", frames: f(LEN.cta), next: "none" },
        ]
      : variant === "social"
        ? [
            { id: "open", frames: f(LEN.open), next: "fade" },
            { id: "demo", frames: demoFrames(demo, fps), next: "wipe" },
            { id: "enable", frames: f(LEN.socialEnable), next: "slide" },
            { id: "cta", frames: f(LEN.socialCta), next: "none" },
          ]
        : [{ id: "demo", frames: demoFrames(demo, fps), next: "none" }];
  const slots: Slot[] = [];
  let at = 0;
  plan.forEach((p, i) => {
    slots.push({ id: p.id, from: at, frames: p.frames, next: p.next });
    at +=
      p.frames -
      (i < plan.length - 1 && p.next !== "none" ? TRANSITION_FRAMES : 0);
  });
  const last = slots[slots.length - 1];
  return { fps, slots, total: last.from + last.frames, demo };
}

export interface Cue {
  start: number; // seconds, absolute
  end: number;
  text: string;
  /** Burned into the picture (demo + enable); other scenes already show the same words as the main visual. */
  burn: boolean;
  scene: SceneId;
}

/** Problem beats share the scene evenly after a short lead-in. */
export function problemBeat(
  film: FilmData,
  i: number,
  sceneFrames: number,
  fps: number,
) {
  const n = film.spec.problem.length;
  const lead = 0.35 * fps;
  const per = (sceneFrames - lead - 0.4 * fps) / n;
  return { from: Math.round(lead + i * per), frames: Math.round(per) };
}

export function buildCues(film: FilmData, tl: Timeline): Cue[] {
  const { fps } = tl;
  const cues: Cue[] = [];
  const sec = (fr: number) => fr / fps;
  for (const slot of tl.slots) {
    const s0 = sec(slot.from);
    const s1 = sec(slot.from + slot.frames);
    switch (slot.id) {
      case "hook":
        cues.push({
          start: s0,
          end: s1,
          text: film.spec.hook.join(" "),
          burn: false,
          scene: "hook",
        });
        break;
      case "open":
        cues.push({
          start: s0,
          end: s0 + (s1 - s0) * 0.45,
          text: film.spec.hook.join(" "),
          burn: false,
          scene: "open",
        });
        cues.push({
          start: s0 + (s1 - s0) * 0.45,
          end: s1,
          text: `${film.spec.name ?? film.spec.title}: ${film.spec.tagline}`,
          burn: false,
          scene: "open",
        });
        break;
      case "problem":
        film.spec.problem.forEach((line, i) => {
          const b = problemBeat(film, i, slot.frames, fps);
          cues.push({
            start: s0 + sec(b.from),
            end: s0 + sec(b.from + b.frames),
            text: line,
            burn: false,
            scene: "problem",
          });
        });
        break;
      case "reveal":
        cues.push({
          start: s0,
          end: s1,
          text: `${film.spec.name ?? film.spec.title}. ${film.spec.tagline}`,
          burn: false,
          scene: "reveal",
        });
        break;
      case "demo": {
        const w = tl.demo;
        for (const i of w.callouts) {
          const c = film.spec.callouts[i];
          const text = c.caption ?? c.text;
          if (!text) continue;
          const a = calloutStart(film, c);
          const b = a + c.duration;
          if (b < w.start || a > w.end) continue;
          const toAbs = (d: number) =>
            s0 +
            w.lead +
            (Math.max(w.start, Math.min(w.end, d)) - w.start) / w.rate;
          cues.push({
            start: toAbs(a),
            end: toAbs(b),
            text,
            burn: true,
            scene: "demo",
          });
        }
        break;
      }
      case "enable":
        cues.push({
          start: s0 + 0.3,
          end: s1 - 0.2,
          text:
            film.spec.enable.caption ??
            `Turn it on in ${film.spec.enable.file}`,
          burn: true,
          scene: "enable",
        });
        break;
      case "cta":
        cues.push({
          start: s0,
          end: s1,
          text: `${film.spec.cta.line} ${film.spec.cta.command}`,
          burn: false,
          scene: "cta",
        });
        break;
    }
  }
  return cues.sort((a, b) => a.start - b.start);
}

const ts = (s: number) => {
  const ms = Math.max(0, Math.round(s * 1000));
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const sec = Math.floor((ms % 60000) / 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}.${String(ms % 1000).padStart(3, "0")}`;
};

export function toVtt(cues: Cue[]): string {
  return (
    "WEBVTT\n\n" +
    cues
      .filter((c) => c.end > c.start)
      .map((c, i) => `${i + 1}\n${ts(c.start)} --> ${ts(c.end)}\n${c.text}\n`)
      .join("\n")
  );
}
