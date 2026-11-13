import { describe, expect, test } from "bun:test";
import { substream } from "@pa/instruments";
import { WATER_SPECIFIC_HEAT_CAPACITY } from "@pa/physics";

import {
  correctMixturesBench,
  methodOfMixtures as M,
  MIXTURES_DATA_TEMPLATE,
  mixturesCarefulShortfall,
  mixturesCheck,
  mixturesExample,
  mixturesModelRise,
  mixturesPeak,
  readThermometer,
  recordedTemperature,
  type MixturesBench,
} from "../src";

const BOOK = { hotVolume: M.hot.volume, hotTemperature: M.hot.temperature };
/** The copper calorimeter's water equivalent, cm³: its heat capacity over water's per cm³. */
const W =
  ((M.calorimeter.mass * M.calorimeter.specificHeatCapacity) / WATER_SPECIFIC_HEAT_CAPACITY) * 1000;

/** A student's run at each of the book's volumes on the lab's heat model, read at the highest. */
function lab(seed: number, bend: Partial<MixturesBench> = {}) {
  const rng = substream(seed, "test");
  return M.volumes.map((V) => {
    const bench = { ...correctMixturesBench(V), ...bend };
    return {
      V,
      theta1: recordedTemperature(readThermometer({ ...bench, pouredAfter: null }, 0, { rng })),
      theta2: recordedTemperature(readThermometer(bench, mixturesPeak(bench).at, { rng })),
    };
  });
}

const found = (bend: Partial<MixturesBench>, values: Record<string, number>, runs = 60) => {
  const n = { shift: 0, tilt: 0, spread: 0 };
  for (let seed = 1; seed <= runs; seed++)
    for (const f of mixturesCheck(lab(seed, bend), values).findings) n[f.part]++;
  return { shift: n.shift / runs, tilt: n.tilt / runs, spread: n.spread / runs };
};

describe("the method of mixtures' data template", () => {
  test("has V set as the book has them, θ₁ and θ₂, and the hot water filled in", () => {
    expect(MIXTURES_DATA_TEMPLATE.columns.map((c) => `${c.symbol} / ${c.unit} ${c.role}`)).toEqual([
      "V / cm³ setting",
      "θ₁ / °C reading",
      "θ₂ / °C reading",
    ]);
    expect(MIXTURES_DATA_TEMPLATE.settings).toEqual([[40], [50], [60], [70]]);
    expect(MIXTURES_DATA_TEMPLATE.values.map((v) => [v.id, v.value, v.optional ?? false])).toEqual([
      ["hotVolume", 50, false],
      ["hotTemperature", 65, false],
      ["W", undefined, true],
    ]);
  });
});

describe("the method of mixtures' model check", () => {
  test("the heat balance's rise is the book's: V₀ (θₕ − θ₁) ⁄ (V + V₀ + W)", () => {
    const rise = mixturesModelRise(50, 28, M.hot, W);
    expect(rise).toBeCloseTo((50 * (65 - 28)) / (50 + 50 + W), 9);
  });

  test("works out T and 1/T as the lab's table does", () => {
    const [V, a, b, T, inv] = mixturesCheck([{ V: 50, theta1: 28, theta2: 45.5 }], BOOK).table[0]!;
    expect([V, a, b]).toEqual([50, 28, 45.5]);
    expect(T).toBeCloseTo(17.5, 12);
    expect(inv).toBeCloseTo(1 / 17.5, 12);
  });

  test("without the hot water's values it says what it needs", () => {
    expect(mixturesCheck(mixturesExample(), {}).needs).toBe(
      "experiments.method-of-mixtures.check.needs",
    );
  });

  test("the example agrees, and gives the calorimeter's W within a few cm³", () => {
    const r = mixturesCheck(mixturesExample(), { ...BOOK, W });
    expect(r.findings).toEqual([]);
    expect(Math.abs(r.result!.W - W)).toBeLessThan(3);
  });

  test("what even a careful run loses is small: about 1 cm³ and 1% of the slope", () => {
    const s = mixturesCarefulShortfall();
    expect(s.shift).toBeLessThan(2);
    expect(s.slope).toBeLessThan(0.02);
  });

  test("careful runs are not found out, with W or without", () => {
    expect(found({}, BOOK)).toEqual({ shift: 0, tilt: 0, spread: 0 });
    expect(found({}, { ...BOOK, W })).toEqual({ shift: 0, tilt: 0, spread: 0 });
  });

  test("the lid off, no stirring and a slow pour each lower the slope, every time", () => {
    expect(found({ covered: false }, BOOK).tilt).toBe(1);
    expect(found({ stirring: false }, BOOK).tilt).toBe(1);
    expect(found({ pouredAfter: 60 }, BOOK).tilt).toBe(1);
    expect(mixturesCheck(lab(1, { covered: false }), BOOK).findings[0]!.cause).toBe(
      "experiments.method-of-mixtures.check.tilt.lower",
    );
  });

  test("a W far from the calorimeter's is found", () => {
    expect(found({}, { ...BOOK, W: 15 }).shift).toBe(1);
  });
});
