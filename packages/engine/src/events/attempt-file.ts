import type { EventStore } from "./store";
import { ATTEMPT_FORMAT_VERSION, type Attempt, type LabEvent } from "./types";
import { validateAttempt, validateEvent } from "./validate";

/**
 * An attempt saved to a file, so a student can move it to another device with no account, or
 * hand it in. It holds the attempt and every event, so the receiver rebuilds the same state.
 */
export const ATTEMPT_FILE_FORMAT = "physics-anatomy/attempt";

export interface AttemptFile {
  format: typeof ATTEMPT_FILE_FORMAT;
  version: number;
  attempt: Attempt;
  events: LabEvent[];
}

export async function exportAttempt(store: EventStore, attemptId: string): Promise<AttemptFile> {
  const attempt = await store.getAttempt(attemptId);
  if (!attempt) throw new RangeError(`no attempt ${attemptId} on this device`);
  return toAttemptFile(attempt, await store.events(attemptId));
}

/** The attempt file for an attempt and its events already in hand (the notebook's ZIP). */
export function toAttemptFile(attempt: Attempt, events: readonly LabEvent[]): AttemptFile {
  return {
    format: ATTEMPT_FILE_FORMAT,
    version: ATTEMPT_FORMAT_VERSION,
    attempt,
    events: [...events],
  };
}

/**
 * Read an attempt file (already parsed from JSON) and merge it into the store. Importing the
 * same file twice changes nothing. Throws a TypeError naming the problem if the file is not one.
 */
export async function importAttempt(
  store: EventStore,
  file: unknown,
): Promise<{ attempt: Attempt; added: number }> {
  const f = file as Partial<AttemptFile>;
  if (typeof f !== "object" || f === null || f.format !== ATTEMPT_FILE_FORMAT) {
    throw new TypeError("This file is not a Physics Anatomy attempt.");
  }
  if (f.version !== ATTEMPT_FORMAT_VERSION) {
    throw new TypeError(
      `This attempt was saved by a different version (format ${String(f.version)}).`,
    );
  }
  if (!Array.isArray(f.events)) throw new TypeError("This attempt file has no events.");
  const attempt = validateAttempt(f.attempt);
  const events = f.events.map((e, i) => validateEvent(e, attempt.id, i));
  const added = await store.merge(attempt, events);
  return { attempt, added };
}
