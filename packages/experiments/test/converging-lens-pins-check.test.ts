import { describe, expect, test } from "bun:test";
import { quantise, substream, uniform } from "@pa/instruments";

import {
  lensPins as P,
  lensWorld,
  noParallaxStretch,
  PINS_DATA_TEMPLATE,
  pinsCarefulSpread,
  pinsCheck,
  pinsExample,
  pinsModelLine,
} from "../src";

/**
 * A student's readings with one attempt's lens: the search pin set twice in a stretch `wide` times
 * the one with no parallax, at each x; every x and y read `d` metres long (holders read at edges).
 */
function lab(seed: number, { d = 0, wide = 1 } = {}) {
  const world = lensWorld(seed);
  const rng = substream(seed, "test");
  return P.objectDistances.map((x) => {
    const s = noParallaxStretch(world, x);
    const mid = (s.from + s.to) / 2;
    const half = ((s.to - s.from) / 2) * wide;
    const y = () => quantise((uniform(rng, mid - half, mid + half) + d) * 100, 0.1);
    return { x: Math.round((x + d) * 1000) / 10, y1: y(), y2: y() };
  });
}

const rate = (how: Parameters<typeof lab>[1], f: number | undefined, part: string, runs = 120) => {
  let n = 0;
  for (let seed = 1; seed <= runs; seed++) {
    if (
      pinsCheck(lab(seed, how), f === undefined ? {} : { f }).findings.some((x) => x.part === part)
    )
      n++;
  }
  return n / runs;
};

describe("the two pins' data template", () => {
  test("has x set as the book has them and y twice, with an optional marked f", () => {
    expect(PINS_DATA_TEMPLATE.columns.map((c) => `${c.symbol} / ${c.unit} ${c.role}`)).toEqual([
      "x / cm setting",
      "y₁ / cm reading",
      "y₂ / cm reading",
    ]);
    expect(PINS_DATA_TEMPLATE.settings).toEqual([[20], [30], [40], [50]]);
  });
});

describe("the two pins' model check", () => {
  test("the model's line has slope f to within the lens's aberration, near the origin", () => {
    const line = pinsModelLine(15);
    expect(line.slope).toBeGreaterThan(14.5);
    expect(line.slope).toBeLessThan(15.1);
    expect(Math.abs(line.intercept)).toBeLessThan(30);
  });

  test("works out y, xy and (x + y) as the lab's table does", () => {
    const [x, y1, y2, y, xy, sum] = pinsCheck([{ x: 30, y1: 30, y2: 31 }]).table[0]!;
    expect([x, y1, y2, y]).toEqual([30, 30, 31, 30.5]);
    expect(xy).toBe(915);
    expect(sum).toBe(60.5);
  });

  test("the example gives f near 15 cm, with nothing found", () => {
    const r = pinsCheck(pinsExample(), { f: 15 });
    expect(r.result!.f).toBeGreaterThan(14);
    expect(r.result!.f).toBeLessThan(16);
    expect(r.findings).toEqual([]);
  });

  test("careful runs are rarely found out", () => {
    expect(rate({}, 15, "shift")).toBeLessThan(0.05);
    expect(rate({}, 15, "tilt")).toBeLessThan(0.05);
    expect(rate({}, 15, "spread")).toBeLessThan(0.1);
  }, 30_000);

  test("holders read 2 cm out move the line off the origin; 1 cm out shows in the slope", () => {
    expect(rate({ d: 0.02 }, undefined, "shift")).toBeGreaterThan(0.7);
    expect(rate({ d: 0.01 }, 15, "tilt")).toBeGreaterThan(0.6);
  }, 30_000);

  test("a 15 cm lens entered as marked 17 cm is found in the slope nearly every time", () => {
    expect(rate({}, 17, "tilt")).toBeGreaterThan(0.95);
  }, 30_000);

  test("no parallax found only roughly, over four times the stretch, is found as scatter", () => {
    expect(rate({ wide: 4 }, 15, "spread")).toBeGreaterThan(0.6);
  }, 30_000);

  test("a careful spread is least where x is near f", () => {
    expect(pinsCarefulSpread(20, 60, 2)).toBeLessThan(pinsCarefulSpread(50, 21, 2));
  });
});
