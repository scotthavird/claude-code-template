/**
 * Feature Showcase spec: the single source of truth.
 *
 * One `features/<slug>/spec.yaml` (validated by this schema) plus one
 * `features/<slug>/fixture/` directory is all a new feature film needs.
 * JSON Schema for editor autocomplete is generated from this file with
 * `pnpm --dir showcase schema` -> schema/feature.schema.json.
 */
import { z } from "zod";

const regex = z
  .string()
  .min(1)
  .refine(
    (s) => {
      try {
        new RegExp(s, "m");
        return true;
      } catch {
        return false;
      }
    },
    { message: "not a valid JavaScript regular expression" },
  );

const markerName = z
  .string()
  .regex(/^[a-z][a-z0-9-]*$/, "marker names are kebab-case");

export const KEY_NAMES = [
  "enter",
  "tab",
  "shift+tab",
  "esc",
  "up",
  "down",
  "left",
  "right",
  "backspace",
  "space",
  "ctrl+c",
  "ctrl+d",
  "ctrl+l",
  "ctrl+r",
] as const;

export const stepSchema = z.union([
  z
    .object({
      type: z.string().min(1),
      cps: z.number().positive().max(80).optional(),
    })
    .strict(),
  z
    .object({
      key: z.enum(KEY_NAMES),
      repeat: z.number().int().positive().max(20).optional(),
    })
    .strict(),
  z
    .object({ wait: regex, timeout: z.number().positive().max(300).optional() })
    .strict(),
  z.object({ sleep: z.number().nonnegative().max(30) }).strict(),
  /** Block until the screen has not changed for `idle` seconds (e.g. the model finished). */
  z
    .object({
      idle: z.number().positive().max(30),
      timeout: z.number().positive().max(300).optional(),
    })
    .strict(),
  z.object({ marker: markerName }).strict(),
  z.object({ expect: regex, absent: z.boolean().optional() }).strict(),
]);
export type Step = z.infer<typeof stepSchema>;

export const calloutSchema = z
  .object({
    at: markerName,
    /** Seconds of *film* time the callout stays on screen. */
    duration: z.number().positive().max(10),
    /** Regex; the bounding box is resolved from the terminal screen at `at`. */
    match: regex,
    kind: z.enum(["highlight", "callout", "zoom", "keycap"]),
    text: z.string().max(80).optional(),
    keys: z.array(z.string()).max(4).optional(),
    zoom: z.number().min(1).max(4).optional(),
    /** Include in the 9:16 / 1:1 social cut. */
    social: z.boolean().optional(),
    /** Which occurrence to anchor to when the regex matches several times. */
    occurrence: z.enum(["first", "last"]).optional(),
    /** Seconds after the marker before the callout appears (stagger callouts that share a marker). */
    offset: z.number().min(0).max(10).optional(),
    /** Caption override (defaults to `text`); keycaps usually need one. */
    caption: z.string().max(90).optional(),
  })
  .strict();
export type Callout = z.infer<typeof calloutSchema>;

export const OUTPUTS = [
  "hero-16x9",
  "hero-webm",
  "social-9x16",
  "social-1x1",
  "gif",
  "poster",
  "captions",
] as const;

