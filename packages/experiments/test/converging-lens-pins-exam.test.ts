import type { Finding } from "@pa/analysis";
import { describe, expect, test } from "bun:test";

import { markPinsScript, pinsFollowUps, pinsSheet, type PinsExamFacts } from "../src";

const perfect: PinsExamFacts = {
  tipsLevel: true,
  eyeOnAxis: true,
  distances: 4,
  parallaxLeft: 0,
  tabulated: true,
  table: [],
  formulaColumns: ["xy", "xPlusY"],
  plotted: true,
  rightGraph: true,
  line: true,
  triangle: true,
  graph: [],
  slope: true,
  f: true,
  analysis: [],
  precautions: 2,
};

const finding = (rule: string, extra: Partial<Finding> = {}): Finding => ({
  rule,
  severity: "error",
  skill: "tabulation",
  key: rule,
  ...extra,
});

describe("the two-pin rubric", () => {
  test("gives a perfect script 25 of 25, in the four WASSCE sections", () => {
    const m = markPinsScript(perfect);
    expect([m.got, m.of]).toEqual([25, 25]);
    expect(m.sections.map((s) => [s.id, s.of])).toEqual([
      ["diagram", 2],
      ["tabulation", 10],
      ["graph", 8],
      ["calculations", 5],
    ]);
  });

  test("takes marks for the catalogue's mistakes: tips off, eye off, parallax left", () => {
    const m = markPinsScript({ ...perfect, tipsLevel: false, eyeOnAxis: false, parallaxLeft: 1 });
    expect(m.sections[0]!.got).toBe(0);
    expect(m.sections[1]!.items.find((i) => i.id === "noParallax")).toMatchObject({
      got: 1,
      lost: { key: "parallaxLeft" },
    });
    expect(m.got).toBe(22);
  });

  test("gives no tabulation marks without a table, and none for xy and (x + y) not worked out", () => {
    expect(markPinsScript({ ...perfect, tabulated: false }).sections[1]!.got).toBe(0);
    expect(
      markPinsScript({ ...perfect, formulaColumns: [] }).sections[1]!.items.find(
        (i) => i.id === "products",
      ),
    ).toMatchObject({ got: 0, lost: { key: "noProducts" } });
    const wrong = markPinsScript({
      ...perfect,
      table: [finding("table-derived-arithmetic", { column: "xy", rows: ["r1"] })],
    });
    expect(wrong.sections[1]!.items.find((i) => i.id === "products")!.got).toBe(1);
  });

  test("takes the axes mark for y against x, and the triangle marks with no triangle", () => {
    const g = markPinsScript({ ...perfect, rightGraph: false, triangle: false }).sections[2]!;
    expect(g.items.find((i) => i.id === "axes")!.got).toBe(0);
    expect(g.items.find((i) => i.id === "triangle")).toMatchObject({
      got: 0,
      lost: { key: "noTriangle" },
    });
  });

  test("takes the slope's two marks for a slope the checks flag", () => {
    const m = markPinsScript({
      ...perfect,
      analysis: [finding("analysis-value", { column: "slope", skill: "analysis" })],
    });
    expect(m.sections[3]!.got).toBe(3);
  });
});

describe("part (b)", () => {
  test("f from the graph at a given xy is the line's slope (analytic: f = xy ⁄ (x + y))", () => {
    const [fromGraph] = pinsFollowUps();
    const { xy, sum, f } = fromGraph.params;
    expect(Number(f)).toBeCloseTo(xy / Number(sum), 1);
    // The line's own slope, to the 0.1 cm the reading is worked to.
    expect(Math.abs(Number(f) - pinsSheet().slope * 100)).toBeLessThan(0.1);
  });

  test("asks what focal length means, and about the simple microscope", () => {
    expect(pinsFollowUps().map((q) => q.id)).toEqual(["from-graph", "focal-length", "microscope"]);
  });
});
