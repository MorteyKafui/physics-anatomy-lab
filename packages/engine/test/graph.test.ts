import { describe, expect, test } from "bun:test";
import type { Sheet } from "@pa/analysis";
import fc from "fast-check";

import {
  decideGraph,
  EMPTY_GRAPH,
  graphProjection,
  replay,
  type Attempt,
  type GraphCommand,
  type GraphState,
  type LabEvent,
  type NewEvent,
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

function run(commands: GraphCommand[]) {
  const events: NewEvent[] = [];
  let state: GraphState = EMPTY_GRAPH;
  for (const c of commands) {
    const d = decideGraph(state, c);
    if (!d.ok) continue;
    events.push(...d.events);
    state = replay(graphProjection, attempt, asEvents(events));
  }
  return state;
}

const sheet: Sheet = {
  x: { column: "l", start: 0.6, per2cm: 0.05 },
  y: { column: "T2", start: 2.4, per2cm: 0.2 },
};

describe("the graph", () => {
  test("is rebuilt from its events: axes, points, line and triangle", () => {
    const state = run([
      { type: "set-axes", sheet },
      { type: "plot", point: { row: "r1", x: 0.8, y: 3.22 } },
      { type: "plot", point: { row: "r2", x: 0.9, y: 3.63 } },
      { type: "plot", point: { row: "r1", x: 0.8, y: 3.23 } },
      { type: "draw-line", line: { from: { x: 0.6, y: 2.42 }, to: { x: 1, y: 4.02 } } },
      { type: "draw-triangle", triangle: { a: { x: 0.65, y: 2.62 }, b: { x: 0.95, y: 3.82 } } },
    ]);
    expect(state.sheet).toEqual(sheet);
    // Plotting a row again moves its point.
    expect(state.plotted).toEqual([
      { row: "r2", x: 0.9, y: 3.63 },
      { row: "r1", x: 0.8, y: 3.23 },
    ]);
    expect(state.line?.to).toEqual({ x: 1, y: 4.02 });
    expect(state.triangle?.a.x).toBe(0.65);
    // Rubbing out the line takes its triangle with it.
    expect(
      run([
        { type: "set-axes", sheet },
        { type: "draw-line", line: state.line! },
        { type: "draw-triangle", triangle: state.triangle! },
        { type: "erase-line" },
      ]).triangle,
    ).toBeUndefined();
  });

  test("refuses scales the guide does not accept, and plotting before there are axes", () => {
    expect(
      decideGraph(EMPTY_GRAPH, {
        type: "set-axes",
        sheet: { ...sheet, y: { ...sheet.y, per2cm: 0.3 } },
      }),
    ).toEqual({
      ok: false,
      reason: "bad-axes",
    });
    expect(decideGraph(EMPTY_GRAPH, { type: "plot", point: { row: "r1", x: 1, y: 1 } })).toEqual({
      ok: false,
      reason: "no-axes",
    });
    expect(
      decideGraph(run([{ type: "set-axes", sheet }]), {
        type: "draw-line",
        line: { from: { x: 1, y: 1 }, to: { x: 1, y: 2 } },
      }),
    ).toEqual({ ok: false, reason: "bad-point" });
  });

  test("a damaged event list never gives a graph without axes, or a point twice", () => {
    const anyEvent = fc.oneof(
      fc.record({
        kind: fc.constant("graph.axes"),
        data: fc.constantFrom(
          { x: sheet.x, y: sheet.y },
          { x: sheet.x, y: { ...sheet.y, per2cm: 3 } },
          null,
        ),
      }),
      fc.record({
        kind: fc.constant("graph.point"),
        data: fc.record({ row: fc.constantFrom("r1", "r2", ""), x: fc.double(), y: fc.double() }),
      }),
      fc.record({
        kind: fc.constant("graph.unplot"),
        data: fc.record({ row: fc.constantFrom("r1", "r2") }),
      }),
      fc.record({
        kind: fc.constantFrom("graph.line-erase", "graph.triangle-erase"),
        data: fc.constant({}),
      }),
    );
    fc.assert(
      fc.property(fc.array(anyEvent, { maxLength: 30 }), (news) => {
        const s = replay(graphProjection, attempt, asEvents(news as unknown as NewEvent[]));
        const rows = s.plotted.map((p) => p.row);
        return (
          (s.sheet !== undefined || s.plotted.length === 0) &&
          new Set(rows).size === rows.length &&
          s.plotted.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
        );
      }),
    );
  });
});