export const featureSchema = z
  .object({
    slug: z
      .string()
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "slug must be kebab-case"),
    title: z.string().min(4).max(90),
    version: z
      .string()
      .regex(
        /^\d+\.\d+\.\d+$/,
        'version is the Claude Code release, e.g. "2.1.122"',
      ),
    changelog: z
      .object({ url: z.string().url(), quote: z.string().min(4) })
      .strict(),
    category: z.enum([
      "hooks",
      "commands",
      "skills",
      "agents",
      "mcp",
      "settings",
      "ui",
      "sdk",
      "ci",
    ]),
    /** The Reveal line. */
    tagline: z.string().min(4).max(70),
    /** Feature name as shown in the Reveal scene (defaults to the title). */
    name: z.string().max(40).optional(),
    hook: z.array(z.string().max(60)).min(1).max(2),
    problem: z.array(z.string().max(60)).min(2).max(3),
    /** Lines for the Problem scene's small "before" terminal (the pain, shown literally). */
    before: z.array(z.string().max(70)).max(5).default([]),
    recorder: z
      .object({
        engine: z.enum(["pty", "vhs"]).default("pty"),
        mode: z.enum(["interactive", "headless"]).default("interactive"),
        model: z.string().default("haiku"),
        permissionMode: z
          .enum(["default", "acceptEdits", "plan", "bypassPermissions", "auto"])
          .default("default"),
        budgetUsd: z.number().positive().max(2).default(0.5),
        size: z
          .object({
            cols: z.number().int().min(60).max(160),
            rows: z.number().int().min(16).max(60),
          })
          .strict()
          .default({ cols: 100, rows: 30 }),
        env: z.record(z.string()).default({}),
        /** Merged into the sandbox repo's .claude/settings.json. */
        settings: z.record(z.unknown()).default({}),
        /** Files copied from the template repo into the sandbox (so the film uses the real, current file). */
        copy: z
          .array(z.object({ from: z.string(), to: z.string() }).strict())
          .default([]),
        /** Pass --plugin-dir <template repo>. Loads every template component, so prefer `copy` for hooks. */
        pluginDir: z.boolean().default(false),
        /** Directory name of the sandbox repo; the TUI shows `~/<repoName>`. */
        repoName: z
          .string()
          .regex(/^[a-z0-9._-]+$/)
          .default("demo-app"),
        /** Extra CLI flags appended verbatim. */
        args: z.array(z.string()).default([]),
        takes: z
          .object({
            max: z.number().int().min(1).max(6),
            targetSeconds: z.number().positive(),
          })
          .strict()
          .default({ max: 3, targetSeconds: 20 }),
      })
      .strict(),
    scenario: z.array(stepSchema).min(1),
    scrub: z
      .array(z.object({ find: regex, replace: z.string() }).strict())
      .default([]),
    edit: z
      .object({
        in: markerName,
        out: markerName,
        /** Gaps between output events longer than this (cast seconds) are shortened to it. */
        idleMax: z.number().positive().default(1.0),
        remap: z
          .array(
            z
              .object({
                from: markerName,
                to: markerName,
                speed: z.number().min(1).max(20),
              })
              .strict(),
          )
          .default([]),
        hold: z
          .array(
            z
              .object({ at: markerName, seconds: z.number().positive().max(12) })
              .strict(),
          )
          .default([]),
      })
      .strict(),
    callouts: z.array(calloutSchema).default([]),
    enable: z
      .object({
        file: z.string(),
        lang: z.enum(["json", "yaml", "bash", "markdown"]),
        code: z.string().min(1),
        highlight: z.array(z.number().int().positive()).default([]),
        install: z.string().optional(),
        /** Caption for the How-to-enable scene. */
        caption: z.string().max(90).optional(),
      })
      .strict(),
    cta: z
      .object({
        line: z.string().max(70),
        command: z.string(),
        url: z.string(),
      })
      .strict(),
    outputs: z.array(z.enum(OUTPUTS)).default([...OUTPUTS]),
    docs: z
      .object({
        summary: z.string().min(10),
        tryIt: z.array(z.string()).min(1),
        related: z.array(z.string()).default([]),
      })
      .strict(),
  })
  .strict()
  .superRefine((spec, ctx) => {
    const markers = new Set(
      spec.scenario.flatMap((s) => ("marker" in s ? [s.marker] : [])),
    );
    const need = (name: string, path: (string | number)[]) => {
      if (!markers.has(name)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path,
          message: `unknown marker "${name}" (not in scenario)`,
        });
      }
    };
    need(spec.edit.in, ["edit", "in"]);
    need(spec.edit.out, ["edit", "out"]);
    spec.edit.remap.forEach((r, i) => {
      need(r.from, ["edit", "remap", i, "from"]);
      need(r.to, ["edit", "remap", i, "to"]);
    });
    spec.edit.hold.forEach((h, i) => need(h.at, ["edit", "hold", i, "at"]));
    spec.callouts.forEach((c, i) => {
      need(c.at, ["callouts", i, "at"]);
      if (c.kind === "keycap" && !c.keys?.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["callouts", i, "keys"],
          message: "keycap callouts need keys",
        });
      }
      if ((c.kind === "callout" || c.kind === "zoom") && !c.text) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["callouts", i, "text"],
          message: `${c.kind} callouts need text`,
        });
      }
    });
    const seen = new Set<string>();
    spec.scenario.forEach((s, i) => {
      if ("marker" in s) {
        if (seen.has(s.marker)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["scenario", i],
            message: `duplicate marker "${s.marker}"`,
          });
        }
        seen.add(s.marker);
      }
    });
    if (
      spec.enable.highlight.some((n) => n > spec.enable.code.split("\n").length)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["enable", "highlight"],
        message: "highlight line beyond end of code",
      });
    }
  });

export type FeatureSpec = z.infer<typeof featureSchema>;
export type FeatureSpecInput = z.input<typeof featureSchema>;
