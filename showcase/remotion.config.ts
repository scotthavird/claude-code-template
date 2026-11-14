import { Config } from "@remotion/cli/config";

// `pnpm studio` runs from showcase/; compiled film.json files live in studio/public.
Config.setPublicDir("studio/public");
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(92);
Config.setStudioPort(3100);
