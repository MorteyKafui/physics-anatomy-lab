import {
  ATTEMPT_FORMAT_VERSION,
  assertJson,
  type Attempt,
  type LabEvent,
  type NewEvent,
} from "./types";

const MODES = new Set(["guided", "exam", "own-data"]);

function text(value: unknown, name: string): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 200) {
    throw new TypeError(`${name} must be a non-empty string of at most 200 characters`);
  }
  return value;
}

function whole(value: unknown, name: string, min = 0): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min) {
    throw new TypeError(`${name} must be a whole number of at least ${min}`);
  }
  return value;
}

/** Checks an event the lab is about to record. */
export function validateNewEvent(e: NewEvent, index = 0): void {
  text(e?.kind, `events[${index}].kind`);
  assertJson(e.data, `events[${index}].data`);
}

/** Checks an attempt header from outside this device (sync, an attempt file). */
export function validateAttempt(a: unknown): Attempt {
  const x = a as Partial<Attempt>;
  if (typeof x !== "object" || x === null) throw new TypeError("attempt must be an object");
  text(x.id, "attempt.id");
  text(x.experimentId, "attempt.experimentId");
  if (!MODES.has(x.mode as string))
    throw new TypeError(`attempt.mode must be guided, exam or own-data`);
  whole(x.seed, "attempt.seed");
  whole(x.createdAt, "attempt.createdAt");
  whole(x.updatedAt, "attempt.updatedAt");
  if (x.formatVersion !== ATTEMPT_FORMAT_VERSION) {
    throw new TypeError(
      `attempt format ${String(x.formatVersion)} is not supported (expected ${ATTEMPT_FORMAT_VERSION})`,
    );
  }
  return {
    id: x.id!,
    experimentId: x.experimentId!,
    mode: x.mode!,
    seed: x.seed!,
    createdAt: x.createdAt!,
    updatedAt: x.updatedAt!,
    formatVersion: x.formatVersion,
  };
}

/** Checks an event from outside this device, and that it belongs to the attempt. */
export function validateEvent(e: unknown, attemptId: string, index = 0): LabEvent {
  const x = e as Partial<LabEvent>;
  if (typeof x !== "object" || x === null)
    throw new TypeError(`events[${index}] must be an object`);
  text(x.id, `events[${index}].id`);
  if (x.attemptId !== attemptId) throw new TypeError(`events[${index}] belongs to another attempt`);
  whole(x.seq, `events[${index}].seq`, 1);
  text(x.device, `events[${index}].device`);
  whole(x.at, `events[${index}].at`);
  validateNewEvent(x as NewEvent, index);
  return {
    id: x.id!,
    attemptId,
    seq: x.seq!,
    device: x.device!,
    at: x.at!,
    kind: x.kind!,
    data: x.data!,
  };
}
