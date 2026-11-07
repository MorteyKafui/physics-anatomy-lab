import type { Projection } from "../events/replay";
import type { Json, LabEvent, NewEvent } from "../events/types";
import { STEPS, type Step } from "../steps/machine";

/**
 * Runs (master plan, "Review, retry and compare"): the student can redo an attempt from any step,
 * keeping their earlier work. A redo is a new attempt with the same seed, so the same apparatus.
 * It starts with a copy of every event the first run had before it reached that step, then a
 * `run.start` marking where it came from. The earlier run is never changed.
 */

export interface RunOrigin {
  /** The step this run was redone from. */
  from: Step;
  /** The attempt it was redone from. */
  of: string;
}

const isStep = (v: unknown): v is Step =>
  typeof v === "string" && (STEPS as readonly string[]).includes(v);

/** Where a run came from, or undefined for a first run. The first marker counts. */
export const runProjection: Projection<RunOrigin | undefined> = {
  initial: () => undefined,
  apply(state, e) {
    if (state || e.kind !== "run.start") return state;
    const d = (e.data ?? {}) as Record<string, Json>;
    return isStep(d.from) && typeof d.of === "string" && d.of.length <= 80
      ? { from: d.from, of: d.of }
      : state;
  },
};

/**
 * The events a redo from `from` keeps: everything before the run first went to that step. A redo
 * from Question keeps nothing; a step the run never reached cannot be redone from.
 */
export function eventsBeforeStep(events: readonly LabEvent[], from: Step): LabEvent[] | undefined {
  if (from === STEPS[0]) return [];
  const at = events.findIndex(
    (e) => e.kind === "step.go-to" && (e.data as Record<string, Json> | null)?.step === from,
  );
  return at < 0 ? undefined : events.slice(0, at);
}

/**
 * The events that start a redo: the kept events as new ones (they get new ids and seqs in the
 * new attempt), the marker, and the move to the step.
 */
export function redoEvents(
  events: readonly LabEvent[],
  from: Step,
  of: string,
): NewEvent[] | undefined {
  const kept = eventsBeforeStep(events, from);
  if (!kept) return undefined;
  return [
    ...kept.map((e) => ({ kind: e.kind, data: e.data })),
    { kind: "run.start", data: { from, of } },
    ...(from === STEPS[0] ? [] : [{ kind: "step.go-to", data: { step: from } }]),
  ];
}
