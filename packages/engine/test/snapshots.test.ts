import { describe, expect, test } from "bun:test";
import fc from "fast-check";

import {
  decideSnapshot,
  EMPTY_SNAPSHOTS,
  eventsBefore,
  figureNumber,
  replay,
  snapshotsProjection,
  visibleSnapshots,
  type Attempt,
  type LabEvent,
  type NewEvent,
  type SnapshotCommand,
  type SnapshotsState,
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
  news.map((e, i) => ({
    ...e,
    id: `e${i}`,
    attemptId: "a",
    seq: i + 1,
    device: "d",
    at: 1000 + i,
  }));

function run(commands: SnapshotCommand[], before: NewEvent[] = []) {
  const events: NewEvent[] = [...before];
  let state: SnapshotsState = EMPTY_SNAPSHOTS;
  for (const c of commands) {
    const d = decideSnapshot(state, c);
    if (!d.ok) continue;
    events.push(...d.events);
    state = replay(snapshotsProjection, attempt, asEvents(events));
  }
  return { state, events: asEvents(events) };
}

const take = (id: string, kind: "bench" | "table" | "graph" = "bench"): SnapshotCommand => ({
  type: "take",
  id,
  kind,
  step: "build",
  caption: `Snapshot ${id}`,
  auto: false,
});

describe("snapshots", () => {
  test("are numbered in the notebook's order, and can be captioned and moved", () => {
    const { state } = run([
      take("a"),
      take("b", "table"),
      take("c", "graph"),
      { type: "caption", id: "b", caption: "My results table" },
      { type: "move", id: "c", index: 0 },
    ]);
    expect(visibleSnapshots(state).map((s) => s.id)).toEqual(["c", "a", "b"]);
    expect(figureNumber(state, "c")).toBe(1);
    expect(state.byId.b!.caption).toBe("My results table");
  });

  test("deleting hides a snapshot, which comes back where it was on undo", () => {
    const deleted = run([take("a"), take("b"), take("c"), { type: "delete", id: "b" }]).state;
    expect(visibleSnapshots(deleted).map((s) => s.id)).toEqual(["a", "c"]);
    expect(figureNumber(deleted, "c")).toBe(2);
    const back = run([
      take("a"),
      take("b"),
      take("c"),
      { type: "delete", id: "b" },
      { type: "restore", id: "b" },
    ]).state;
    expect(visibleSnapshots(back).map((s) => s.id)).toEqual(["a", "b", "c"]);
  });

  test("keep the exact lab state: the events before each one rebuild the lab as it was", () => {
    const before: NewEvent[] = [
      { kind: "part.place", data: { part: "base", slot: "bench" } },
      { kind: "part.place", data: { part: "rod", slot: "base-socket" } },
    ];
    const { state, events } = run([take("a")], before);
    const after = [
      ...events,
      ...asEvents([{ kind: "part.place", data: { part: "clamp", slot: "rod" } }]).map((e, i) => ({
        ...e,
        id: `late${i}`,
        seq: 99,
      })),
    ];
    expect(eventsBefore(after, state.byId.a!.point).map((e) => e.kind)).toEqual([
      "part.place",
      "part.place",
    ]);
  });

  test("refuse what does not fit", () => {
    const { state } = run([take("a")]);
    expect(decideSnapshot(state, take("a")).ok).toBe(false);
    expect(decideSnapshot(state, { type: "caption", id: "nope", caption: "x" }).ok).toBe(false);
    expect(decideSnapshot(state, { type: "caption", id: "a", caption: "x".repeat(200) }).ok).toBe(
      false,
    );
    expect(decideSnapshot(state, { type: "move", id: "a", index: 0 }).ok).toBe(false);
    expect(decideSnapshot(state, { type: "restore", id: "a" }).ok).toBe(false);
  });

  test("a damaged event list never shows a snapshot twice or loses its order", () => {
    const anyEvent = fc.oneof(
      fc.record({
        kind: fc.constant("snapshot.take"),
        data: fc.record({
          id: fc.constantFrom("a", "b", "c"),
          kind: fc.constantFrom("bench", "table", "graph", "photo"),
          step: fc.constantFrom("build", "plot", "nap"),
          caption: fc.string({ maxLength: 10 }),
        }),
      }),
      fc.record({
        kind: fc.constantFrom("snapshot.delete", "snapshot.restore"),
        data: fc.record({ id: fc.constantFrom("a", "b", "c") }),
      }),
      fc.record({
        kind: fc.constant("snapshot.move"),
        data: fc.record({
          id: fc.constantFrom("a", "b", "c"),
          index: fc.integer({ min: -1, max: 3 }),
        }),
      }),
    );
    fc.assert(
      fc.property(fc.array(anyEvent, { maxLength: 30 }), (news) => {
        const s = replay(snapshotsProjection, attempt, asEvents(news as unknown as NewEvent[]));
        return (
          new Set(s.order).size === s.order.length &&
          s.order.every((id) => s.byId[id] !== undefined)
        );
      }),
    );
  });
});
