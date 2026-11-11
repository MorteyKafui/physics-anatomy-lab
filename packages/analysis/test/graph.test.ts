import { describe, expect, test } from "bun:test";
import fc from "fast-check";

import {
  acceptedScale,
  axisEnd,
  DIVISIONS,
  GRAPH_RULES,
  lineToXAxis,
  mmBetween,
  mmFromLine,
  ON_POINT_MM,
  referenceLine,
  runRules,
  scalesAround,
  suggestAxis,
  suggestTriangle,
  toMm,
  type GraphContext,
  type PlottedPoint,
  type Sheet,
} from "../src";

// The Table mockup's five readings: l in m against T² in s².
const data: PlottedPoint[] = [
  { row: "r1", x: 1.0, y: 4.02 },
  { row: "r2", x: 0.9, y: 3.629 },
  { row: "r3", x: 0.8, y: 3.222 },
  { row: "r4", x: 0.7, y: 2.806 },
  { row: "r5", x: 0.6, y: 2.418 },
];

const sheet: Sheet = {
  x: suggestAxis(
    "l",
    data.map((p) => p.x),
    DIVISIONS.x,
  ),
  y: suggestAxis(
    "T2",
    data.map((p) => p.y),
    DIVISIONS.y,
  ),
};

const ref = referenceLine(data)!;
const good: GraphContext = {
  sheet,
  symbols: { x: "l", y: "T²" },
  data,
  plotted: data,
  line: ref.line,
  triangle: suggestTriangle(sheet, ref.line, data),
};
const fired = (c: GraphContext) => runRules(GRAPH_RULES, c).map((f) => f.rule);

describe("the sheet's scales", () => {
  test("are 1, 2 or 5 times a power of ten for each 2 cm", () => {
    expect([0.1, 0.2, 0.5, 1, 20, 5000].every(acceptedScale)).toBe(true);
    expect([0.3, 0.25, 4, 0, -1].some(acceptedScale)).toBe(false);
    // Two powers of ten either side of the value, so a picker can offer a sensible choice.
    expect(scalesAround(0.03, 6)).toEqual([0.0001, 0.0002, 0.0005, 0.001, 0.002, 0.005]);
  });

  test("the suggested scale fits every value and uses at least half of each axis", () => {
    expect(sheet.x).toEqual({ column: "l", start: 0.6, per2cm: 0.05 });
    expect(sheet.y).toEqual({ column: "T2", start: 2.4, per2cm: 0.2 });
    fc.assert(
      fc.property(
        fc.array(fc.double({ min: 0.01, max: 1000, noNaN: true }), { minLength: 2, maxLength: 8 }),
        fc.constantFrom(DIVISIONS.x, DIVISIONS.y),
        (values, divisions) => {
          const axis = suggestAxis("c", values, divisions);
          const min = Math.min(...values);
          const max = Math.max(...values);
          return (
            acceptedScale(axis.per2cm) &&
            axis.start <= min + 1e-9 &&
            axisEnd(axis, divisions) >= max - 1e-9 &&
            (max === min || (max - min) / (divisions * axis.per2cm) >= 0.2)
          );
        },
      ),
    );
  });

  test("place values on the paper in millimetres", () => {
    expect(toMm(sheet.x, 0.6)).toBe(0);
    expect(toMm(sheet.x, 0.65)).toBeCloseTo(20, 9);
    expect(toMm(sheet.y, 4.0)).toBeCloseTo(160, 9);
  });
});

