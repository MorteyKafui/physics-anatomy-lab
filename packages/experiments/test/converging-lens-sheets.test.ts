import { describe, expect, test } from "bun:test";

import exact from "../../../validation/fixtures/lens-exact.json";
import { convergingLens, LENS_SHEET_NUMBER, lensSheet } from "../src";

describe("the lens print sheets", () => {
  const sheet = lensSheet();

  test("are numbered in the series after Ohm's law", () => {
    expect(LENS_SHEET_NUMBER).toBe("PA-003");
  });

  test("put each sharpest image where the independent NumPy model does", () => {
    expect(sheet.points.map((p) => p.u)).toEqual([...convergingLens.objectDistances]);
    for (const p of sheet.points) {
      const want = exact.images.find((i) => i.objectDistance === Number((p.u * 100).toFixed(1)));
      expect(want, `a fixture image at u = ${p.u} m`).toBeDefined();
      expect(Math.abs(p.v * 100 - want!.bestFocus)).toBeLessThan(0.05);
    }
  });

  test("give the thin-lens v from 1/u + 1/v = 1/f, and every sharpest image nearer the lens", () => {
    const f = convergingLens.lens.focalLength;
    for (const p of sheet.points) {
      expect(1 / p.u + 1 / p.thin).toBeCloseTo(1 / f, 9);
      expect(p.v).toBeLessThan(p.thin);
    }
    // Most at u = 20.0 cm, where v is largest: 2.8 cm nearer (brief, "What the exact model shows").
    expect((sheet.points[0]!.thin - sheet.points[0]!.v) * 100).toBeCloseTo(2.8, 1);
  });

  test("find f from the graph's two intercepts 1.1% short, 14.83 cm (brief)", () => {
    expect(sheet.f * 100).toBeCloseTo(14.83, 1);
    expect(sheet.m1).toBeCloseTo(sheet.m2, 0);
    expect(2 / (sheet.m1 + sheet.m2)).toBeCloseTo(sheet.f, 12);
  });

  test("give the sharp range at u = 20.0 cm, a little over a centimetre", () => {
    expect(sheet.sharpRange * 100).toBeGreaterThan(1);
    expect(sheet.sharpRange * 100).toBeLessThan(2);
  });
});
