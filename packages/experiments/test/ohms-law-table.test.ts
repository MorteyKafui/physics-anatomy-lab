import { describe, expect, test } from "bun:test";

import { terminalPdReadings } from "@pa/physics";

import {
  OHMS_LAW_ANALYSIS_RULES,
  OHMS_LAW_STANDARD_TABLE,
  ohmsLawExpected,
  ohmsLawReadingsIntoTable,
  OHMS_LAW_TEMPLATES,
  vInterceptOf,
  rFromSlope,
} from "../src";

// The approved bench with ideal meters: every reading lies exactly on V = E − I r.
const cell = { emf: 3, internalResistance: 1.5 };
const reading = (pj: number) =>
  terminalPdReadings({
    ...cell,
    resistor: 1,
    wireResistance: 4,
    wireLength: 1,
    ammeterResistance: 0,
    voltmeterResistance: Infinity,
    jockey: pj,
    keyClosed: true,
  });

describe("the Ohm's law table", () => {
  test("the standard table is PJ, two readings each of I and V, and their means", () => {
    expect(OHMS_LAW_STANDARD_TABLE.map((c) => `${c.id}:${c.role}`)).toEqual([
      "PJ:given",
      "I1:repeat",
      "I2:repeat",
      "I:mean",
      "V1:repeat",
      "V2:repeat",
      "V:mean",
    ]);
    expect(OHMS_LAW_TEMPLATES.single.map((c) => c.id)).toEqual(["PJ", "I", "V"]);
  });

  test("readings go into the table one row per position, repeats side by side, PJ in cm", () => {
    let n = 0;
    const cells = ohmsLawReadingsIntoTable(
      { columns: [...OHMS_LAW_STANDARD_TABLE], rows: [] },
      [
        { id: "a", pj: 0, current: 0.46, voltage: 2.3 },
        { id: "b", pj: 0.4, current: 0.6, voltage: 2.1 },
        { id: "c", pj: 0.4, current: 0.62, voltage: 2.05 },
      ],
      () => `row-${++n}`,
    );
    expect(cells).toEqual([
      { row: "row-1", column: "PJ", value: "0.0" },
      { row: "row-1", column: "I1", value: "0.46" },
      { row: "row-1", column: "V1", value: "2.30" },
      { row: "row-2", column: "PJ", value: "40.0" },
      { row: "row-2", column: "I1", value: "0.60" },
      { row: "row-2", column: "V1", value: "2.10" },
      { row: "row-2", column: "I2", value: "0.62" },
      { row: "row-2", column: "V2", value: "2.05" },
    ]);
  });
});

describe("the Ohm's law analysis", () => {
  const a = reading(0.4);
  const b = reading(0.8);
  // The line through two readings, drawn on I (A) against V (V).
  const line = { from: { x: a.voltage, y: a.current }, to: { x: b.voltage, y: b.current } };
  const triangle = { a: line.from, b: line.to, c: { x: line.to.x, y: line.from.y } };
  const units = { x: "V", y: "A" };
  const columns = { x: "V", y: "I" };

  test("the line meets the V axis at the emf, and its slope gives the internal resistance", () => {
    expect(vInterceptOf(line)).toBeCloseTo(cell.emf, 12);
    const want = ohmsLawExpected(triangle, line, columns, units, {});
    expect(want.slope!.value).toBeCloseTo(-1 / cell.internalResistance, 12);
    expect(want.E!.value).toBeCloseTo(cell.emf, 12);
    expect(want.r!.value).toBeCloseTo(cell.internalResistance, 12);
    expect(rFromSlope({ value: -0.5, dims: want.slope!.dims }).value).toBe(2);
  });

  test("r is worked from the slope the student wrote, so a slip in the slope is not marked twice", () => {
    const want = ohmsLawExpected(triangle, line, columns, units, {
      slope: { value: "-0.80", unit: "A V⁻¹" },
    });
    expect(want.r!.value).toBeCloseTo(1.25, 12);
  });

  test("right answers pass; a missing unit and a wrong value are named", () => {
    const want = ohmsLawExpected(triangle, line, columns, units, {});
    const ok = OHMS_LAW_ANALYSIS_RULES[0]!.check({
      answers: {
        slope: { value: "-0.667", unit: "A V⁻¹" },
        E: { value: "3.00", unit: "V" },
        r: { value: "1.50", unit: "Ω" },
      },
      expected: want,
    });
    expect(ok).toEqual([]);
    const bad = OHMS_LAW_ANALYSIS_RULES[0]!.check({
      answers: { E: { value: "3.00", unit: "" }, r: { value: "2.50", unit: "Ω" } },
      expected: want,
    });
    expect(bad.map((f) => `${f.column}:${f.rule}`)).toEqual([
      "E:analysis-unit",
      "r:analysis-value",
    ]);
  });

  test("a graph of something else gives a slope but no E or r", () => {
    const want = ohmsLawExpected(triangle, line, { x: "PJ", y: "I" }, { x: "cm", y: "A" }, {});
    expect(want.slope).toBeDefined();
    expect(want.E).toBeUndefined();
    expect(want.r).toBeUndefined();
  });
});
