import { describe, expect, test } from "bun:test";
import fc from "fast-check";

import outlierFixtures from "../../../validation/fixtures/outliers.json";
import tFixtures from "../../../validation/fixtures/student_t.json";
import {
  deletedResiduals,
  findOutlier,
  outlierCriticalValue,
  parseTable,
  runRules,
  studentTCdf,
  studentTQuantile,
  TABLE_RULES,
  type Finding,
  type Rule,
  type TableColumn,
  type TableView,
} from "../src";

const close = (a: number, b: number, rel: number) =>
  Math.abs(a - b) <= rel * Math.max(1, Math.abs(b));

describe("Student's t agrees with scipy.stats.t (validation/fixtures/student_t.json)", () => {
  test("quantiles", () => {
    for (const c of tFixtures.quantiles)
      expect({ ...c, ok: close(studentTQuantile(c.p, c.df), c.t, 1e-9) }).toMatchObject({
        ok: true,
      });
  });
  test("cumulative probabilities", () => {
    for (const c of tFixtures.cdf)
      expect({ ...c, ok: close(studentTCdf(c.t, c.df), c.p, 1e-12) }).toMatchObject({ ok: true });
  });
  test("the quantile undoes the CDF", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.001, max: 0.999, noNaN: true }),
        fc.integer({ min: 1, max: 60 }),
        (p, df) => close(studentTCdf(studentTQuantile(p, df), df), p, 1e-9),
      ),
    );
  });
});

describe("the outlier test agrees with the hat-matrix model (validation/fixtures/outliers.json)", () => {
  for (const c of outlierFixtures.cases) {
    test(c.name, () => {
      const points = c.x.map((x, i) => ({ x, y: c.y[i]! }));
      const t = deletedResiduals(points).map((d) => d.t);
      t.forEach((v, i) => expect(close(v, c.deletedResiduals[i]!, 1e-8)).toBe(true));
      expect(close(outlierCriticalValue(points.length), c.critical, 1e-9)).toBe(true);
      expect(findOutlier(points)?.index ?? null).toBe(c.outlier);
    });
  }

  test("finds the one slip among 8 readings that a fixed 2.5 cut-off cannot", () => {
    const points = [1, 2, 3, 4, 5, 6, 7, 8].map((x) => ({
      x,
      y: 2 * x + (x === 5 ? 3 : 0.05 * (x % 2)),
    }));
    expect(findOutlier(points)?.index).toBe(4);
  });

  test("needs at least five readings", () => {
    expect(findOutlier([1, 2, 3, 4].map((x) => ({ x, y: x === 2 ? 50 : x })))).toBeUndefined();
    expect(() => outlierCriticalValue(4)).toThrow(RangeError);
  });
});

describe("runRules", () => {
  const rule = (id: string, f: Partial<Finding>): Rule<null> => ({
    id,
    skill: "tabulation",
    check: () => [{ rule: id, severity: "tip", skill: "tabulation", key: id, ...f }],
  });

  test("puts the most serious first and keeps going when a rule throws", () => {
    const errors: string[] = [];
    const findings = runRules(
      [
        rule("a", { severity: "good" }),
        {
          id: "broken",
          skill: "graph",
          check: () => {
            throw new Error("cannot judge");
          },
        },
        rule("b", { severity: "error" }),
        rule("c", { severity: "warning" }),
      ],
      null,
      (id) => errors.push(id),
    );
    expect(findings.map((f) => f.rule)).toEqual(["b", "c", "a"]);
    expect(errors).toEqual(["broken"]);
  });
});

// A pendulum table read with the 0.01 s digital stopwatch (ADR 0035): two timings of 20
// oscillations to 2 decimal places, their mean to 3, the period and its square worked out.
const columns: TableColumn[] = [
  {
    id: "l",
    symbol: "l",
    kind: "length",
    unit: "cm",
    source: "given",
    leastCount: { value: 0.1, unit: "cm" },
  },
  {
    id: "t1",
    symbol: "t₁",
    kind: "time",
    unit: "s",
    source: "measured",
    leastCount: { value: 0.01, unit: "s" },
  },
  {
    id: "t2",
    symbol: "t₂",
    kind: "time",
    unit: "s",
    source: "measured",
    leastCount: { value: 0.01, unit: "s" },
  },
  {
    id: "t",
    symbol: "t",
    kind: "time",
    unit: "s",
    source: "derived",
    meanOf: ["t1", "t2"],
    derive: (r) => (r.t1! + r.t2!) / 2,
  },
  {
    id: "T2",
    symbol: "T²",
    kind: "time-squared",
    unit: "s²",
    source: "derived",
    derive: (r) => ((r.t1! + r.t2!) / 2 / 20) ** 2,
  },
];

