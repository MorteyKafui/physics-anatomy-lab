import { describe, expect, test } from "bun:test";
import fc from "fast-check";

import {
  addRepeat,
  checkFormula,
  evaluate,
  fillDerived,
  formulaUnitFindings,
  heading,
  parseFormula,
  parseTable,
  runRules,
  TABLE_RULES,
  toSIText,
  toTableView,
  type DesignColumn,
  type TableDesign,
} from "../src";

const value = (text: string, known: string[], values: Record<string, number>) => {
  const p = parseFormula(text, known);
  if (!p.ok) throw new Error(`${text}: ${p.problem}`);
  return evaluate(p.expr, values);
};

describe("formulas", () => {
  test("follow the usual order of operations", () => {
    expect(value("2 + 3 × 4", [], {})).toBe(14);
    expect(value("(2 + 3) * 4", [], {})).toBe(20);
    expect(value("2^3^2", [], {})).toBe(512);
    expect(value("-2²", [], {})).toBe(-4);
    expect(value("10 ÷ 4", [], {})).toBe(2.5);
  });

  test("read column symbols, π, functions and side-by-side multiplication", () => {
    const known = ["l", "T", "t₁", "t₂"];
    expect(value("t₁ / 20", known, { "t₁": 40 })).toBe(2);
    expect(value("T²", known, { T: 2 })).toBe(4);
    expect(value("4π²l / T²", known, { l: 1, T: 2 })).toBeCloseTo(Math.PI ** 2, 12);
    expect(value("lT", known, { l: 3, T: 2 })).toBe(6);
    expect(value("sqrt(l) + log(100) + ln(1)", known, { l: 9 })).toBe(5);
  });

  test("say what is wrong instead of guessing", () => {
    expect(parseFormula("", [])).toMatchObject({ ok: false, problem: "empty" });
    expect(parseFormula("t / 20", ["T"])).toMatchObject({
      ok: false,
      problem: "unknown-symbol",
      near: "t",
    });
    expect(parseFormula("(t / 20", ["t"])).toMatchObject({ ok: false, problem: "unclosed" });
    expect(parseFormula("t / ", ["t"])).toMatchObject({ ok: false, problem: "unexpected" });
    expect(parseFormula("t # 2", ["t"])).toMatchObject({
      ok: false,
      problem: "unexpected",
      near: "#",
    });
  });

  test("never throw, whatever is typed", () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 30 }), (text) => {
        const p = parseFormula(text, ["t", "T", "l"]);
        if (p.ok) evaluate(p.expr, { t: 1, T: 2, l: 3 });
        return true;
      }),
    );
  });

  test("missing values and undefined maths give NaN, not a number that looks right", () => {
    expect(value("t / 0", ["t"], { t: 1 })).toBeNaN();
    expect(value("sqrt(t)", ["t"], { t: -1 })).toBeNaN();
    expect(value("t + 1", ["t"], {})).toBeNaN();
  });
});

const length: DesignColumn = {
  id: "l",
  symbol: "l",
  kind: "length",
  unit: "m",
  role: "given",
  leastCount: { value: 0.1, unit: "cm" },
};
const timing: DesignColumn = {
  id: "t",
  symbol: "t",
  kind: "time",
  unit: "s",
  role: "measured",
  leastCount: { value: 0.01, unit: "s" },
};
const period: DesignColumn = {
  id: "T",
  symbol: "T",
  kind: "time",
  unit: "s",
  role: "derived",
  formula: "t / 20",
};
const periodSquared: DesignColumn = {
  id: "T2",
  symbol: "T²",
  kind: "time-squared",
  unit: "s²",
  role: "derived",
  formula: "T²",
};

const single: TableDesign = {
  columns: [length, timing, period, periodSquared],
  rows: [{ id: "r1", cells: { l: "0.800", t: "35.93" } }],
};

