import type { Finding } from "@pa/analysis";
import { finalTemperature } from "@pa/physics";
import { describe, expect, test } from "bun:test";

import {
  markMixturesScript,
  methodOfMixtures as M,
  MIXTURES_SHEET_NUMBER,
  mixturesFollowUps,
  mixturesSheet,
  type MixturesExamFacts,
} from "../src";

const perfect: MixturesExamFacts = {
  covered: true,
  stirred: true,
  volumes: 4,
  early: 0,
  tabulated: true,
  table: [],
  formulaColumns: ["invT"],
  plotted: true,
  rightGraph: true,
  line: true,
  triangle: true,
  graph: [],
  slope: true,
  intercept: true,
  W: true,
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

describe("the mixtures rubric", () => {
  test("gives a perfect script 25 of 25, in the four WASSCE sections", () => {
    const m = markMixturesScript(perfect);
    expect([m.got, m.of]).toEqual([25, 25]);
    expect(m.sections.map((s) => [s.id, s.of])).toEqual([
      ["diagram", 2],
      ["tabulation", 10],
      ["graph", 8],
      ["calculations", 5],
    ]);
  });

  test("takes marks for the catalogue's mistakes: no lid, not stirred, read before the highest", () => {
    const m = markMixturesScript({ ...perfect, covered: false, stirred: false, early: 1 });
    expect(m.sections[0]!.got).toBe(0);
    expect(m.sections[1]!.items.find((i) => i.id === "highest")).toMatchObject({
      got: 1,
      lost: { key: "early" },
    });
    expect(m.got).toBe(22);
  });

  test("gives no tabulation marks without a table, and none for 1/T not worked out", () => {
    expect(markMixturesScript({ ...perfect, tabulated: false }).sections[1]!.got).toBe(0);
    expect(
      markMixturesScript({ ...perfect, formulaColumns: [] }).sections[1]!.items.find(
        (i) => i.id === "inverse",
      ),
    ).toMatchObject({ got: 0, lost: { key: "noInverse" } });
    const wrong = finding("table-derived-arithmetic", { column: "invT", rows: ["r1", "r2"] });
    expect(
      markMixturesScript({ ...perfect, table: [wrong] }).sections[1]!.items.find(
        (i) => i.id === "inverse",
      ),
    ).toMatchObject({ got: 0, lost: { key: "rows", params: { n: 2 } } });
  });

  test("gives the axes mark only for V against 1/T, and nothing for a graph not drawn", () => {
    const other = markMixturesScript({ ...perfect, rightGraph: false });
    expect(other.sections[2]!.items[0]).toMatchObject({ got: 0, lost: { key: "axesMixtures" } });
    expect(markMixturesScript({ ...perfect, plotted: false }).sections[2]!.got).toBe(0);
  });

  test("marks each answer on its own: a wrong intercept costs that mark, not W's", () => {
    const m = markMixturesScript({
      ...perfect,
      analysis: [finding("analysis-answers", { column: "intercept" })],
    });
    const calc = m.sections[3]!.items;
    expect(calc.find((i) => i.id === "intercept")).toMatchObject({ got: 0 });
    expect(calc.find((i) => i.id === "W")).toMatchObject({ got: 1 });
    expect(markMixturesScript({ ...perfect, W: false }).sections[3]!.got).toBe(4);
  });
});

describe("the mixtures print sheets", () => {
  const s = mixturesSheet();

  test("are numbered in the series after the two-pin method's", () => {
    expect(MIXTURES_SHEET_NUMBER).toBe("PA-005");
  });

  test("give each highest rise a little below the rise with no heat lost", () => {
    expect(s.points.map((p) => p.volume)).toEqual([...M.volumes]);
    for (const p of s.points) {
      expect(p.ideal - p.rise).toBeGreaterThan(0.1);
      expect(p.ideal - p.rise).toBeLessThan(0.25);
    }
  });

  test("put the line through V against 1/T at −(50 + W) on the V axis, the slope at 50 (65 − θ₀)", () => {
    expect(s.waterEquivalent).toBeCloseTo((50 * 390) / 4200, 9);
    expect(Math.abs(s.intercept + 50 + s.waterEquivalent)).toBeLessThan(0.5);
    expect(Math.abs(s.slope / (50 * (65 - 28)) - 1)).toBeLessThan(0.02);
  });
});

describe("part (b)", () => {
  test("works one mixing with the calorimeter's own water equivalent, to 0.1 °C", () => {
    const [one] = mixturesFollowUps();
    expect(one.id).toBe("one-mixing");
    const W = Number(one.params.W);
    const by = finalTemperature([
      { mass: 0.05, specificHeatCapacity: 4200, temperature: 65 },
      { mass: (40 + W) / 1000, specificHeatCapacity: 4200, temperature: 28 },
    ]);
    expect(one.params.final).toBe(by.toFixed(1));
    expect(Number(one.params.final)).toBeGreaterThan(28);
    expect(Number(one.params.final)).toBeLessThan(65);
  });

  test("asks about the vacuum flask and the clinical thermometer", () => {
    expect(mixturesFollowUps().map((q) => q.id)).toEqual(["one-mixing", "flask", "clinical"]);
  });
});
