import { METRE_RULE } from "@pa/instruments";

import { readingErrorPercent, rightWay } from "./pendulum-review";
import { LENGTHS } from "./pendulum-table";
import { benchPeriod, simplePendulum } from "./simple-pendulum";

/**
 * The numbers on the simple pendulum's print sheets (master plan, "Print sheets": the poster,
 * the explained drawing and the explainer, from the same figure). Every one is worked out here
 * from packages/physics for the room's g, never typed in (AGENTS.md rule 1).
 */

/** The sheet's number in the Physics Anatomy series. */
export const PENDULUM_SHEET_NUMBER = "PA-001";

/** Five lengths across the lab's range, as a class would time them. */
export const SHEET_LENGTHS = [0.6, 0.7, 0.8, 0.9, 1.0].filter(
  (l) => l >= LENGTHS.min && l <= LENGTHS.max,
);

export interface PendulumSheet {
  /** The bench's length, m. */
  length: number;
  /** The period there, s, and the time for all the swings, to the stopwatch's least count. */
  period: number;
  timeForSwings: number;
  swings: number;
  amplitudeDeg: number;
  /** Least counts: the stopwatch, s, and the metre rule, cm. */
  stopwatch: number;
  rule: number;
  /** T² against l through the sheet's lengths: the points, the slope and g from it. */
  points: { x: number; y: number }[];
  slope: number;
  gFromSlope: number;
  /** How far g comes out high when every timing counts from one, %. */
  countFromOne: number;
  /** The room's g the bench swings in. */
  g: number;
}

export function pendulumSheet(g: number): PendulumSheet {
  const length = simplePendulum.length;
  const right = rightWay(g, SHEET_LENGTHS);
  const firstAt = rightWay(g, [length]);
  return {
    length,
    period: benchPeriod(g, length),
    timeForSwings: firstAt.t,
    swings: simplePendulum.swings,
    amplitudeDeg: simplePendulum.amplitudeDeg,
    stopwatch: simplePendulum.stopwatch.resolution,
    rule: METRE_RULE.resolution,
    points: SHEET_LENGTHS.map((l) => ({ x: l, y: benchPeriod(g, l) ** 2 })),
    slope: right.slope,
    gFromSlope: right.g,
    countFromOne: readingErrorPercent({ count: simplePendulum.swings, countedFromOne: true }, g)!,
    g,
  };
}