describe("designing a table", () => {
  test("headings are quantity over unit", () => {
    expect(heading(periodSquared)).toBe("T²/s²");
    expect(heading({ symbol: "T²", unit: "" })).toBe("T²");
  });

  test("a repeat turns t into t₁ and t₂ with their mean, keeping what was typed", () => {
    const repeated = addRepeat(single, "t");
    expect(repeated.columns.map((c) => [c.symbol, c.role])).toEqual([
      ["l", "given"],
      ["t₁", "repeat"],
      ["t₂", "repeat"],
      ["t", "mean"],
      ["T", "derived"],
      ["T²", "derived"],
    ]);
    expect(repeated.rows[0]!.cells).toEqual({ l: "0.800", t1: "35.93" });
    const third = addRepeat(repeated, "t1");
    expect(third.columns.map((c) => c.symbol).slice(1, 5)).toEqual(["t₁", "t₂", "t₃", "t"]);
  });

  test("a formula may use only the table's other columns", () => {
    expect(checkFormula(single, period)).toEqual({ ok: true });
    expect(checkFormula(single, { ...period, formula: "t / n" })).toEqual({
      ok: false,
      problem: "unknown-symbol",
      near: "n",
    });
  });

  test("at Auto, means and derived columns are filled in the way the guide writes them", () => {
    const repeated = addRepeat(single, "t");
    const typed: TableDesign = {
      ...repeated,
      rows: [{ id: "r1", cells: { l: "0.800", t1: "35.93", t2: "35.90" } }],
    };
    const filled = fillDerived(typed).rows[0]!.cells;
    // The mean takes one more decimal place than its readings; T and T² carry four figures.
    expect(filled.t).toBe("35.915");
    expect(filled.T).toBe("1.796");
    // T² is worked from T as written (1.796²), as a student would.
    expect(filled.T2).toBe("3.226");
  });
});

describe("the checks mark the student's own design", () => {
  const sixRows = (cells: (n: number) => Record<string, string>) =>
    Array.from({ length: 6 }, (_, i) => ({ id: `r${i}`, cells: cells(i) }));

  test("a filled-in table of the student's own layout draws no complaints", () => {
    const design = addRepeat({ ...single, rows: [] }, "t");
    const rows = sixRows((i) => {
      const l = 0.5 + 0.1 * i;
      const t = 40.12 * Math.sqrt(l);
      return { l: l.toFixed(3), t1: t.toFixed(2), t2: (t + 0.02).toFixed(2) };
    });
    const table = fillDerived({ ...design, rows });
    const findings = runRules(TABLE_RULES, {
      table: parseTable(toTableView(table)),
      plot: { x: "l", y: "T2" },
    });
    expect(findings.filter((f) => f.severity !== "good").map((f) => f.rule)).toEqual([]);
  });

  test("a heading without its unit, a wrong T and a mean short of a decimal place are caught", () => {
    const design = addRepeat({ ...single, rows: [] }, "t");
    const rows = sixRows((i) => {
      const l = 0.5 + 0.1 * i;
      const t = 40.12 * Math.sqrt(l);
      return { l: l.toFixed(3), t1: t.toFixed(2), t2: (t + 0.02).toFixed(2) };
    });
    const filled = fillDerived({ ...design, rows });
    filled.rows[2]!.cells.t = Number(filled.rows[2]!.cells.t).toFixed(2);
    filled.rows[3]!.cells.T = "2.500";
    const columns = filled.columns.map((c) => (c.id === "T2" ? { ...c, unit: "" } : c));
    const findings = runRules(TABLE_RULES, {
      table: parseTable(toTableView({ columns, rows: filled.rows })),
      plot: { x: "l", y: "T2" },
    });
    const byRule = Object.fromEntries(findings.map((f) => [f.rule, f]));
    expect(byRule["table-heading-unit"]).toMatchObject({ params: { heading: "T²/s²" } });
    expect(byRule["table-derived-arithmetic"]).toMatchObject({ column: "T", rows: ["r3"] });
    expect(byRule["table-mean-decimals"]).toMatchObject({ column: "t", rows: ["r2"] });
  });
});

describe("the dimension check and unit conversions", () => {
  test("a formula whose units do not balance with its heading is caught", () => {
    expect(formulaUnitFindings(single)).toEqual([]);
    const wrongHeading = {
      ...single,
      columns: single.columns.map((c) =>
        c.id === "T" ? { ...c, kind: "length" as const, unit: "m" } : c,
      ),
    };
    const found = formulaUnitFindings(wrongHeading);
    expect(found[0]).toMatchObject({
      rule: "table-formula-units",
      column: "T",
      params: { symbol: "T", formula: "t / 20", gives: "s", unit: "m" },
    });
    // And T² then comes out in m², which its heading (s²) does not say either.
    expect(found[1]).toMatchObject({ column: "T2", params: { gives: "m²", unit: "s²" } });
    // T² from a T in seconds is in s², which its heading says: fine.
    expect(formulaUnitFindings({ columns: [timing, period, periodSquared] })).toEqual([]);
  });

  test("a unit that is not SI says what it is in SI", () => {
    expect(toSIText("length", "cm")).toBe("1 cm = 0.01 m");
    expect(toSIText("time", "min")).toBe("1 min = 60 s");
    expect(toSIText("length", "m")).toBeUndefined();
    expect(toSIText("temperature", "°C")).toBeUndefined();
  });
});