function row(id: string, l: string, t1: string, t2: string, t?: string, T2?: string) {
  const mean = ((Number(t1) + Number(t2)) / 2).toFixed(3);
  const sq = ((Number(t1) + Number(t2)) / 2 / 20) ** 2;
  return { id, cells: { l, t1, t2, t: t ?? mean, T2: T2 ?? sq.toFixed(3) } };
}

const good: TableView = {
  columns,
  rows: [
    row("r1", "100.0", "40.12", "40.08"),
    row("r2", "90.0", "38.06", "38.10"),
    row("r3", "80.0", "35.90", "35.92"),
    row("r4", "70.0", "33.52", "33.48"),
    row("r5", "60.0", "31.06", "31.10"),
    row("r6", "50.0", "28.36", "28.40"),
  ],
};

const check = (table: TableView) =>
  runRules(TABLE_RULES, { table: parseTable(table), plot: { x: "l", y: "T2" } });
const rulesFired = (table: TableView) =>
  check(table)
    .filter((f) => f.severity !== "good")
    .map((f) => f.rule);

describe("table rules on a pendulum table", () => {
  test("a careful student's table draws only praise", () => {
    expect(rulesFired(good)).toEqual([]);
    expect(check(good).map((f) => f.key)).toEqual(["table.enoughRows"]);
  });

  test("too few readings", () => {
    const f = check({ columns, rows: good.rows.slice(0, 2) });
    expect(f[0]).toMatchObject({
      rule: "table-too-few-rows",
      severity: "error",
      params: { n: 2, min: 5 },
    });
  });

  test("a cell that is not a number", () => {
    const rows = good.rows.map((r) =>
      r.id === "r3" ? { ...r, cells: { ...r.cells, t1: "35,9O" } } : r,
    );
    expect(check({ columns, rows }).find((f) => f.rule === "table-unreadable")).toMatchObject({
      rows: ["r3"],
      column: "t1",
    });
  });

  test("decimal places that change down a column", () => {
    const rows = good.rows.map((r) =>
      r.id === "r2" ? { ...r, cells: { ...r.cells, t1: "38.1" } } : r,
    );
    expect(rulesFired({ columns, rows })).toContain("table-inconsistent-decimals");
  });

  test("a stopwatch reading with fewer places than its least count", () => {
    const rows = good.rows.map((r) => ({
      ...r,
      cells: { ...r.cells, t1: Number(r.cells.t1).toFixed(1) },
    }));
    expect(
      check({ columns, rows }).find((f) => f.rule === "table-precision-vs-instrument"),
    ).toMatchObject({
      severity: "tip",
      key: "table.underRecorded",
      params: { expected: 2 },
    });
  });

  test("a mean with the readings' places instead of one more (ADR 0035: 35.91, should be 35.910)", () => {
    const rows = good.rows.map((r) =>
      r.id === "r3" ? { ...r, cells: { ...r.cells, t: "35.91" } } : r,
    );
    expect(check({ columns, rows }).find((f) => f.rule === "table-mean-decimals")).toMatchObject({
      rows: ["r3"],
      params: { expected: 3, value: "35.91" },
    });
  });

  test("a length recorded in m among cm", () => {
    const rows = good.rows.map((r) =>
      r.id === "r4" ? { ...r, cells: { ...r.cells, l: "0.70" } } : r,
    );
    expect(check({ columns, rows }).find((f) => f.rule === "table-unit-slip")).toMatchObject({
      rows: ["r4"],
      params: { factor: 100 },
    });
  });

  test("a wrong T² worked out by hand", () => {
    const rows = good.rows.map((r) =>
      r.id === "r5" ? { ...r, cells: { ...r.cells, T2: "2.900" } } : r,
    );
    expect(
      check({ columns, rows }).find((f) => f.rule === "table-derived-arithmetic"),
    ).toMatchObject({ rows: ["r5"] });
  });

  test("a reading worth repeating", () => {
    const rows = good.rows.map((r) => (r.id === "r2" ? row("r2", "90.0", "40.06", "40.10") : r));
    const f = check({ columns, rows }).find((x) => x.rule === "table-outlier");
    expect(f).toMatchObject({ rows: ["r2"], skill: "measurement" });
  });

  test("lengths bunched together", () => {
    const rows = good.rows.map((r, i) =>
      row(r.id, (60 + i * 4).toFixed(1), r.cells.t1!, r.cells.t2!),
    );
    expect(rulesFired({ columns, rows })).toContain("table-narrow-range");
  });
});
