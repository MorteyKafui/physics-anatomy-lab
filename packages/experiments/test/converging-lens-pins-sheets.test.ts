import { describe, expect, test } from "bun:test";

import { convergingLens, lensPins, PINS_SHEET_NUMBER, pinsSheet } from "../src";

describe("the two-pin print sheets", () => {
  const sheet = pinsSheet();

  test("are numbered in the series after the screen method's", () => {
    expect(PINS_SHEET_NUMBER).toBe("PA-004");
  });

  test("put each no-parallax place near the thin-lens image, and none beyond it", () => {
    const f = convergingLens.lens.focalLength;
    expect(sheet.points.map((p) => p.x)).toEqual([...lensPins.objectDistances]);
    for (const p of sheet.points) {
      expect(1 / p.x + 1 / p.thin).toBeCloseTo(1 / f, 9);
      expect(p.y).toBeLessThan(p.thin * 1.01);
      expect(p.y).toBeGreaterThan(p.thin * 0.95);
    }
  });

  test("find f from the slope of xy against (x + y) within 2% of the lens's own", () => {
    expect(Math.abs(sheet.slope - convergingLens.lens.focalLength) / 0.15).toBeLessThan(0.02);
  });

  test("give the no-parallax stretch at x = 20.0 cm, 7 to 9 mm (decision 12)", () => {
    expect(sheet.stretch * 1000).toBeGreaterThan(7);
    expect(sheet.stretch * 1000).toBeLessThan(9);
  });
});
