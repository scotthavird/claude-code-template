import React from "react";
import { Composition, getInputProps } from "remotion";
import "./brand/fonts";
import {
  FeatureFilm,
  calculateFilmMetadata,
  type FilmProps,
} from "./FeatureFilm";

const input = getInputProps() as Partial<FilmProps>;
const slug = (input.slug as string) ?? "redact-tool-output";

const base = { slug, film: undefined } as const;

/**
 * Compositions (all driven by public/features/<slug>/film.json):
 *   Hero        1920×1080  hook → problem → reveal → demo → enable → CTA
 *   Social9x16  1080×1920  open → demo highlights → enable → CTA
 *   Social1x1   1080×1080  same as 9:16
 *   Loop        1920×1080  demo only, no captions, seamless loop (rendered as the README GIF)
 */
export const Root: React.FC = () => (
  <>
    <Composition
      id="Hero"
      component={FeatureFilm}
      width={1920}
      height={1080}
      fps={30}
      durationInFrames={1200}
      defaultProps={{ ...base, variant: "hero", captions: true } as FilmProps}
      calculateMetadata={calculateFilmMetadata}
    />
    <Composition
      id="Social9x16"
      component={FeatureFilm}
      width={1080}
      height={1920}
      fps={30}
      durationInFrames={600}
      defaultProps={{ ...base, variant: "social", captions: true } as FilmProps}
      calculateMetadata={calculateFilmMetadata}
    />
    <Composition
      id="Social1x1"
      component={FeatureFilm}
      width={1080}
      height={1080}
      fps={30}
      durationInFrames={600}
      defaultProps={{ ...base, variant: "social", captions: true } as FilmProps}
      calculateMetadata={calculateFilmMetadata}
    />
    <Composition
      id="Loop"
      component={FeatureFilm}
      width={1920}
      height={1080}
      fps={30}
      durationInFrames={300}
      defaultProps={{ ...base, variant: "loop", captions: false } as FilmProps}
      calculateMetadata={calculateFilmMetadata}
    />
  </>
);
