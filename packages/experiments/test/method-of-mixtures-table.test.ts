import { fillDerived, fitLine, pointsFor, runRules, type TableDesign } from "@pa/analysis";
import { describe, expect, test } from "bun:test";

import {
  asMixturesReading,
  correctMixturesBench,
  methodOfMixtures as M,
  MIXTURES_ANALYSIS_RULES,
  MIXTURES_GRAPH_RULES,
  MIXTURES_PLOT,
  MIXTURES_STANDARD_TABLE,
  MIXTURES_TEMPLATES,
  mixturesExpected,
  mixturesPeak,
  mixturesReadingData,
  mixturesReadingsIntoTable,
  type MixturesReading,
} from "../src";

/** A careful reading at V cm³, read at the highest, both temperatures to 0.1 °C. */
function careful(volume: number): MixturesReading {
  const b = correctMixturesBench(volume);
  const peak = mixturesPeak(b);
  const data = mixturesReadingData(b, {
    volume,
    start: M.room,
    highest: Math.round(peak.temperature * 10) / 10,
    t: peak.at,
  })!;
  return asMixturesReading({ id: `r${volume}`, data })!;
}

function tabulate(columns: TableDesign["columns"], readings: MixturesReading[]): TableDesign {
  let n = 0;
  const cells = mixturesReadingsIntoTable({ columns, rows: [] }, readings, () => `row${++n}`);
  const rows = [...new Set(cells.map((c) => c.row))].map((id) => ({
    id,
    cells: Object.fromEntries(cells.filter((c) => c.row === id).map((c) => [c.column, c.value])),
  }));
  return fillDerived({ columns: [...columns], rows });
}

const units = { x: "°C⁻¹", y: "cm³" };
const readings = M.volumes.map(careful);
const W = ((M.calorimeter.mass * M.calorimeter.specificHeatCapacity) / 4200) * 1000;

/** The best straight line through the points, carried back to 1/T = 0, and a triangle on it. */
function drawn(table: TableDesign) {
  const points = pointsFor(table, MIXTURES_PLOT.x, MIXTURES_PLOT.y);
  const fit = fitLine(points);
  const xs = points.map((p) => p.x);
  const a = Math.min(...xs);
  const b = Math.max(...xs);
  const on = (x: number) => ({ x, y: fit.slope * x + fit.intercept });
  return {
    line: { from: on(0), to: on(b) },
    triangle: { a: on(a), b: on(b), c: { x: b, y: on(a).y } },
  };
}

describe("the mixtures table", () => {
  test("is V, T and 1/T as the question asks, in cm³, °C and °C⁻¹", () => {
    expect(MIXTURES_STANDARD_TABLE.map((c) => [c.symbol, c.unit])).toEqual([
      ["V", "cm³"],
      ["T", "°C"],
      ["1/T", "°C⁻¹"],
    ]);
    const table = tabulate([...MIXTURES_STANDARD_TABLE], [careful(40)]);
    expect(table.rows[0]!.cells).toMatchObject({ V: "40", T: "19.4" });
    expect(Number(table.rows[0]!.cells.invT)).toBeCloseTo(1 / 19.4, 4);
  });

  test("with the temperatures written down, T is θ₂ − θ₁, with no 273.15 between them", () => {
    const table = tabulate([...MIXTURES_TEMPLATES.temperatures], [careful(40), careful(70)]);
    expect(table.rows[0]!.cells).toMatchObject({ V: "40", theta1: "28.0", theta2: "47.4" });
    expect(Number(table.rows[0]!.cells.T)).toBeCloseTo(19.4, 6);
    expect(Number(table.rows[1]!.cells.T)).toBeCloseTo(14.7, 6);
  });

  test("takes the last reading at a volume measured twice", () => {
    const again = { ...careful(40), id: "again", highest: 47.0 };
    const table = tabulate([...MIXTURES_STANDARD_TABLE], [careful(40), again]);
    expect(table.rows).toHaveLength(1);
    expect(table.rows[0]!.cells.T).toBe("19.0");
  });
});

describe("the graph of V against 1/T", () => {
  test("is the one the question asks for; V against T is caught", () => {
    const symbols = { x: "1/T", y: "V" };
    expect(runRules(MIXTURES_GRAPH_RULES, { columns: MIXTURES_PLOT, symbols })).toEqual([]);
    const [f] = runRules(MIXTURES_GRAPH_RULES, {
      columns: { x: "T", y: "V" },
      symbols: { x: "T", y: "V" },
    });
    expect(f?.rule).toBe("mixtures-wrong-graph");
    expect(f?.params).toEqual({ x: "T", y: "V" });
  });

  test("done carefully, meets the V axis at −(50 + W) and has a slope of 50 (65 − θ₀)", () => {
    const table = tabulate([...MIXTURES_STANDARD_TABLE], readings);
    const { line, triangle } = drawn(table);
    const e = mixturesExpected(triangle, line, MIXTURES_PLOT, units, {});
    // In SI: cm³ is 10⁻⁶ m³.
    expect(e.intercept!.value / 1e-6).toBeGreaterThan(-(50 + W) - 1.5);
    expect(e.intercept!.value / 1e-6).toBeLessThan(-(50 + W) + 1.5);
    expect(Math.abs(e.slope!.value / 1e-6 / (50 * (M.hot.temperature - M.room)) - 1)).toBeLessThan(
      0.02,
    );
    expect(e.W!.value / 1e-6).toBeCloseTo(-e.intercept!.value / 1e-6 - 50, 9);
    expect(Math.abs(e.W!.value / 1e-6 - W)).toBeLessThan(1.5);
  });
});

describe("the analysis", () => {
  const table = tabulate([...MIXTURES_STANDARD_TABLE], readings);
  const { line, triangle } = drawn(table);
  const worked = mixturesExpected(triangle, line, MIXTURES_PLOT, units, {});
  const typed = (q: number, unit: string, figures = 3) => ({
    value: q.toPrecision(figures),
    unit,
  });

  test("right answers, to 3 significant figures with units, have nothing to correct", () => {
    const answers = {
      slope: typed(worked.slope!.value / 1e-6, "cm³ °C"),
      intercept: typed(worked.intercept!.value / 1e-6, "cm³"),
      W: typed(worked.W!.value / 1e-6, "cm³", 2),
    };
    const expected = mixturesExpected(triangle, line, MIXTURES_PLOT, units, answers);
    const findings = runRules(MIXTURES_ANALYSIS_RULES, { answers, expected }).filter(
      (f) => f.severity === "error",
    );
    expect(findings).toEqual([]);
  });

  test("W is worked from the intercept the student wrote, so a slip there is not marked twice", () => {
    const answers = { intercept: { value: "-60.0", unit: "cm³" } };
    const expected = mixturesExpected(triangle, line, MIXTURES_PLOT, units, answers);
    expect(expected.W!.value / 1e-6).toBeCloseTo(10, 9);
  });

  test("another graph gives a slope but no intercept or W", () => {
    const e = mixturesExpected(triangle, line, { x: "T", y: "V" }, { x: "°C", y: "cm³" }, {});
    expect(e.slope).toBeDefined();
    expect(e.intercept).toBeUndefined();
    expect(e.W).toBeUndefined();
  });
});
