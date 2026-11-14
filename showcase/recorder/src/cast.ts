/**
 * asciicast v2 reader/writer, with named "m" marker events.
 * https://docs.asciinema.org/manual/asciicast/v2/
 */
import fs from "node:fs";

export interface CastHeader {
  version: 2;
  width: number;
  height: number;
  timestamp?: number;
  title?: string;
  env?: Record<string, string>;
}

export type CastEvent = [
  time: number,
  kind: "o" | "i" | "m" | "r",
  data: string,
];

export interface Cast {
  header: CastHeader;
  events: CastEvent[];
}

export class CastWriter {
  readonly events: CastEvent[] = [];
  private readonly t0 = process.hrtime.bigint();
  constructor(readonly header: CastHeader) {}

  now(): number {
    return Number(process.hrtime.bigint() - this.t0) / 1e9;
  }
  output(data: string) {
    this.events.push([round(this.now()), "o", data]);
  }
  input(data: string) {
    this.events.push([round(this.now()), "i", data]);
  }
  marker(name: string) {
    this.events.push([round(this.now()), "m", name]);
  }
  toCast(): Cast {
    return { header: this.header, events: this.events };
  }
}

const round = (t: number) => Math.round(t * 1e6) / 1e6;

export function serializeCast(cast: Cast): string {
  return (
    [
      JSON.stringify(cast.header),
      ...cast.events.map((e) => JSON.stringify(e)),
    ].join("\n") + "\n"
  );
}

export function readCast(file: string): Cast {
  const lines = fs.readFileSync(file, "utf8").split("\n").filter(Boolean);
  const header = JSON.parse(lines[0]) as CastHeader;
  if (header.version !== 2)
    throw new Error(`${file}: only asciicast v2 is supported`);
  return {
    header,
    events: lines.slice(1).map((l) => JSON.parse(l) as CastEvent),
  };
}

export function writeCast(file: string, cast: Cast) {
  fs.writeFileSync(file, serializeCast(cast));
}

export function castMarkers(cast: Cast): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [t, k, d] of cast.events) if (k === "m") out[d] = t;
  return out;
}

export function castDuration(cast: Cast): number {
  return cast.events.length ? cast.events[cast.events.length - 1][0] : 0;
}

/** Apply regex scrubs to every output event (and markers are left alone). */
export function scrubCast(
  cast: Cast,
  rules: { find: RegExp; replace: string }[],
): Cast {
  return {
    header: {
      ...cast.header,
      env: { TERM: "xterm-256color", SHELL: "/bin/bash" },
    },
    events: cast.events.map(([t, k, d]) =>
      k === "o" || k === "i"
        ? [t, k, rules.reduce((acc, r) => acc.replace(r.find, r.replace), d)]
        : [t, k, d],
    ),
  };
}
