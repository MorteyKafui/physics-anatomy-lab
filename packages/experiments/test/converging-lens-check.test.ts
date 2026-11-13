import { describe, expect, test } from "bun:test";
import { quantise, substream, uniform } from "@pa/instruments";

import {
  convergingLens as C,
  LENS_DATA_TEMPLATE,
  lensCarefulSpread,
  lensCheck,
  lensExample,
  lensModelInvV,
  lensWorld,
  sharpScreenRange,
} from "../src";

/**
 * A careful student's readings with one attempt's lens, the screen set twice in the sharp range
 * at each u, every v read `dv` metres out (a holder read at an edge).
 */
function lab(seed: number, dv = 0) {
  const world = lensWorld(seed);
  const rng = substream(seed, "test");
  return C.objectDistances.map((u) => {
    const range = sharpScreenRange(world, u);
    const v = () => quantise((uniform(rng, range.from, range.to) + dv) * 100, 0.1);
    return { u: Math.round(u * 1000) / 10, v1: v(), v2: v() };
  });
}

const parts = (rows: ReturnType<typeof lab>, f?: number) =>
  lensCheck(rows, f === undefined ? {} : { f }).findings.map((x) => x.cause);

describe("the converging lens's data template", () => {
  test("has u set as the book has them and v twice, with an optional marked f", () => {
    expect(LENS_DATA_TEMPLATE.columns.map((c) => `${c.symbol} / ${c.unit} ${c.role}`)).toEqual([
      "u / cm setting",
      "v₁ / cm reading",
      "v₂ / cm reading",
    ]);
    expect(LENS_DATA_TEMPLATE.settings).toEqual([[20], [25], [30], [35], [40]]);
    expect(LENS_DATA_TEMPLATE.values[0]).toMatchObject({ id: "f", unit: "cm", optional: true });
  });
});

describe("the converging lens's model check", () => {
  test("the model's line is the exact lens: its slope is −1 to within the lens's aberration", () => {
    const slope = (lensModelInvV(40) - lensModelInvV(20)) / (1 / 40 - 1 / 20);
    expect(slope).toBeGreaterThan(-1.01);
    expect(slope).toBeLessThan(-0.99);
  });

  test("the example gives f near the lens's 15 cm, and nothing found", () => {
    const r = lensCheck(lensExample(), { f: 15 });
    expect(r.result!.f).toBeGreaterThan(14.5);
    expect(r.result!.f).toBeLessThan(15.5);
    expect(r.findings).toEqual([]);
  });

  test("works out v, 1/u and 1/v as the lab's table does", () => {
    const [u, v1, v2, v, invU, invV] = lensCheck([{ u: 20, v1: 60, v2: 59 }]).table[0]!;
    expect([u, v1, v2]).toEqual([20, 60, 59]);
    expect(v).toBe(59.5);
    expect(invU).toBe(1 / 20);
    expect(invV).toBe(1 / 59.5);
  });

  test("the screen read at its far edge, every v 1 cm long, is found as a flatter line", () => {
    expect(parts(lab(1, C.holderHalfWidth), 15)).toEqual([
      "experiments.converging-lens.check.tilt.shallower",
    ]);
    expect(parts(lab(1, -C.holderHalfWidth), 15)).toContain(
      "experiments.converging-lens.check.tilt.steeper",
    );
  });

  test("a 15 cm lens entered as marked 17 cm gives a shorter f, and as 13 cm a longer one", () => {
    expect(parts(lab(1), 17)).toEqual(["experiments.converging-lens.check.shift.shorter"]);
    expect(parts(lab(1), 13)).toContain("experiments.converging-lens.check.shift.longer");
  });

  test("over many careful runs, few are found out", () => {
    let found = 0;
    for (let seed = 1; seed <= 300; seed++) if (parts(lab(seed), 15).length) found++;
    expect(found / 300).toBeLessThan(0.1);
  });

  test("a careful spread in 1/v falls as v grows, and shrinks with two images", () => {
    expect(lensCarefulSpread(20, 60, 1)).toBeLessThan(lensCarefulSpread(40, 24, 1));
    expect(lensCarefulSpread(30, 30, 2)).toBeLessThan(lensCarefulSpread(30, 30, 1));
  });
});
