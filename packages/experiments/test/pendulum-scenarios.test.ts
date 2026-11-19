import { describe, expect, test } from "bun:test";
import { replay, type Attempt, type Json, type LabEvent } from "@pa/engine";
import { periodExact, PLACES } from "@pa/physics";

import fixtures from "../../../validation/fixtures/pendulum.json";
import {
  asSet,
  benchPeriod,
  checkScenario,
  lengthProjection,
  PENDULUM_LIMITS,
  predictPendulum,
  scenarioEvent,
  scenarioProjection,
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

const ATTEMPT: Attempt = {
  id: "w",
  experimentId: "simple-pendulum",
  mode: "what-if",
  seed: 1,
  createdAt: 0,
  updatedAt: 0,
  formatVersion: 1,
};

describe("a what-if attempt on the bench", () => {
  const at = (kind: string, data: Json, seq: number): LabEvent => ({
    kind,
    data,
    id: `e${String(seq)}`,
    attemptId: "w",
    seq,
    device: "d",
    at: seq,
  });
  const moon = { length: 0.85, place: "moon" as const, amplitudeDeg: 30, massG: 50 };

  test("the attempt keeps its scenario, the first one only", () => {
    const events = [
      at(scenarioEvent(moon).kind, scenarioEvent(moon).data, 1),
      at("scenario.set", { ...moon, place: "jupiter" }, 2),
    ];
    expect(replay(scenarioProjection, ATTEMPT, events)).toEqual(moon);
    expect(
      replay(scenarioProjection, ATTEMPT, [at("scenario.set", { length: 9 }, 3)]),
    ).toBeUndefined();
  });

  test("the bench starts at the scenario's length, then steps from it", () => {
    const events = [at("scenario.set", moon, 1)];
    expect(replay(lengthProjection, ATTEMPT, events)).toBe(0.85);
  });

  test("the bench's period follows the scenario's swing", () => {
    expect(benchPeriod(1.62, 0.85, 30)).toBe(
      periodExact({ length: 0.85, g: 1.62, amplitude: Math.PI / 6 }),
    );
    expect(benchPeriod(1.62, 0.85)).toBe(benchPeriod(1.62, 0.85, simplePendulum.amplitudeDeg));
  });
});
