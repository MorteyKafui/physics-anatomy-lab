/**
 * An attempt is one student's run of one experiment, kept as an append-only list of events
 * (GLOSSARY.md). Everything else (the bench, the table, the graph, the step the student is on) is
 * rebuilt from the events, so resuming is exact, a teacher can replay a run, and two devices can
 * sync an attempt without conflicts.
 *
 * Nothing here identifies a person (AGENTS.md rule 4): no name, email or account. An attempt is
 * tied to a learner only by the account or class membership that holds it, on the server.
 */

/** Guided with the coach; exam with the coach off; own data typed in from a real lab. */
export type AttemptMode = "guided" | "exam" | "own-data";

/** Bumped when the stored shape of attempts or events changes; old files then need migrating. */
export const ATTEMPT_FORMAT_VERSION = 1;

export interface Attempt {
  id: string;
  experimentId: string;
  mode: AttemptMode;
  /** Builds the hidden world: the same seed gives the same apparatus (packages/instruments). */
  seed: number;
  /** Wall-clock time the attempt began, ms since 1970. */
  createdAt: number;
  /** Wall-clock time of the latest event, ms since 1970. */
  updatedAt: number;
  formatVersion: number;
}

/** A JSON value: what an event may carry, so it survives IndexedDB, sync and attempt files alike. */
export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

/** What the lab asks to record. The store adds the rest. */
export interface NewEvent<D extends Json = Json> {
  /** An experiment-defined verb: "place-part", "set-length", "start-stopwatch", "record-reading". */
  kind: string;
  data: D;
}

export interface LabEvent<D extends Json = Json> extends NewEvent<D> {
  /** Unique across all devices; sync uses it to tell which events the other side lacks. */
  id: string;
  attemptId: string;
  /**
   * One more than the highest seq the recording device had seen in this attempt. Two devices
   * recording offline may both use the same seq; `device` and `id` then settle the order.
   */
  seq: number;
  /** The device that recorded the event: a random id, not tied to a person. */
  device: string;
  /** Wall-clock time it was recorded, ms since 1970. For display and replay timing only. */
  at: number;
}

/**
 * The order every device replays events in: by seq, then device, then id. It depends only on
 * the events themselves, so any two devices holding the same events rebuild the same state.
 */
export function compareEvents(a: LabEvent, b: LabEvent): number {
  if (a.seq !== b.seq) return a.seq - b.seq;
  if (a.device !== b.device) return a.device < b.device ? -1 : 1;
  if (a.id !== b.id) return a.id < b.id ? -1 : 1;
  return 0;
}

/** Throws unless the value is plain JSON: no undefined, functions, NaN, Infinity or class instances. */
export function assertJson(value: unknown, path = "data"): asserts value is Json {
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number") {
    if (!Number.isFinite(value))
      throw new TypeError(`${path} must be a finite number, got ${value}`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => assertJson(v, `${path}[${i}]`));
    return;
  }
  if (typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    for (const [k, v] of Object.entries(value)) assertJson(v, `${path}.${k}`);
    return;
  }
  throw new TypeError(`${path} must be plain JSON, got ${typeof value}`);
}
