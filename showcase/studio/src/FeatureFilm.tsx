import {
  TransitionSeries,
  linearTiming,
  springTiming,
  type TransitionPresentation,
} from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  type CalculateMetadataFunction,
} from "remotion";
import { color, motion } from "./brand/tokens";
import { Background } from "./components/Background";
import { Caption } from "./components/Overlays";
import type { FilmData } from "./lib/film";
import { shapeOf, unit } from "./lib/layout";
import {
  TRANSITION_FRAMES,
  buildCues,
  buildTimeline,
  type SceneId,
  type Timeline,
  type TransitionKind,
  type Variant,
} from "./lib/timeline";
import { Cta } from "./scenes/Cta";
import { Demo } from "./scenes/Demo";
import { EnableCard } from "./scenes/EnableCard";
import { Hook, StaggerLine } from "./scenes/Hook";
import { Problem } from "./scenes/Problem";
import { Reveal, RevealBlock } from "./scenes/Reveal";

export interface FilmProps {
  slug: string;
  variant: Variant;
  captions: boolean;
  film?: FilmData;
  [key: string]: unknown;
}

export async function loadFilm(slug: string): Promise<FilmData> {
  const { staticFile } = await import("remotion");
  const res = await fetch(staticFile(`features/${slug}/film.json`));
  if (!res.ok)
    throw new Error(
      `film.json for "${slug}" not found. Run: pnpm --dir showcase compile --slug ${slug}`,
    );
  return (await res.json()) as FilmData;
}

export const calculateFilmMetadata: CalculateMetadataFunction<
  FilmProps
> = async ({ props }) => {
  const film = props.film ?? (await loadFilm(props.slug));
  const tl = buildTimeline(film, props.variant);
  return {
    durationInFrames: tl.total,
    fps: film.fps,
    props: { ...props, film },
  };
};

/** Social opener: hook line, then the reveal, as one scene. */
const Open: React.FC<{ film: FilmData }> = ({ film }) => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames, fps } = useVideoConfig();
  const u = unit(width, height);
  const split = Math.round(durationInFrames * 0.42);
  const out = interpolate(frame, [split - 8, split], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const inn = spring({ frame: frame - split, fps, config: motion.enter });
  return (
    <AbsoluteFill>
      <Background
        focus={[0.5, 0.45]}
        intensity={1.1}
        tone={frame < split ? "rust" : "clay"}
      />
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          padding: 70 * u,
          opacity: out,
        }}
      >
        {film.spec.hook.map((l, i) => (
          <StaggerLine
            key={i}
            text={l}
            size={104 * u}
            startFrame={2 + i * 10}
            maxWidth={width - 140 * u}
          />
        ))}
      </AbsoluteFill>
      {frame >= split - 2 ? (
        <AbsoluteFill
          style={{
            alignItems: "center",
            justifyContent: "center",
            padding: 60 * u,
            opacity: inn,
          }}
        >
          <RevealBlock film={film} startFrame={split} compact />
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};

function presentation(
  kind: TransitionKind,
  width: number,
  height: number,
): TransitionPresentation<Record<string, unknown>> {
  if (kind === "wipe")
    return wipe({ direction: "from-left" }) as TransitionPresentation<
      Record<string, unknown>
    >;
  if (kind === "slide")
    return slide({
      direction: width > height ? "from-right" : "from-bottom",
    }) as TransitionPresentation<Record<string, unknown>>;
  return fade() as TransitionPresentation<Record<string, unknown>>;
}

export function sceneNode(
  id: SceneId,
  film: FilmData,
  tl: Timeline,
  captions: boolean,
) {
  switch (id) {
    case "hook":
      return <Hook film={film} />;
    case "problem":
      return <Problem film={film} />;
    case "reveal":
      return <Reveal film={film} />;
    case "open":
      return <Open film={film} />;
    case "demo":
      return (
        <Demo
          film={film}
          win={tl.demo}
          captions={captions}
          title={`${film.spec.recorder.repoName} — claude`}
          loop={tl.slots.length === 1}
        />
      );
    case "enable":
      return <EnableCard film={film} condensed={tl.slots[0].id === "open"} />;
    case "cta":
      return <Cta film={film} />;
  }
}

/** Burned-in captions for the cues that are not already the scene's main text. */
export const CaptionTrack: React.FC<{ film: FilmData; tl: Timeline }> = ({
  film,
  tl,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const u = unit(width, height);
  const shape = shapeOf(width, height);
  const t = frame / fps;
  const cues = buildCues(film, tl).filter((c) => c.burn);
  const cue = cues.find((c) => t >= c.start && t < c.end);
  if (!cue) return null;
  const p = Math.min(1, (t - cue.start) * 6, (cue.end - t) * 6);
  const fontSize = (shape === "landscape" ? 34 : 40) * u;
  const y =
    shape === "portrait"
      ? 250 * (height / 1920)
      : height -
        (shape === "square" ? 130 : 118) * (height / 1080) -
        fontSize * 0.6;
  return (
    <Caption text={cue.text} p={p} y={y} frameW={width} fontSize={fontSize} />
  );
};

export const FeatureFilm: React.FC<FilmProps> = ({
  film,
  variant,
  captions,
}) => {
  const { width, height } = useVideoConfig();
  if (!film) return <AbsoluteFill style={{ background: color.bg }} />;
  const tl = buildTimeline(film, variant);
  return (
    <AbsoluteFill style={{ background: color.bg }}>
      <TransitionSeries>
        {tl.slots.flatMap((slot, i) => {
          const nodes = [
            <TransitionSeries.Sequence
              key={slot.id}
              durationInFrames={slot.frames}
              name={slot.id}
            >
              {sceneNode(slot.id, film, tl, captions)}
            </TransitionSeries.Sequence>,
          ];
          if (i < tl.slots.length - 1 && slot.next !== "none") {
            nodes.push(
              <TransitionSeries.Transition
                key={`${slot.id}-t`}
                presentation={presentation(slot.next, width, height)}
                timing={
                  slot.next === "slide"
                    ? springTiming({
                        config: { damping: 200 },
                        durationInFrames: TRANSITION_FRAMES,
                      })
                    : linearTiming({ durationInFrames: TRANSITION_FRAMES })
                }
              />,
            );
          }
          return nodes;
        })}
      </TransitionSeries>
      {captions ? <CaptionTrack film={film} tl={tl} /> : null}
    </AbsoluteFill>
  );
};
