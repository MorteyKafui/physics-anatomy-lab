import { describe, expect, test } from "bun:test";

import { benchPeriod, simplePendulum } from "@pa/experiments";
import { gFromPeriod, periodExact } from "@pa/physics";

import { coachDemo } from "../src/app/_landing/coach-demo";
import { coachLine, reading } from "../src/app/_landing/time-it";

const deg = (d: number) => (d * Math.PI) / 180;

describe("Time it yourself (landing page brief, decision 4)", () => {
  test("the readings are the exact period and the g it gives, counting from zero", () => {
    const r = reading(deg(8), 0);
    const T = periodExact({ length: 0.8, g: 9.81, amplitude: deg(8) });
    expect(r.swingDeg).toBe(8);
    expect(r.period).toBe(T);
    expect(r.g).toBe(gFromPeriod(0.8, T));
  });

  test("counting from one times 19 swings over 20, and g comes out about 11% high", () => {
    const one = reading(deg(8), 1);
    expect(one.period).toBeCloseTo((reading(deg(8), 0).period * 19) / 20, 12);
    expect(coachLine(one, 1).text).toBe(
      "You started the count at one, so you timed 19 swings and divided by 20. Your g is about 11% too high. Start the count at zero.",
    );
  });

  test("a swing wider than 10° is pointed out; a careful one is praised with its real error", () => {
    expect(coachLine(reading(deg(20), 0), 0).good).toBe(false);
    const careful = coachLine(reading(deg(8), 0), 0);
    expect(careful.good).toBe(true);
    const off = (Math.abs(reading(deg(8), 0).g - 9.81) / 9.81) * 100;
    expect(careful.text).toContain(`within ${off.toFixed(1)}%`);
  });
});

describe("Caught the moment it happens", () => {
  test("its times come from the pendulum's period, and the lab's own rule finds the slip", () => {
    const demo = coachDemo();
    const t = (l: number) => (simplePendulum.swings * benchPeriod(9.81, l)).toFixed(2);
    expect(demo.rows.map((r) => r.l)).toEqual(["0.900", "0.800"]);
    expect(demo.rows[0]!.t).toBe(`${t(0.9)}0`);
    expect(demo.slip).toBe(t(0.8));
    expect(demo.fixed).toBe(`${t(0.8)}0`);
    expect(demo.title).toBe(`Row 2, mean t: ${t(0.8)} needs 3 decimal places`);
  });
});
