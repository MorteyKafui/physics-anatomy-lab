import { describe, expect, test } from "bun:test";
import { substream, takeReading } from "@pa/instruments";

import {
  correctSolidBench,
  hotSolid as H,
  methodOfMixtures as M,
  MIXTURES_THERMOMETER,
  recordedTemperature,
  SOLID_DATA_TEMPLATE,
  solidCheck,
  solidExample,
  solidThermometer,
  type Metal,
  type SolidBench,
} from "../src";

const BOOK = {
  solid: H.solidMass,
  empty: M.calorimeter.mass * 1000,
  filled: M.calorimeter.mass * 1000 + H.water,
  boiling: H.boiling,
};

/** A student's minute readings on the lab's heat model, with a metal and a way of working. */
function lab(seed: number, metal: Metal, bend: Partial<SolidBench> = {}) {
  const bench = { ...correctSolidBench({ metal }), ...bend };
  const rng = substream(seed, "test");
  return [0, 1, 2, 3, 4, 5].map((m) => ({
    t: m,
    theta:
      m === 0
        ? M.room
        : recordedTemperature(
            takeReading(MIXTURES_THERMOMETER, solidThermometer(bench, m * 60), { rng }),
          ),
  }));
}

const found = (metal: Metal, bend: Partial<SolidBench>, withC: boolean, runs = 40) => {
  const n = { shift: 0, tilt: 0, spread: 0 };
  for (let seed = 1; seed <= runs; seed++)
    for (const f of solidCheck(lab(seed, metal, bend), withC ? { ...BOOK, c: metal.c } : BOOK)
      .findings)
      n[f.part]++;
  return { shift: n.shift / runs, tilt: n.tilt / runs, spread: n.spread / runs };
};

const copper = H.metals[0]!;
const aluminium = H.metals[3]!;
const shaken = (o: Partial<NonNullable<SolidBench["transfer"]>>) => ({
  transfer: { after: 0, shaken: true, gently: true, ...o },
});

describe("the hot solid's data template", () => {
  test("has t every minute from 0 and θ, and the book's masses filled in", () => {
    expect(SOLID_DATA_TEMPLATE.columns.map((c) => `${c.symbol} / ${c.unit} ${c.role}`)).toEqual([
      "t / min setting",
      "θ / °C reading",
    ]);
    expect(SOLID_DATA_TEMPLATE.settings).toEqual([[0], [1], [2], [3], [4], [5]]);
    expect(SOLID_DATA_TEMPLATE.values.map((v) => [v.id, v.value])).toEqual([
      ["solid", 100],
      ["empty", 50],
      ["filled", 100],
      ["boiling", 100],
      ["c", undefined],
    ]);
  });
});

describe("the hot solid's model check", () => {
  test("without the masses it says what it needs", () => {
    expect(solidCheck(solidExample(), {}).needs).toBe(
      "experiments.method-of-mixtures-solid.check.needs",
    );
  });

  test("the example agrees, and gives copper's c within a few per cent", () => {
    const r = solidCheck(solidExample(), { ...BOOK, c: copper.c });
    expect(r.findings).toEqual([]);
    expect(Math.abs(r.result!.c / copper.c - 1)).toBeLessThan(0.05);
  });

  test("careful runs are never found out, for every metal, with c or without", () => {
    for (const metal of H.metals) {
      expect(found(metal, {}, true)).toEqual({ shift: 0, tilt: 0, spread: 0 });
      expect(found(metal, {}, false)).toEqual({ shift: 0, tilt: 0, spread: 0 });
    }
  });

  test("boiling water carried in, or water splashed out, puts the readings above", () => {
    expect(found(copper, shaken({ shaken: false }), true).shift).toBe(1);
    expect(found(copper, shaken({ gently: false }), true).shift).toBe(1);
    expect(
      solidCheck(lab(1, copper, shaken({ shaken: false })), { ...BOOK, c: copper.c }).findings[0]!
        .cause,
    ).toBe("experiments.method-of-mixtures-solid.check.shift.above");
  });

  test("a slow move across puts aluminium's readings below", () => {
    expect(found(aluminium, shaken({ after: 10 }), true).shift).toBe(1);
  });

  test("the lid off makes the readings fall away; no stirring makes them late", () => {
    const off = solidCheck(lab(1, copper, { covered: false }), BOOK).findings.map((f) => f.cause);
    expect(off).toContain("experiments.method-of-mixtures-solid.check.tilt.falls");
    const still = solidCheck(lab(1, copper, { stirring: false }), BOOK).findings.map(
      (f) => f.cause,
    );
    expect(still).toContain("experiments.method-of-mixtures-solid.check.tilt.late");
    // A bent curve is its shape, not scatter.
    expect(found(copper, { covered: false }, false).spread).toBe(0);
  });

  test("works out the table as it is read, the start first", () => {
    const r = solidCheck(
      [
        { t: 1, theta: 38 },
        { t: 0, theta: 28 },
      ],
      BOOK,
    );
    expect(r.table).toEqual([
      [1, 38],
      [0, 28],
    ]);
    expect(r.check).toBeUndefined();
  });
});
