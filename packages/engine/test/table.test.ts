import { describe, expect, test } from "bun:test";
import type { DesignColumn } from "@pa/analysis";
import fc from "fast-check";

import {
  decideTable,
  EMPTY_TABLE,
  replay,
  tableProjection,
  type Attempt,
  type LabEvent,
  type NewEvent,
  type TableCommand,
  type TableState,
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

function run(commands: TableCommand[]) {
  const events: NewEvent[] = [];
  let state: TableState = EMPTY_TABLE;
  for (const c of commands) {
    const d = decideTable(state, c);
    if (!d.ok) continue;
    events.push(...d.events);
    state = replay(tableProjection, attempt, asEvents(events));
  }
  return { state, events };
}

const l: DesignColumn = { id: "l", symbol: "l", kind: "length", unit: "m", role: "given" };
const t: DesignColumn = {
  id: "t",
  symbol: "t",
  kind: "time",
  unit: "s",
  role: "measured",
  leastCount: { value: 0.01, unit: "s" },
};
const notes: DesignColumn = { id: "n", symbol: "Notes", kind: "count", unit: "", role: "notes" };

describe("the results table", () => {
  test("is rebuilt from its events: layout, rows and every typed cell", () => {
    const { state } = run([
      { type: "start-table", layout: "own", columns: [l, t] },
      { type: "add-row", id: "r1" },
      { type: "set-cell", row: "r1", column: "l", value: "0.800" },
      { type: "set-cell", row: "r1", column: "t", value: "35.93" },
    ]);
    expect(state.layout).toBe("own");
    expect(state.rows).toEqual([{ id: "r1", cells: { l: "0.800", t: "35.93" } }]);
  });

  test("keeps exactly what was typed: 0.80 and 0.8 stay different", () => {
    const { state } = run([
      { type: "start-table", layout: "own", columns: [l] },
      { type: "add-row", id: "r1" },
      { type: "set-cell", row: "r1", column: "l", value: "0.80" },
    ]);
    expect(state.rows[0]!.cells.l).toBe("0.80");
    expect(decideTable(state, { type: "set-cell", row: "r1", column: "l", value: "0.8" }).ok).toBe(
      true,
    );
  });

  test("changing the columns keeps what was typed in the columns that stay", () => {
    const { state } = run([
      { type: "start-table", layout: "own", columns: [l, t] },
      { type: "add-row", id: "r1" },
      { type: "set-cell", row: "r1", column: "l", value: "0.800" },
      { type: "set-cell", row: "r1", column: "t", value: "35.93" },
      { type: "set-columns", columns: [l, notes] },
    ]);
    expect(state.columns.map((c) => c.id)).toEqual(["l", "n"]);
    expect(state.rows[0]!.cells).toEqual({ l: "0.800" });
  });

  test("refuses what does not fit the table", () => {
    const { state } = run([
      { type: "start-table", layout: "own", columns: [l] },
      { type: "add-row", id: "r1" },
    ]);
    expect(decideTable(state, { type: "add-row", id: "r1" })).toEqual({
      ok: false,
      reason: "row-exists",
    });
    expect(decideTable(state, { type: "set-cell", row: "r9", column: "l", value: "1" })).toEqual({
      ok: false,
      reason: "no-such-row",
    });
    expect(decideTable(state, { type: "set-cell", row: "r1", column: "x", value: "1" })).toEqual({
      ok: false,
      reason: "no-such-column",
    });
    expect(decideTable(state, { type: "set-columns", columns: [l, l] })).toEqual({
      ok: false,
      reason: "bad-columns",
    });
  });

  test("a damaged event list never leaves a cell outside the table", () => {
    const anyEvent = fc.oneof(
      fc.record({
        kind: fc.constant("table.start"),
        data: fc.record({
          layout: fc.constantFrom("own", "standard", "bogus"),
          columns: fc.constantFrom([l, t], [l], [t, notes], [{ id: "" }], "nope"),
        }),
      }),
      fc.record({
        kind: fc.constant("table.row-add"),
        data: fc.record({ id: fc.constantFrom("r1", "r2") }),
      }),
      fc.record({
        kind: fc.constant("table.row-remove"),
        data: fc.record({ id: fc.constantFrom("r1", "r2") }),
      }),
      fc.record({
        kind: fc.constant("table.cell"),
        data: fc.record({
          row: fc.constantFrom("r1", "r2", "r3"),
          column: fc.constantFrom("l", "t", "n", "x"),
          value: fc.string({ maxLength: 8 }),
        }),
      }),
    );
    fc.assert(
      fc.property(fc.array(anyEvent, { maxLength: 30 }), (news) => {
        const s = replay(tableProjection, attempt, asEvents(news as unknown as NewEvent[]));
        const ids = new Set(s.columns.map((c) => c.id));
        return (
          new Set(s.rows.map((r) => r.id)).size === s.rows.length &&
          s.rows.every((r) => Object.keys(r.cells).every((k) => ids.has(k)))
        );
      }),
    );
  });
});
