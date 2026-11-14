/**
 * Take scoring and best-take selection.
 */
import type { Cast } from "./cast.js";
import { castMarkers } from "./cast.js";

export interface TakeReport {
  take: number;
  ok: boolean;
  failures: string[];
  spendUsd: number;
  rawSeconds: number;
  usedSeconds: number;
  markers: Record<string, number>;
  score: number;
  errorWords: string[];
}

const ERROR_RE =
  /\b(error|rate.?limit|overloaded|API Error|invalid api key|please run \/login)\b/gi;

export function scoreTake(
  take: number,
  cast: Cast,
  plain: string,
  failures: string[],
  spendUsd: number,
  edit: { in: string; out: string },
  targetSeconds: number,
): TakeReport {
  const markers = castMarkers(cast);
  const rawSeconds = cast.events.length
    ? cast.events[cast.events.length - 1][0]
    : 0;
  const usedSeconds =
    (markers[edit.out] ?? rawSeconds) - (markers[edit.in] ?? 0);
  const errorWords = [
    ...new Set((plain.match(ERROR_RE) ?? []).map((w) => w.toLowerCase())),
  ];
  const ok = failures.length === 0;
  // Higher is better. Hard requirement first, then: no errors, length near target, cheaper.
  let score = ok ? 100 : 0;
  score -= errorWords.length * 15;
  score -= Math.min(40, Math.abs(usedSeconds - targetSeconds) * 1.5);
  score -= spendUsd * 10;
  return {
    take,
    ok,
    failures,
    spendUsd,
    rawSeconds,
    usedSeconds,
    markers,
    score: Math.round(score * 10) / 10,
    errorWords,
  };
}

export function pickBest(reports: TakeReport[]): TakeReport | null {
  const passing = reports.filter((r) => r.ok);
  if (!passing.length) return null;
  return passing.sort((a, b) => b.score - a.score)[0];
}
