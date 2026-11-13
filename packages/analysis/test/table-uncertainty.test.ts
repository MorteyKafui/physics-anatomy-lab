import { describe, expect, test } from "bun:test";

import { largestPercentUncertainty, tableUncertainties, type DesignColumn } from "../src";

const col = (
  c: Partial<DesignColumn> & Pick<DesignColumn, "id" | "symbol" | "kind" | "unit" | "role">,
) => c as DesignColumn;

describe("every cell's uncertainty, worked as the table works its values", () => {
  const columns = [
    col({
      id: "l",
      symbol: "l",
      kind: "length",
      unit: "m",
      role: "given",
      leastCount: { value: 0.1, unit: "cm" },
    }),
    col({
      id: "t1",
      symbol: "t₁",
      kind: "time",
      unit: "s",
      role: "repeat",
      group: "t",
      leastCount: { value: 0.01, unit: "s", digital: true },
    }),
    col({
      id: "t2",
      symbol: "t₂",
      kind: "time",
      unit: "s",
      role: "repeat",
      group: "t",
      leastCount: { value: 0.01, unit: "s", digital: true },
    }),
    col({ id: "t", symbol: "t", kind: "time", unit: "s", role: "mean", group: "t" }),
    col({ id: "T", symbol: "T", kind: "time", unit: "s", role: "derived", formula: "t / 20" }),
    col({
      id: "T2",
      symbol: "T²",
      kind: "time-squared",
      unit: "s²",
      role: "derived",
      formula: "T²",
    }),
  ];
  const design = {
    columns,
    rows: [
      {
        id: "r",
        cells: { l: "0.600", t1: "31.13", t2: "31.03", t: "31.08", T: "1.554", T2: "2.415" },
      },
    ],
  };
  const u = tableUncertainties(design).get("r")!;

  test("a scale reading is half its least count, in the column's unit", () => {
    expect(u.l).toBeCloseTo(0.0005, 12);
  });
  test("a digital display is its last digit", () => {
    expect(u.t1).toBeCloseTo(0.01, 12);
  });
  test("a mean is half the range of its repeats", () => {
    expect(u.t).toBeCloseTo(0.05, 9);
  });
  test("worked columns carry it through their formulas: T² twice T's percentage", () => {
    expect(u.T).toBeCloseTo(0.0025, 9);
    expect(u.T2! / 2.415).toBeCloseTo((2 * u.T!) / 1.554, 4);
  });
  test("one timing alone takes the reaction-time floor", () => {
    const one = tableUncertainties(
      { columns, rows: [{ id: "r", cells: { l: "0.600", t1: "31.13", t: "31.13" } }] },
      { timing: 0.1 },
    ).get("r")!;
    expect(one.t).toBeCloseTo(0.1, 12);
  });
  test("the largest percentage is T²'s", () => {
    expect(largestPercentUncertainty(design, new Map([["r", u]]))?.symbol).toBe("T²");
  });
});

test("a value written as the difference of two readings carries both: a rise of 0.1 °C", () => {
  const rise = col({
    id: "T",
    symbol: "T",
    kind: "temperature-difference",
    unit: "°C",
    role: "measured",
    leastCount: { value: 0.1, unit: "°C", readings: 2 },
  });
  const u = tableUncertainties({ columns: [rise], rows: [{ id: "r", cells: { T: "17.5" } }] });
  expect(u.get("r")!.T).toBeCloseTo(0.1, 12);
});

test("a temperature's least count is a step, converted without the scale's offset: ± 0.05 °C", () => {
  const theta = col({
    id: "theta",
    symbol: "θ",
    kind: "temperature",
    unit: "°C",
    role: "measured",
    leastCount: { value: 0.1, unit: "°C" },
  });
  const u = tableUncertainties({ columns: [theta], rows: [{ id: "r", cells: { theta: "38.3" } }] });
  expect(u.get("r")!.theta).toBeCloseTo(0.05, 12);
});
