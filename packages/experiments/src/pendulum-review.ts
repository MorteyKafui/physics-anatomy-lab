import { fitLine, type Finding, type Skill } from "@pa/analysis";
import { gFromPeriod, gFromSlope } from "@pa/physics";

import { benchPeriod, simplePendulum } from "./simple-pendulum";

/**
 * The review at the end of an attempt (master plan, "Review, retry and compare"): every mistake
 * with its effect on the result, and what the bench gives when every step is done the right way.
 * Every number comes from packages/physics (AGENTS.md rule 1).
 */

/** What a timing recorded: the Count presses, and whether the first was the starting pass. */
export interface TimedReading {
  count: number;
  countedFromOne: boolean;
}

/**
 * Whole swings a reading really timed. Counting from one spends the first press on the starting
 * pass, so 20 presses time 19 swings.
 */
export const swingsTimed = (r: TimedReading) => Math.max(0, r.count - (r.countedFromOne ? 1 : 0));

/**
 * How far a reading pushes g, in per cent: the student divides t by the swings they meant to
 * time (20), so a reading that timed fewer makes T short and g too high. 0 when it timed all 20;
 * undefined when it timed none.
 */
export function readingErrorPercent(
  r: TimedReading,
  g: number,
  length: number = simplePendulum.length,
): number | undefined {
  const timed = swingsTimed(r);
  if (timed <= 0) return undefined;
  const T = benchPeriod(g, length);
  const recorded = (T * timed) / simplePendulum.swings;
  return (gFromPeriod(length, recorded) / gFromPeriod(length, T) - 1) * 100;
}

/**
 * The step to redo a mistake from: the step where that skill's work is done (apparatus at Build,
 * timing at Measure, and so on).
 */
export const STEP_FOR_SKILL = {
  apparatus: "build",
  measurement: "measure",
  tabulation: "tabulate",
  graph: "plot",
  analysis: "analyse",
  writing: "report",
} as const satisfies Record<Skill, string>;

/**
 * What the effect of a mistake on g is, for the review: a size worked out from the physics, none
 * (put right before the result), or a description by kind where the size cannot be known.
 */
export type MistakeEffect =
  { kind: "none" } | { kind: "raised"; percent: number } | { kind: "unknown"; skill: Skill };

/** The effect on g of a finding still in the result. */
export function effectOf(
  finding: Pick<Finding, "rule" | "skill" | "params">,
  g: number,
): MistakeEffect {
  if (finding.rule === "pendulum-count-from-one")
    return {
      kind: "raised",
      percent: readingErrorPercent({ count: simplePendulum.swings, countedFromOne: true }, g)!,
    };
  if (finding.rule === "pendulum-stopped-early") {
    const count = Number(finding.params?.count);
    const percent = Number.isFinite(count)
      ? readingErrorPercent({ count, countedFromOne: false }, g)
      : undefined;
    if (percent !== undefined) return { kind: "raised", percent };
  }
  return { kind: "unknown", skill: finding.skill };
}

/** One run done the right way on this bench: what a careful student would read and work out. */
export interface RightWay {
  /** The first length timed, m. */
  length: number;
  /** t for all the swings at that length, s, to the stopwatch's least count. */
  t: number;
  /** T at that length, s. */
  T: number;
  /** Slope of T² against l through the lengths the run used, s² m⁻¹. */
  slope: number;
  /** g from that slope, m s⁻². */
  g: number;
}

/**
 * The right way at the lengths a run used. The periods are the exact ones for the bench's swing,
 * so g from the slope sits a little below the room's g: the finite-amplitude effect, which is
 * real and small at 8°.
 */
export function rightWay(g: number, lengths: readonly number[]): RightWay {
  const ls = [...new Set(lengths.length ? lengths : [simplePendulum.length])].sort((a, b) => a - b);
  const first = lengths[0] ?? simplePendulum.length;
  const T = benchPeriod(g, first);
  const r = simplePendulum.stopwatch.resolution;
  const t = Number((Math.round((T * simplePendulum.swings) / r) * r).toFixed(2));
  const points = ls.map((l) => ({ x: l, y: benchPeriod(g, l) ** 2 }));
  const slope = points.length >= 2 ? fitLine(points).slope : points[0]!.y / points[0]!.x;
  return { length: first, t, T, slope, g: gFromSlope(slope) };
}
