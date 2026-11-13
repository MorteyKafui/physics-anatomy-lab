import { fillDerived, pointsFor, runRules, type TableDesign } from "@pa/analysis";
import { describe, expect, test } from "bun:test";

import {
  asSolidReading,
  correctSolidBench,
  hotSolid as H,
  metalOf,
  SOLID_ANALYSIS_RULES,
  SOLID_GRAPH_RULES,
  SOLID_PLOT,
  SOLID_STANDARD_TABLE,
  solidExpected,
  solidReadingData,
  solidReadingsIntoTable,
  solidThermometer,
  type Metal,
  type SolidReading,
} from "../src";

/** A careful run read every minute for three minutes, each to 0.1 °C, the highest as T. */
function minuteRun(metal: Metal = H.metals[0]): SolidReading {
  const b = correctSolidBench({ metal });
  const round = (c: number) => Math.round(c * 10) / 10;
  const series = [0, 60, 120, 180].map((t) => ({
    t,
    reading: t === 0 ? 28 : round(solidThermometer(b, t)),
  }));
  const best = series.reduce((a, p) => (p.reading > a.reading ? p : a));
  const data = solidReadingData(
    { ...b, weighed: { solid: 100, empty: 50, filled: 100 } },
    { start: 28, highest: best.reading, t: best.t, last: 180, series },
  )!;
  return asSolidReading({ id: "r1", data })!;
}

function tabulate(run: SolidReading): TableDesign {
  let n = 0;
  const columns = [...SOLID_STANDARD_TABLE];
  const cells = solidReadingsIntoTable({ columns, rows: [] }, run, () => `row${++n}`);
  const rows = [...new Set(cells.map((c) => c.row))].map((id) => ({
    id,
    cells: Object.fromEntries(cells.filter((c) => c.row === id).map((c) => [c.column, c.value])),
  }));
  return fillDerived({ columns, rows });
}

describe("the hot-solid table", () => {
  test("is t in minutes and θ in °C, one row a minute from the start", () => {
    expect(SOLID_STANDARD_TABLE.map((c) => [c.symbol, c.unit])).toEqual([
      ["t", "min"],
      ["θ", "°C"],
    ]);
    const run = minuteRun();
    const table = tabulate(run);
    expect(table.rows.map((r) => r.cells.t)).toEqual(["0.0", "1.0", "2.0", "3.0"]);
    expect(table.rows.map((r) => Number(r.cells.theta))).toEqual(run.series.map((p) => p.reading));
    expect(table.rows[0]!.cells.theta).toBe("28.0");
  });
});

describe("the graph of θ against t", () => {
  test("is the one the question asks for; anything else is caught", () => {
    const symbols = { x: "t", y: "θ" };
    expect(runRules(SOLID_GRAPH_RULES, { columns: SOLID_PLOT, symbols })).toEqual([]);
    const [f] = runRules(SOLID_GRAPH_RULES, {
      columns: { x: "theta", y: "t" },
      symbols: { x: "θ", y: "t" },
    });
    expect(f?.rule).toBe("solid-wrong-graph");
  });
});

describe("the analysis", () => {
  test("T is the highest point plotted, and c follows from the book's equation", () => {
    const run = minuteRun();
    const points = pointsFor(tabulate(run), SOLID_PLOT.x, SOLID_PLOT.y);
    const e = solidExpected(points, SOLID_PLOT, run, {});
    const T = Math.max(...run.series.map((p) => p.reading));
    expect(e.T!.value).toBeCloseTo(T, 9);
    // (m_c c_c + m_w c_w)(T − T₀) ⁄ (m_s (100 − T)), with 50 g of copper, 50 g of water, 100 g.
    expect(e.c!.value).toBeCloseTo(((0.05 * 390 + 0.05 * 4200) * (T - 28)) / (0.1 * (100 - T)), 6);
    expect(metalOf(run.c)?.id).toBe("copper");
  });

  test("each metal read every minute comes out within 4% of its own c", () => {
    for (const metal of H.metals) {
      const run = minuteRun(metal);
      const points = pointsFor(tabulate(run), SOLID_PLOT.x, SOLID_PLOT.y);
      const c = solidExpected(points, SOLID_PLOT, run, {}).c!.value;
      expect(Math.abs(c / metal.c - 1)).toBeLessThan(0.04);
    }
  });

  test("c is worked from the T the student wrote, so a slip in T is not marked twice", () => {
    const run = minuteRun();
    const points = pointsFor(tabulate(run), SOLID_PLOT.x, SOLID_PLOT.y);
    const answers = { T: { value: "39.0", unit: "°C" } };
    const e = solidExpected(points, SOLID_PLOT, run, answers);
    expect(e.c!.value).toBeCloseTo(((0.05 * 390 + 0.05 * 4200) * 11) / (0.1 * 61), 6);
    const findings = runRules(SOLID_ANALYSIS_RULES, {
      answers: { ...answers, c: { value: e.c!.value.toPrecision(3), unit: "J kg⁻¹ K⁻¹" } },
      expected: e,
    }).filter((f) => f.severity === "error");
    expect(findings.map((f) => f.column)).toEqual(["T"]);
  });

  test("another graph gives no T and no c", () => {
    expect(solidExpected([{ x: 1, y: 38 }], { x: "theta", y: "t" }, minuteRun(), {})).toEqual({});
  });
});
