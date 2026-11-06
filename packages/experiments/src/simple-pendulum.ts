import type { Finding, Rule } from "@pa/analysis";
import { STOPWATCH } from "@pa/instruments";
import { gFromPeriod, periodExact, recordedPeriod } from "@pa/physics";

/**
 * The simple pendulum: find g from the period of a pendulum of known length. The settings are the
 * approved lab mockup's (l = 0.800 m, swinging through about 8°), and every number shown to the
 * student comes from packages/physics (AGENTS.md rule 1).
 */
export const simplePendulum = {
  id: "simple-pendulum",
  topic: "mechanics",
  /** Pivot to the centre of the bob, m. */
  length: 0.8,
  /** Largest angle of swing, degrees. Kept below 10° (the first precaution). */
  amplitudeDeg: 8,
  /** Oscillations per timing (WASSCE practice). */
  swings: 20,
  stopwatch: STOPWATCH,
} as const;

/** The true period of the bench pendulum, s, at a length (m) in a room with field strength g. */
export function benchPeriod(g: number, length: number = simplePendulum.length): number {
  return periodExact({
    length,
    g,
    amplitude: (simplePendulum.amplitudeDeg * Math.PI) / 180,
  });
}

/**
 * The bob's angle from the vertical at time t, radians: θ₀ cos(2πt / T), started at the far
 * left of its swing. The period is the exact one; the cosine shape is the small-angle motion,
 * which differs from the exact motion by less than 0.1% at 8°.
 */
export function bobAngle(t: number, period: number): number {
  return ((simplePendulum.amplitudeDeg * Math.PI) / 180) * -Math.cos((2 * Math.PI * t) / period);
}

/**
 * Times the bob passes the mark (the vertical) moving left to right, the direction the student
 * counts in: one per period, starting a quarter period in.
 */
export function passTimes(from: number, count: number, period: number): number[] {
  const first = Math.ceil((from - period / 4) / period) * period + period / 4;
  return Array.from({ length: count }, (_, k) => first + k * period);
}

/** One timing the student made: what they pressed, in bench time (s). */
export interface Timing {
  startedAt: number;
  /** When they pressed Count. */
  counts: number[];
  stoppedAt?: number;
}

/** A Count press this soon after Start (as a fraction of the period) counted the starting pass. */
const SAME_PASS = 0.25;

/** Did the student count the pass they started on as "one"? */
export function countedFromOne(timing: Timing, period: number): boolean {
  const first = timing.counts[0];
  return first !== undefined && first - timing.startedAt < SAME_PASS * period;
}

/** The reading the student records: t on the stopwatch, rounded to its least count. */
export function recordedTime(timing: Timing): number | undefined {
  if (timing.stoppedAt === undefined) return undefined;
  const r = simplePendulum.stopwatch.resolution;
  return Number((Math.round((timing.stoppedAt - timing.startedAt) / r) * r).toFixed(2));
}

/** How far g comes out when the student counts from one, as a whole percentage. */
export function countFromOneErrorPercent(g: number): number {
  const T = benchPeriod(g);
  const wrong = gFromPeriod(simplePendulum.length, recordedPeriod(T, simplePendulum.swings, 1));
  return Math.round((wrong / gFromPeriod(simplePendulum.length, T) - 1) * 100);
}

export interface TimingContext {
  timing: Timing;
  /** The bench's true period, s. */
  period: number;
  /** The room's g, for working out the effect of a mistake. */
  g: number;
}

/** From the mistake catalogue (master plan, "Off-track"): counting starts at one. */
export const countFromOne: Rule<TimingContext> = {
  id: "pendulum-count-from-one",
  skill: "measurement",
  check: ({ timing, period, g }) =>
    countedFromOne(timing, period)
      ? [
          {
            rule: "pendulum-count-from-one",
            severity: "error",
            skill: "measurement",
            key: "findings.pendulum.countFromOne",
            params: { timed: simplePendulum.swings - 1, percent: countFromOneErrorPercent(g) },
          },
        ]
      : [],
};

/** Stopping before all the oscillations have been timed. */
export const stoppedEarly: Rule<TimingContext> = {
  id: "pendulum-stopped-early",
  skill: "measurement",
  check: ({ timing }): Finding[] => {
    if (timing.stoppedAt === undefined) return [];
    const counted = timing.counts.length;
    return counted < simplePendulum.swings
      ? [
          {
            rule: "pendulum-stopped-early",
            severity: "warning",
            skill: "measurement",
            key: "findings.pendulum.stoppedEarly",
            params: { count: counted, target: simplePendulum.swings },
          },
        ]
      : [];
  },
};

export const TIMING_RULES: Rule<TimingContext>[] = [countFromOne, stoppedEarly];
