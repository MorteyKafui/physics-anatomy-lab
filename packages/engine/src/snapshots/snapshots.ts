import type { Projection } from "../events/replay";
import { compareEvents, type Json, type LabEvent, type NewEvent } from "../events/types";
import { STEPS, type Step } from "../steps/machine";

/**
 * Snapshots (master plan, "Snapshots, labelled exports and research use"): a labelled capture of
 * the bench, the table or the graph that also keeps the exact lab state. The state is not copied:
 * a snapshot records where in the attempt's events it was taken, and every event before it
 * rebuilds the lab as it was, so a figure can be drawn again, sharp, at any size. Each step's
 * completion takes one automatically; the student takes their own with the camera.
 *
 * Deleting hides a snapshot and can be undone, so nothing is lost.
 */

export const SNAPSHOT_KINDS = ["bench", "table", "graph"] as const;
export type SnapshotKind = (typeof SNAPSHOT_KINDS)[number];

/** Where in the attempt a snapshot was taken: its own event, in replay order. */
export interface SnapshotPoint {
  seq: number;
  device: string;
  id: string;
}

export interface Snapshot {
  id: string;
  kind: SnapshotKind;
  step: Step;
  caption: string;
  /** Taken by the lab when a step was finished, rather than by the student. */
  auto: boolean;
  /** For the bench: the bench clock and the stopwatch's reading at that moment, s. */
  bench: { time: number; stopwatch: number } | undefined;
  /** When it was taken, ms since 1970. */
  takenAt: number;
  point: SnapshotPoint;
  deleted: boolean;
}

export interface SnapshotsState {
  /** Snapshot ids in the notebook's order, deleted ones included (they can come back). */
  order: string[];
  byId: Record<string, Snapshot>;
}

export const EMPTY_SNAPSHOTS: SnapshotsState = { order: [], byId: {} };

/** The snapshots the notebook shows, in order. */
export const visibleSnapshots = (s: SnapshotsState) =>
  s.order.map((id) => s.byId[id]!).filter((x) => !x.deleted);

/** A snapshot's figure number: its place among the snapshots shown (Fig. 1, Fig. 2 …). */
export const figureNumber = (s: SnapshotsState, id: string) =>
  visibleSnapshots(s).findIndex((x) => x.id === id) + 1;

/** The events that rebuild the lab as it was when a snapshot was taken. */
export const eventsBefore = (events: readonly LabEvent[], point: SnapshotPoint) =>
  events.filter((e) => compareEvents(e, { ...e, ...point } as LabEvent) < 0);

export const MAX_CAPTION = 140;

export type SnapshotCommand =
  | {
      type: "take";
      id: string;
      kind: SnapshotKind;
      step: Step;
      caption: string;
      auto: boolean;
      bench?: { time: number; stopwatch: number };
    }
  | { type: "caption"; id: string; caption: string }
  | { type: "move"; id: string; index: number }
  | { type: "delete"; id: string }
  | { type: "restore"; id: string };

export type SnapshotDecision = { ok: true; events: NewEvent[] } | { ok: false; reason: string };

const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const short = (v: unknown, max: number): v is string => typeof v === "string" && v.length <= max;

