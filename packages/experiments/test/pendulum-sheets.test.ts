import { describe, expect, test } from "bun:test";
import { periodSmallAngle } from "@pa/physics";

import { benchPeriod, countFromOneErrorPercent, pendulumSheet, SHEET_LENGTHS } from "../src";

describe("the print sheets' numbers", () => {
  const sheet = pendulumSheet(9.81);

  test("are the bench's: the period at 0.800 m, near 2π√(l/g) at a small swing", () => {
    expect(sheet.length).toBe(0.8);
    expect(sheet.period).toBe(benchPeriod(9.81, 0.8));
    // 8° lengthens the period by about 0.12% over the small-angle value.
    expect(sheet.period / periodSmallAngle({ length: 0.8, g: 9.81 })).toBeCloseTo(1.0012, 4);
    expect(sheet.timeForSwings).toBeCloseTo(20 * sheet.period, 2);
  });

  test("put five lengths on a straight line whose slope gives g, a little under the room's", () => {
    expect(SHEET_LENGTHS).toEqual([0.6, 0.7, 0.8, 0.9, 1.0]);
    expect(sheet.points.map((p) => p.x)).toEqual(SHEET_LENGTHS);
    for (const p of sheet.points) expect(p.y / p.x).toBeCloseTo(sheet.slope, 9);
    expect(sheet.gFromSlope).toBeCloseTo((4 * Math.PI ** 2) / sheet.slope, 12);
    expect(sheet.gFromSlope).toBeLessThan(9.81);
  });

  test("give the effect of counting from one as the coach does", () => {
    expect(Math.round(sheet.countFromOne)).toBe(countFromOneErrorPercent(9.81));
  });
});
