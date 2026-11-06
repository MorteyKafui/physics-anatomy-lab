import type { Attempt, AttemptMode, LabEvent, NewEvent } from "./types";

/**
 * Where attempts and their events live. The lab uses IndexedDB (indexeddb-store.ts) so it works
 * offline; tests and the server-side tools use the in-memory store. Both pass the same contract
 * tests (test/store-contract.ts).
 */
export interface EventStore {
  /** Start an attempt. */
  createAttempt(input: { experimentId: string; mode: AttemptMode; seed: number }): Promise<Attempt>;
  getAttempt(id: string): Promise<Attempt | undefined>;
  /** Attempts on this device, most recently changed first. */
  listAttempts(filter?: { experimentId?: string }): Promise<Attempt[]>;
  /**
   * Record events in this attempt, in order. They get ids, consecutive seqs above the highest
   * already held, this device's id and the time. Returns them as stored.
   */
  append(attemptId: string, events: readonly NewEvent[]): Promise<LabEvent[]>;
  /** Every event in the attempt, in replay order (compareEvents). */
  events(attemptId: string): Promise<LabEvent[]>;
  /**
   * Add events recorded elsewhere (sync, an imported attempt file), keeping their ids, seqs and
   * devices. Events already held are skipped, so merging the same events twice changes nothing.
   * Returns how many were new.
   */
  merge(attempt: Attempt, events: readonly LabEvent[]): Promise<number>;
}

export interface StoreOptions {
  /** This device's id. */
  device: string;
  /** Wall clock, ms since 1970. Defaults to Date.now; tests pass a fake. */
  now?: () => number;
  /** New unique ids. Defaults to crypto.randomUUID. */
  newId?: () => string;
}

export function resolveOptions(o: StoreOptions): Required<StoreOptions> {
  if (!o.device) throw new RangeError("a store needs this device's id");
  return {
    device: o.device,
    now: o.now ?? (() => Date.now()),
    newId: o.newId ?? (() => globalThis.crypto.randomUUID()),
  };
}

/** A device id for a new install: random, so it identifies the device's copy, never the person. */
export function newDeviceId(): string {
  return globalThis.crypto.randomUUID();
}