/** Turn a notebook action into events, or refuse it. Pure. */
export function decideSnapshot(state: SnapshotsState, c: SnapshotCommand): SnapshotDecision {
  const exists = (id: string) => state.byId[id] !== undefined;
  switch (c.type) {
    case "take":
      if (!short(c.id, 40) || c.id === "" || exists(c.id)) return { ok: false, reason: "exists" };
      if (!(SNAPSHOT_KINDS as readonly string[]).includes(c.kind))
        return { ok: false, reason: "kind" };
      if (!(STEPS as readonly string[]).includes(c.step)) return { ok: false, reason: "step" };
      if (!short(c.caption, MAX_CAPTION)) return { ok: false, reason: "caption" };
      if (c.bench && !(finite(c.bench.time) && finite(c.bench.stopwatch)))
        return { ok: false, reason: "bench" };
      return {
        ok: true,
        events: [
          {
            kind: "snapshot.take",
            data: {
              id: c.id,
              kind: c.kind,
              step: c.step,
              caption: c.caption,
              auto: c.auto,
              ...(c.bench ? { bench: c.bench } : {}),
            },
          },
        ],
      };
    case "caption":
      if (!exists(c.id) || !short(c.caption, MAX_CAPTION)) return { ok: false, reason: "caption" };
      if (state.byId[c.id]!.caption === c.caption) return { ok: false, reason: "unchanged" };
      return {
        ok: true,
        events: [{ kind: "snapshot.caption", data: { id: c.id, caption: c.caption } }],
      };
    case "move": {
      const visible = visibleSnapshots(state);
      const from = visible.findIndex((x) => x.id === c.id);
      if (
        from < 0 ||
        !Number.isInteger(c.index) ||
        c.index < 0 ||
        c.index >= visible.length ||
        c.index === from
      )
        return { ok: false, reason: "move" };
      return { ok: true, events: [{ kind: "snapshot.move", data: { id: c.id, index: c.index } }] };
    }
    case "delete":
      if (!exists(c.id) || state.byId[c.id]!.deleted) return { ok: false, reason: "delete" };
      return { ok: true, events: [{ kind: "snapshot.delete", data: { id: c.id } }] };
    case "restore":
      if (!exists(c.id) || !state.byId[c.id]!.deleted) return { ok: false, reason: "restore" };
      return { ok: true, events: [{ kind: "snapshot.restore", data: { id: c.id } }] };
  }
}

function commandOf(e: LabEvent): SnapshotCommand | undefined {
  const d = (e.data ?? {}) as Record<string, Json>;
  const id = d.id;
  if (!short(id, 40)) return undefined;
  switch (e.kind) {
    case "snapshot.take": {
      const bench = d.bench as Record<string, Json> | undefined;
      return {
        type: "take",
        id,
        kind: d.kind as SnapshotKind,
        step: d.step as Step,
        caption: typeof d.caption === "string" ? d.caption : "",
        auto: d.auto === true,
        ...(bench && finite(bench.time) && finite(bench.stopwatch)
          ? { bench: { time: bench.time, stopwatch: bench.stopwatch } }
          : {}),
      };
    }
    case "snapshot.caption":
      return typeof d.caption === "string"
        ? { type: "caption", id, caption: d.caption }
        : undefined;
    case "snapshot.move":
      return finite(d.index) ? { type: "move", id, index: d.index } : undefined;
    case "snapshot.delete":
      return { type: "delete", id };
    case "snapshot.restore":
      return { type: "restore", id };
    default:
      return undefined;
  }
}

export const snapshotsProjection: Projection<SnapshotsState> = {
  initial: () => EMPTY_SNAPSHOTS,
  apply(state, e) {
    const c = commandOf(e);
    if (!c || !decideSnapshot(state, c).ok) return state;
    switch (c.type) {
      case "take":
        return {
          order: [...state.order, c.id],
          byId: {
            ...state.byId,
            [c.id]: {
              id: c.id,
              kind: c.kind,
              step: c.step,
              caption: c.caption,
              auto: c.auto,
              bench: c.bench,
              takenAt: e.at,
              point: { seq: e.seq, device: e.device, id: e.id },
              deleted: false,
            },
          },
        };
      case "caption":
        return {
          ...state,
          byId: { ...state.byId, [c.id]: { ...state.byId[c.id]!, caption: c.caption } },
        };
      case "move": {
        // Move among the visible snapshots; deleted ones keep their places in between.
        const visible = visibleSnapshots(state).map((x) => x.id);
        const without = visible.filter((id) => id !== c.id);
        without.splice(c.index, 0, c.id);
        const hidden = state.order.filter((id) => state.byId[id]!.deleted);
        return { ...state, order: [...without, ...hidden] };
      }
      case "delete":
      case "restore":
        return {
          ...state,
          byId: { ...state.byId, [c.id]: { ...state.byId[c.id]!, deleted: c.type === "delete" } },
        };
    }
  },
};
