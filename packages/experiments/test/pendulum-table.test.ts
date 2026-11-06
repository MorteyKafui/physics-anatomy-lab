import { describe, expect, test } from "bun:test";
import {
  fillDerived,
  heading,
  parseTable,
  runRules,
  TABLE_RULES,
  toTableView,
  type TableDesign,
} from "@pa/analysis";
import { replay, type Attempt, type LabEvent, type NewEvent } from "@pa/engine";
import { gFromPeriod, periodExact } from "@pa/physics";

import {
  asReading,
  benchPeriod,
  LENGTHS,
  lengthProjection,
  PENDULUM_PLOT,
  PENDULUM_STANDARD_TABLE,
  PENDULUM_TEMPLATES,
  readingsIntoTable,
  setLength,
  stepLength,
} from "../src";

const attempt: Attempt = {
  id: "a",
  experimentId: "simple-pendulum",
  mode: "guided",
  seed: 1,
  createdAt: 0,
  updatedAt: 0,
  formatVersion: 1,
};
const asEvents = (news: NewEvent[]): LabEvent[] =>
  news.map((e, i) => ({ ...e, id: `e${i}`, attemptId: "a", seq: i + 1, device: "d", at: i }));

describe("the length of the pendulum", () => {
  test("starts at 0.800 m and moves in 0.050 m steps between 0.400 m and 1.000 m", () => {
    expect(replay(lengthProjection, attempt, [])).toBe(0.8);
    expect(stepLength(0.8, 1)).toBe(0.85);
    expect(stepLength(1.0, 1)).toBe(1.0);
    expect(stepLength(0.4, -1)).toBe(0.4);
    expect(setLength(0.8, 0.8)).toBeUndefined();
    expect(setLength(0.8, 0.83)).toBeUndefined();
    expect(setLength(0.8, 1.2)).toBeUndefined();
    const events = [setLength(0.8, 0.6)!, { kind: "pendulum.set-length", data: { length: 7 } }];
    expect(replay(lengthProjection, attempt, asEvents(events))).toBe(0.6);
  });

  test("sets the period through the exact formula (rule 1)", () => {
    for (let l = LENGTHS.min; l <= LENGTHS.max + 1e-9; l += LENGTHS.step) {
      expect(benchPeriod(9.81, l)).toBe(
        periodExact({ length: l, g: 9.81, amplitude: (8 * Math.PI) / 180 }),
      );
    }
  });

  test("readings from before lengths could change count as 0.800 m", () => {
    expect(asReading({ id: "r", data: { t: 35.93 } })).toEqual({ id: "r", t: 35.93, l: 0.8 });
    expect(asReading({ id: "r", data: { t: 40.1, l: 1 } })).toEqual({ id: "r", t: 40.1, l: 1 });
    expect(asReading({ id: "r", data: null })).toBeUndefined();
  });
});

describe("the pendulum table", () => {
  test("the standard table is the WASSCE one: l, t₁, t₂, t, T and T²", () => {
    expect(PENDULUM_STANDARD_TABLE.map(heading)).toEqual([
      "l/m",
      "t₁/s",
      "t₂/s",
      "t/s",
      "T/s",
      "T²/s²",
    ]);
    expect(PENDULUM_TEMPLATES.single.map(heading)).toEqual(["l/m", "t/s", "T/s", "T²/s²"]);
    expect(PENDULUM_TEMPLATES["three-repeats"].map((c) => c.symbol)).toEqual([
      "l",
      "t₁",
      "t₂",
      "t₃",
      "t",
      "T",
      "T²",
    ]);
  });

  test("readings go into the table one row per length, timings in the repeats", () => {
    let n = 0;
    const cells = readingsIntoTable(
      { columns: [...PENDULUM_STANDARD_TABLE], rows: [{ id: "r1", cells: {} }] },
      [
        { id: "a", t: 35.93, l: 0.8 },
        { id: "b", t: 35.9, l: 0.8 },
        { id: "c", t: 40.12, l: 1 },
      ],
      () => `new${(n += 1)}`,
    );
    expect(cells).toEqual([
      { row: "r1", column: "l", value: "0.800" },
      { row: "r1", column: "t1", value: "35.93" },
      { row: "r1", column: "t2", value: "35.90" },
      { row: "new1", column: "l", value: "1.000" },
      { row: "new1", column: "t1", value: "40.12" },
    ]);
  });

  test("a standard table filled from the bench's own periods passes every check", () => {
    const lengths = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
    const rows = lengths.map((l, i) => {
      const t = 20 * benchPeriod(9.81, l);
      return {
        id: `r${i}`,
        cells: { l: l.toFixed(3), t1: t.toFixed(2), t2: (t + 0.03).toFixed(2) },
      };
    });
    const table = fillDerived<TableDesign>({ columns: [...PENDULUM_STANDARD_TABLE], rows });
    const findings = runRules(TABLE_RULES, {
      table: parseTable(toTableView(table)),
      plot: PENDULUM_PLOT,
    });
    expect(findings.filter((f) => f.severity !== "good").map((f) => f.rule)).toEqual([]);
    // And T² over l gives back g through 4π² / slope, to well within the 8° amplitude effect.
    const r = table.rows[3]!.cells;
    expect(gFromPeriod(0.8, Number(r.T))).toBeCloseTo(9.81, 0);
  });
});
