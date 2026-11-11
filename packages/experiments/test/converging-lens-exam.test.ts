import type { Finding } from "@pa/analysis";
import { describe, expect, test } from "bun:test";

import { convergingLens, lensFollowUps, markLensScript, type LensExamFacts } from "../src";

const perfect: LensExamFacts = {
  coaxial: true,
  centreMarks: true,
  distances: 5,
  blurred: 0,
  tabulated: true,
  table: [],
  reciprocalColumns: ["invU", "invV"],
  plotted: true,
  rightGraph: true,
  line: true,
  intercepts: 2,
  graph: [],
  m1: true,
  m2: true,
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

describe("the lens rubric", () => {
  test("gives a perfect script 25 of 25, in the four WASSCE sections", () => {
    const m = markLensScript(perfect);
    expect([m.got, m.of]).toEqual([25, 25]);
    expect(m.sections.map((s) => [s.id, s.of])).toEqual([
      ["diagram", 2],
      ["tabulation", 10],
      ["graph", 8],
      ["calculations", 5],
    ]);
  });

  test("takes marks for the catalogue's mistakes: off the axis, from the edge, blurred images", () => {
    const m = markLensScript({ ...perfect, coaxial: false, centreMarks: false, blurred: 1 });
    expect(m.sections[0]!.got).toBe(0);
    const sharp = m.sections[1]!.items.find((i) => i.id === "sharp")!;
    expect([sharp.got, sharp.lost?.key]).toEqual([1, "blurred"]);
    expect(m.got).toBe(22);
  });

  test("gives no tabulation marks without a table, and none for reciprocals not worked out", () => {
    expect(markLensScript({ ...perfect, tabulated: false }).sections[1]!.got).toBe(0);
    const noInverse = markLensScript({ ...perfect, reciprocalColumns: [] });
    expect(noInverse.sections[1]!.items.find((i) => i.id === "reciprocals")).toMatchObject({
      got: 0,
      lost: { key: "noReciprocals" },
    });
    const wrong = markLensScript({
      ...perfect,
      table: [finding("table-derived-arithmetic", { column: "invV", rows: ["r1"] })],
    });
    expect(wrong.sections[1]!.items.find((i) => i.id === "reciprocals")!.got).toBe(1);
  });

  test("takes the axes mark for v against u, and the intercept marks for a line not reaching the axes", () => {
    const vu = markLensScript({ ...perfect, rightGraph: false });
    const graph = vu.sections[2]!;
    expect(graph.items.find((i) => i.id === "axes")!.got).toBe(0);
    expect(graph.items.find((i) => i.id === "intercepts")!.got).toBe(0);
    const short = markLensScript({ ...perfect, intercepts: 1 }).sections[2]!;
    expect(short.items.find((i) => i.id === "intercepts")).toMatchObject({
      got: 1,
      lost: { key: "intercepts", params: { n: 1 } },
    });
  });

  test("takes a calculation mark for an answer the checks flag, and for each precaution short", () => {
    const m = markLensScript({
      ...perfect,
      analysis: [finding("analysis-value", { column: "f", skill: "analysis" })],
      precautions: 1,
    });
    expect(m.sections[3]!.got).toBe(3);
  });
});

describe("part (b)", () => {
  const [one, mag, none] = lensFollowUps();
  const f = convergingLens.lens.focalLength * 100;

  test("f from one reading comes back as the lens's own, by the lens formula", () => {
    expect(Number(one.params.u)).toBe(30);
    expect(1 / Number(one.params.u) + 1 / Number(one.params.v)).toBeCloseTo(1 / f, 3);
    expect(Number(one.params.f)).toBeCloseTo(f, 1);
  });

  test("m = v ⁄ f − 1 equals v ⁄ u at u = 20.0 cm (analytic: v = 60.0 cm, m = 3)", () => {
    expect(mag.params).toMatchObject({ u: "20.0", v: "60.0", f: "15.0", m: "3.00" });
    expect(Number(mag.params.v) / Number(mag.params.u)).toBeCloseTo(Number(mag.params.m), 9);
  });

  test("asks why there is no image inside the focal length", () => {
    expect(none).toEqual({ id: "no-image", params: { f: "15.0" } });
  });
});
