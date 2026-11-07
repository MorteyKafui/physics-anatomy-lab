import { describe, expect, test } from "bun:test";
import { periodSmallAngle } from "@pa/physics";

import {
  benchPeriod,
  countFromOneErrorPercent,
  effectOf,
  readingErrorPercent,
  rightWay,
  simplePendulum,
  swingsTimed,
} from "../src";

const g = 9.81;

describe("the effect of a timing on g", () => {
  test("counting from one times one swing fewer; stopping early times fewer still", () => {
    expect(swingsTimed({ count: 20, countedFromOne: false })).toBe(20);
    expect(swingsTimed({ count: 20, countedFromOne: true })).toBe(19);
    expect(swingsTimed({ count: 15, countedFromOne: false })).toBe(15);
    expect(swingsTimed({ count: 0, countedFromOne: true })).toBe(0);
  });

  test("is (20 / timed)² − 1, the analytic result, whatever the length", () => {
    for (const length of [0.5, 0.8, 1.2])
      for (const count of [10, 15, 19, 20])
        expect(readingErrorPercent({ count, countedFromOne: false }, g, length)!).toBeCloseTo(
          ((20 / count) ** 2 - 1) * 100,
          9,
        );
    expect(readingErrorPercent({ count: 0, countedFromOne: false }, g)).toBeUndefined();
  });

  test("counting from one agrees with the coach's figure (about 11%)", () => {
    const percent = readingErrorPercent({ count: 20, countedFromOne: true }, g)!;
    expect(Math.round(percent)).toBe(countFromOneErrorPercent(g));
    expect(Math.round(percent)).toBe(11);
  });

  test("a finding's effect: sized for timing mistakes, described for the rest", () => {
    expect(effectOf({ rule: "pendulum-count-from-one", skill: "measurement" }, g)).toEqual({
      kind: "raised",
      percent: readingErrorPercent({ count: 20, countedFromOne: true }, g)!,
    });
    const early = effectOf(
      { rule: "pendulum-stopped-early", skill: "measurement", params: { count: 16, target: 20 } },
      g,
    );
    expect(early.kind === "raised" && early.percent).toBeCloseTo(((20 / 16) ** 2 - 1) * 100, 9);
    expect(effectOf({ rule: "pendulum-thread-on-clamp", skill: "apparatus" }, g)).toEqual({
      kind: "unknown",
      skill: "apparatus",
    });
  });
});

describe("the right way on this bench", () => {
  test("reads t to the stopwatch's least count, and T is the bench's period", () => {
    const right = rightWay(g, [0.8, 0.85]);
    expect(right.length).toBe(0.8);
    expect(right.T).toBe(benchPeriod(g, 0.8));
    expect(right.t).toBeCloseTo(20 * benchPeriod(g, 0.8), 2);
    expect(Math.round(right.t / simplePendulum.stopwatch.resolution)).toBeCloseTo(
      right.t / simplePendulum.stopwatch.resolution,
      6,
    );
  });

  test("g from the slope sits just below the room's g: the finite-amplitude effect at 8°", () => {
    const right = rightWay(g, [0.6, 0.7, 0.8, 0.9, 1.0]);
    // T = T₀ · K, with K the same at every length, so slope = (4π²/g) · K² and g' = g / K².
    const K = benchPeriod(g, 0.8) / periodSmallAngle({ length: 0.8, g });
    expect(right.slope).toBeCloseTo(((4 * Math.PI ** 2) / g) * K ** 2, 9);
    expect(right.g).toBeCloseTo(g / K ** 2, 9);
    expect(right.g).toBeLessThan(g);
    expect(g - right.g).toBeLessThan(0.05);
  });

  test("with one length, the slope runs through the origin", () => {
    const right = rightWay(g, [0.8]);
    expect(right.slope).toBeCloseTo(benchPeriod(g, 0.8) ** 2 / 0.8, 12);
  });
});

describe("against the independent Python model (validation/fixtures/review.json)", () => {
  test("every timing error and every right-way run matches to 1 part in 10¹⁰", async () => {
    const fixtures = (await Bun.file(
      new URL("../../../validation/fixtures/review.json", import.meta.url),
    ).json()) as {
      amplitudeDeg: number;
      errors: { count: number; countedFromOne: boolean; percent: number }[];
      runs: { roomG: number; lengths: number[]; slope: number; g: number }[];
    };
    expect(fixtures.amplitudeDeg).toBe(simplePendulum.amplitudeDeg);
    for (const e of fixtures.errors) {
      const ours = readingErrorPercent(e, g)!;
      expect(Math.abs(ours - e.percent)).toBeLessThanOrEqual(1e-10 * Math.max(1, e.percent));
    }
    for (const run of fixtures.runs) {
      const ours = rightWay(run.roomG, run.lengths);
      expect(Math.abs(ours.slope / run.slope - 1)).toBeLessThan(1e-10);
      expect(Math.abs(ours.g / run.g - 1)).toBeLessThan(1e-10);
    }
  });
});
