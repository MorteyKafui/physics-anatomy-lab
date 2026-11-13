import { describe, expect, test } from "bun:test";
import { recordedPeriod } from "@pa/physics";
import {
  ANTICIPATED_EVENT,
  createRng,
  DEFAULT_ENVIRONMENT,
  handTimedInterval,
  quantise,
  type ReactionTime,
} from "@pa/instruments";

import {
  benchPeriod,
  PENDULUM_DATA_TEMPLATE,
  pendulumCarefulSpread,
  pendulumCheck,
  pendulumModelT2,
  SHEET_LENGTHS,
  simplePendulum,
} from "../src";

const g = DEFAULT_ENVIRONMENT.g;
const N = simplePendulum.swings;
const LC = simplePendulum.stopwatch.resolution;

interface Lab {
  /** Each length read this much short, m: measured to the top of the bob, not its centre. */
  short?: number;
  /** The count started at one, so only N − 1 swings are timed. */
  countFromOne?: boolean;
  reaction?: ReactionTime;
}

/** A student's two timings at each of the template's lengths, on the stopwatch. */
function lab(seed: number, { short = 0, countFromOne = false, reaction = ANTICIPATED_EVENT }: Lab) {
  const rng = createRng(seed);
  return SHEET_LENGTHS.map((l) => {
    const T = recordedPeriod(benchPeriod(g, l + short), N, countFromOne ? 1 : 0);
    const time = () => quantise(handTimedInterval(rng, N * T, reaction), LC);
    return { l, t1: time(), t2: time() };
  });
}

const parts = (seed: number, how: Lab) =>
  pendulumCheck(lab(seed, how)).findings.map((f) => f.cause);

describe("the pendulum's data template", () => {
  test("has the length set and two timings, from the lab's standard table", () => {
    expect(PENDULUM_DATA_TEMPLATE.columns.map((c) => `${c.symbol} / ${c.unit} ${c.role}`)).toEqual([
      "l / m setting",
      "t₁ / s reading",
      "t₂ / s reading",
    ]);
    expect(PENDULUM_DATA_TEMPLATE.settings).toEqual(SHEET_LENGTHS.map((l) => [l]));
  });
});

describe("the pendulum's model check", () => {
  test("works out the table as the lab does: the mean, T and T²", () => {
    const r = pendulumCheck([{ l: 0.6, t1: 31.0, t2: 31.2 }]);
    const [l, t1, t2, t, T, T2] = r.table[0]!;
    expect([l, t1, t2]).toEqual([0.6, 31.0, 31.2]);
    expect(t).toBeCloseTo(31.1, 12);
    expect(T).toBeCloseTo(31.1 / N, 12);
    expect(T2).toBeCloseTo((31.1 / N) ** 2, 12);
    expect(r.check).toBeUndefined();
  });

  test("the model's line is the exact period at the lab's swing", () => {
    expect(pendulumModelT2(0.8)).toBe(benchPeriod(g, 0.8) ** 2);
    const small = (4 * Math.PI ** 2 * 0.8) / g;
    expect(pendulumModelT2(0.8) / small - 1).toBeGreaterThan(0);
    expect(pendulumModelT2(0.8) / small - 1).toBeLessThan(0.003);
  });

  test("a careful student's spread in T² is a little over 0.01 s² with two timings", () => {
    expect(pendulumCarefulSpread(1.8, 2)).toBeGreaterThan(0.008);
    expect(pendulumCarefulSpread(1.8, 2)).toBeLessThan(0.012);
    expect(pendulumCarefulSpread(1.8, 1)).toBeCloseTo(pendulumCarefulSpread(1.8, 2) * Math.SQRT2, 12);
  });

  test("lengths measured to the top of a 1 cm bob are found as points above the line, by 1 cm", () => {
    const r = pendulumCheck(lab(1, { short: 0.01 }));
    expect(r.findings.map((f) => f.part)).toEqual(["shift"]);
    expect(r.findings[0]!.cause).toBe("experiments.simple-pendulum.check.shift.above");
    expect(Number(r.findings[0]!.params!.cm)).toBeCloseTo(1.0, 0);
  });

  test("counting from one is found as a shallower slope", () => {
    const causes = parts(5, { countFromOne: true });
    expect(causes).toContain("experiments.simple-pendulum.check.tilt.shallower");
  });

  test("poor timing is found as scatter", () => {
    expect(parts(7, { reaction: { meanDelay: 0.3, delaySd: 0.25 } })).toContain(
      "experiments.simple-pendulum.check.spread",
    );
  });

  test("over many careful runs, few are found out; over many short ones, nearly all", () => {
    const runs = 400;
    let careful = 0;
    let short = 0;
    for (let seed = 1; seed <= runs; seed++) {
      if (parts(seed, {}).length) careful++;
      if (parts(seed, { short: 0.01 }).includes("experiments.simple-pendulum.check.shift.above"))
        short++;
    }
    // Shift and tilt each about 1 in 20 at most, scatter far less: under 1 in 8 found anything.
    expect(careful / runs).toBeLessThan(0.125);
    expect(short / runs).toBeGreaterThan(0.95);
  });
});
