import type { EventStore } from "./store";
import { compareEvents, type Attempt, type LabEvent } from "./types";

/**
 * How one view of an attempt is rebuilt from its events: the bench, the table, the step the
 * student is on. A projection is a pure fold, so the same events always give the same state;
 * that is what makes resume exact.
 */
export interface Projection<S> {
  /** The state before any event, for this attempt. */
  initial(attempt: Attempt): S;
  /** The state after one more event. Must not mutate `state`, and ignores kinds it does not know. */
  apply(state: S, event: LabEvent): S;
}

/** Fold events in replay order. */
export function replay<S>(
  projection: Projection<S>,
  attempt: Attempt,
  events: readonly LabEvent[],
): S {
  return [...events]
    .sort(compareEvents)
    .reduce((s, e) => projection.apply(s, e), projection.initial(attempt));
}

/** Everything needed to carry on an attempt exactly where it was left. */
export interface Resumed<S> {
  attempt: Attempt;
  state: S;
  /** The events, in replay order, for replays and the log. */
  events: LabEvent[];
}

/** Load an attempt from the store and rebuild its state. */
export async function resume<S>(
  store: EventStore,
  attemptId: string,
  projection: Projection<S>,
): Promise<Resumed<S>> {
  const attempt = await store.getAttempt(attemptId);
  if (!attempt) throw new RangeError(`no attempt ${attemptId} on this device`);
  const events = await store.events(attemptId);
  return { attempt, state: replay(projection, attempt, events), events };
}
