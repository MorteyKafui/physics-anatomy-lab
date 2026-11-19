import { describe, expect, test } from "bun:test";
import { periodExact, PLACES } from "@pa/physics";

import fixtures from "../../../validation/fixtures/pendulum.json";
import {
  asSet,
  checkScenario,
  PENDULUM_LIMITS,
  predictPendulum,
  SMALL_ANGLE_DEG,
  simplePendulum,
} from "../src";

const deg = (rad: number) => (rad * 180) / Math.PI;

describe("pendulum what-if scenarios", () => {
  test("predict the exact period, as the SciPy model does, at every place and swing in range", () => {
    let checked = 0;
    for (const c of fixtures.cases) {
      const place = PLACES.find((p) => p.g === c.g);
      const amplitudeDeg = deg(c.amplitude);
      if (!place || amplitudeDeg < 1 || amplitudeDeg > PENDULUM_LIMITS.amplitudeDeg.max) continue;
      const got = predictPendulum({ length: c.length, place: place.id, amplitudeDeg, massG: 50 });
      expect(Math.abs(got.period / c.period - 1)).toBeLessThan(1e-12);
      checked += 1;
    }
    // Four places, five lengths, four amplitudes (2°, 5°, 10°, 30°, 60° less the 0° case).
    expect(checked).toBeGreaterThanOrEqual(4 * 5 * 4);
  });

  test("the mass of the bob changes nothing", () => {
    const light = predictPendulum({ ...asSet(), massG: 10 });
    const heavy = predictPendulum({ ...asSet(), massG: 200 });
    expect(heavy.period).toBe(light.period);
  });

  test("the Moon's weaker gravity lengthens the period by √(g_earth / g_moon)", () => {
    const earth = predictPendulum(asSet());
    const moon = predictPendulum({ ...asSet(), place: "moon" });
    expect(moon.period / earth.period).toBeCloseTo(Math.sqrt(9.80665 / 1.62), 12);
  });

  test("above 10° the small-angle formula no longer holds", () => {
    const at10 = predictPendulum({ ...asSet(), amplitudeDeg: SMALL_ANGLE_DEG });
    const at60 = predictPendulum({ ...asSet(), amplitudeDeg: 60 });
    expect(at10.smallAngle).toBe(true);
    expect(at10.beyondSmallAngle).toBeLessThan(0.002);
    expect(at60.smallAngle).toBe(false);
    // The textbook series: 1 + θ²/16 + 11θ⁴/3072 gives 7.3 % at 60°.
    expect(at60.beyondSmallAngle).toBeCloseTo(0.0732, 3);
  });

  test("the experiment as set is the bench: its length and swing, on the Earth", () => {
    const set = asSet(0.85);
    expect(set).toEqual({ length: 0.85, place: "earth", amplitudeDeg: 8, massG: 50 });
    expect(predictPendulum(set).period).toBe(
      periodExact({ length: 0.85, g: 9.80665, amplitude: (8 * Math.PI) / 180 }),
    );
    expect(simplePendulum.amplitudeDeg).toBeLessThanOrEqual(SMALL_ANGLE_DEG);
  });

  test("only supported changes, within their limits, are scenarios", () => {
    const ok = { length: 0.85, place: "moon", amplitudeDeg: 5, massG: 50 };
    expect(checkScenario(ok)).toEqual(ok as never);
    for (const bad of [
      { ...ok, length: 2.5 },
      { ...ok, length: 0.05 },
      { ...ok, amplitudeDeg: 80 },
      { ...ok, massG: 0 },
      { ...ok, place: "sun" },
      { ...ok, stretch: 0.1 },
      { ...ok, length: Number.NaN },
      "the string stretches",
      null,
    ]) {
      expect(checkScenario(bad)).toBeUndefined();
    }
  });
});