describe("the graph checks", () => {
  test("a careful graph draws no complaints", () => {
    expect(fired(good)).toEqual([]);
  });

  test("the suggested triangle is large and keeps clear of the points", () => {
    const { a, b } = good.triangle!;
    expect(Math.abs(b.x - a.x)).toBeGreaterThanOrEqual(0.5 * 0.4);
    for (const p of data) {
      expect(mmBetween(sheet, a, p)).toBeGreaterThanOrEqual(ON_POINT_MM);
      expect(mmBetween(sheet, b, p)).toBeGreaterThanOrEqual(ON_POINT_MM);
    }
    expect(mmFromLine(sheet, a, ref.line)).toBeLessThan(1e-6);
  });

  test("a scale that squeezes the points into a corner", () => {
    const wide = { ...sheet, y: { column: "T2", start: 0, per2cm: 1 } };
    expect(fired({ ...good, sheet: wide })).toContain("graph-scale-small");
  });

  test("values the graph must reach count towards the scale: a line read off an axis", () => {
    const wide = { ...sheet, y: { column: "T2", start: 0, per2cm: 1 } };
    // The same squeezed points, but the graph must also show 0 to 20 on the y axis.
    const ys = { ...good, sheet: wide, reach: { y: [0, 20] } };
    expect(fired(ys)).not.toContain("graph-scale-small");
  });

  test("a scale too small for the points puts some off the sheet", () => {
    const tight = { ...sheet, y: { column: "T2", start: 2.4, per2cm: 0.1 } };
    expect(fired({ ...good, sheet: tight })).toContain("graph-off-sheet");
  });

  test("a point plotted a square away, and one not plotted", () => {
    const plotted = [{ ...data[0]!, y: data[0]!.y + 0.05 }, ...data.slice(1, 4)];
    const f = runRules(GRAPH_RULES, { ...good, plotted });
    expect(f.find((x) => x.rule === "graph-misplotted")?.rows).toEqual(["r1"]);
    expect(f.find((x) => x.rule === "graph-points-missing")?.rows).toEqual(["r5"]);
  });

  test("a line that misses the mean point, leans too steeply, or leaves the points on one side", () => {
    const shifted = {
      from: { ...ref.line.from, y: ref.line.from.y + 0.15 },
      to: { ...ref.line.to, y: ref.line.to.y + 0.15 },
    };
    const f = fired({ ...good, line: shifted, triangle: undefined });
    expect(f).toContain("graph-line-mean");
    expect(f).toContain("graph-line-unbalanced");
    const steep = { from: ref.line.from, to: { ...ref.line.to, y: ref.line.to.y + 0.3 } };
    expect(fired({ ...good, line: steep, triangle: undefined })).toContain("graph-line-slope");
  });

  test("a small triangle, one on the plotted points, and one off the line", () => {
    const small = { a: ref.line.from, b: { x: 0.65, y: ref.fit.slope * 0.65 + ref.fit.intercept } };
    const f = fired({ ...good, triangle: small });
    expect(f).toContain("graph-triangle-small");
    expect(f).toContain("graph-triangle-on-point");
    const off = { a: good.triangle!.a, b: { ...good.triangle!.b, y: good.triangle!.b.y + 0.1 } };
    expect(fired({ ...good, triangle: off })).toContain("graph-triangle-off-line");
  });
});

test("a scale that uses exactly half an axis is enough, despite rounding in 0.85 − 0.80", () => {
  const half: GraphContext = {
    ...good,
    sheet: {
      x: { column: "l", start: 0.8, per2cm: 0.01 },
      y: { column: "T2", start: 3.2, per2cm: 0.02 },
    },
    data: [
      { row: "a", x: 0.8, y: 3.2 },
      { row: "b", x: 0.85, y: 3.4 },
    ],
    plotted: [],
    line: undefined,
    triangle: undefined,
  };
  expect(fired(half)).not.toContain("graph-scale-small");
});

test("a point half a small square from its place is within the tolerance (found in CI)", () => {
  // The sheet snaps to 1 mm, so a click one step off lands exactly 1 mm away: still right.
  const halfSquare: GraphContext = {
    ...good,
    sheet: {
      x: { column: "l", start: 0.8, per2cm: 0.01 },
      y: { column: "t1", start: 1.98, per2cm: 0.02 },
    },
    data: [
      { row: "a", x: 0.8, y: 1.99 },
      { row: "b", x: 0.85, y: 2.21 },
    ],
    plotted: [
      { row: "a", x: 0.8, y: 1.991 },
      { row: "b", x: 0.85, y: 2.21 },
    ],
    line: undefined,
    triangle: undefined,
  };
  expect(fired(halfSquare)).not.toContain("graph-misplotted");
  const twoSteps = {
    ...halfSquare,
    plotted: [{ row: "a", x: 0.8, y: 1.992 }, halfSquare.plotted[1]!],
  };
  expect(fired(twoSteps)).toContain("graph-misplotted");
});

describe("lineToXAxis", () => {
  // I = (3.0 - V) / 1.5: the Ohm's law line, meeting the V axis at E = 3.0 V.
  const line = { from: { x: 1.6, y: (3 - 1.6) / 1.5 }, to: { x: 2.4, y: (3 - 2.4) / 1.5 } };

  test("carries the end nearer the axis to y = 0, where the line meets it", () => {
    const out = lineToXAxis(line);
    expect(out.from).toEqual(line.from);
    expect(out.to.y).toBe(0);
    expect(out.to.x).toBeCloseTo(3, 12);
  });

  test("keeps the slope, whichever way the line was drawn", () => {
    fc.assert(
      fc.property(
        fc.double({ min: -10, max: 10, noNaN: true }),
        fc.double({ min: 0.1, max: 10, noNaN: true }),
        fc.double({ min: -5, max: 5, noNaN: true }),
        (slope, c, x) => {
          fc.pre(Math.abs(slope) > 1e-3);
          const a = { x, y: slope * x + c };
          const b = { x: x + 1, y: slope * (x + 1) + c };
          const out = lineToXAxis({ from: b, to: a });
          const s = (out.to.y - out.from.y) / (out.to.x - out.from.x);
          return (
            Math.abs(s - slope) <= 1e-9 * Math.max(1, Math.abs(slope)) &&
            Math.min(Math.abs(out.from.y), Math.abs(out.to.y)) === 0
          );
        },
      ),
    );
  });

  test("leaves a line parallel to the axis as it is", () => {
    const flat = { from: { x: 0, y: 1 }, to: { x: 2, y: 1 } };
    expect(lineToXAxis(flat)).toBe(flat);
  });
});
