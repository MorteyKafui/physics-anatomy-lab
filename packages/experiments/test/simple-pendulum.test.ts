import { describe, expect, test } from "bun:test";
import { runRules } from "@pa/analysis";
import { gFromPeriod, periodExact, recordedPeriod } from "@pa/physics";
import fc from "fast-check";

import {
  benchPeriod,
  bobAngle,
  countedFromOne,
  countFromOneErrorPercent,
  passTimes,
  recordedTime,
  simplePendulum,
  TIMING_RULES,
} from "../src";

const T = benchPeriod(9.81);

describe("the bench pendulum", () => {
  test("uses the exact period for 0.800 m swinging through 8°", () => {
    expect(T).toBe(periodExact({ length: 0.8, g: 9.81, amplitude: (8 * Math.PI) / 180 }));
    expect(T).toBeCloseTo(1.7965, 4);
  });

  test("swings between ±8° and starts at the far left", () => {
    expect(bobAngle(0, T)).toBeCloseTo((-8 * Math.PI) / 180, 12);
    expect(bobAngle(T / 2, T)).toBeCloseTo((8 * Math.PI) / 180, 12);
  });

  test("passes the mark moving right once a period", () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 100, noNaN: true }), (from) => {
        const [first, second] = passTimes(from, 2, T);
        return (
          first! >= from - 1e-9 &&
          first! - from < T + 1e-9 &&
          Math.abs(bobAngle(first!, T)) < 1e-9 &&
          bobAngle(first! + 0.01, T) > 0 &&
          Math.abs(second! - first! - T) < 1e-9
        );
      }),
    );
  });
});

describe("timing", () => {
  test("a Count pressed on the starting pass is counting from one", () => {
    expect(countedFromOne({ startedAt: 10, counts: [10.05] }, T)).toBe(true);
    expect(countedFromOne({ startedAt: 10, counts: [10 + T] }, T)).toBe(false);
    expect(countedFromOne({ startedAt: 10, counts: [] }, T)).toBe(false);
  });

  test("the reading is rounded to the stopwatch's 0.01 s (ADR 0035)", () => {
    expect(simplePendulum.stopwatch.resolution).toBe(0.01);
    expect(recordedTime({ startedAt: 1, counts: [], stoppedAt: 36.93456 })).toBe(35.93);
    expect(recordedTime({ startedAt: 1, counts: [] })).toBeUndefined();
  });

  test("the size of the count-from-one error comes from the physics", () => {
    const wrong = gFromPeriod(0.8, recordedPeriod(T, 20, 1));
    expect(countFromOneErrorPercent(9.81)).toBe(
      Math.round((wrong / gFromPeriod(0.8, T) - 1) * 100),
    );
    expect(countFromOneErrorPercent(9.81)).toBe(11);
  });

  test("rules: counting from one is an error; stopping early is a warning", () => {
    const findings = runRules(TIMING_RULES, {
      timing: { startedAt: 0, counts: [0.05, T, 2 * T], stoppedAt: 2 * T },
      period: T,
      g: 9.81,
    });
    expect(findings.map((f) => [f.rule, f.severity])).toEqual([
      ["pendulum-count-from-one", "error"],
      ["pendulum-stopped-early", "warning"],
    ]);
    expect(findings[0]!.params).toEqual({ timed: 19, percent: 11 });
  });

  test("a careful timing of 20 oscillations draws no finding", () => {
    const counts = passTimes(0.1, 21, T).slice(1);
    const findings = runRules(TIMING_RULES, {
      timing: { startedAt: passTimes(0, 1, T)[0]!, counts, stoppedAt: counts.at(-1)! },
      period: T,
      g: 9.81,
    });
    expect(findings).toEqual([]);
  });
});
