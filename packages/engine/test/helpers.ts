import { IDBKeyRange, indexedDB } from "fake-indexeddb";
import fc from "fast-check";

import {
  createIndexedDbStore,
  createMemoryStore,
  type EventStore,
  type LabEvent,
  type NewEvent,
  type Projection,
} from "../src";

let counter = 0;

/** Deterministic ids and a ticking clock, so tests can compare whole events. */
export function testOptions(device: string) {
  let t = 1_800_000_000_000;
  return {
    device,
    now: () => (t += 1000),
    newId: () => `${device}-${(++counter).toString().padStart(6, "0")}`,
  };
}

export interface StoreKind {
  name: string;
  /** A store; calling again with the same name reopens the same data (a restart). */
  open(device: string, dbName: string): EventStore & { close?(): void };
}

export const STORE_KINDS: StoreKind[] = [
  {
    name: "memory",
    open: (() => {
      const stores = new Map<string, EventStore>();
      return (device: string, dbName: string) => {
        const key = `${dbName}:${device}`;
        if (!stores.has(key)) stores.set(key, createMemoryStore(testOptions(device)));
        return stores.get(key)!;
      };
    })(),
  },
  {
    name: "IndexedDB",
    open: (device, dbName) =>
      createIndexedDbStore({
        ...testOptions(device),
        name: `${dbName}:${device}`,
        indexedDB,
        IDBKeyRange,
      }),
  },
];

let dbCounter = 0;
export const freshDbName = () => `test-db-${++dbCounter}`;

/**
 * A toy bench whose state depends on event order: readings are removed by position, so replaying
 * in the wrong order gives a different table. Good at catching ordering bugs.
 */
export interface Bench {
  experimentId: string;
  length: number | null;
  readings: number[];
  step: string;
  count: number;
}

export const benchProjection: Projection<Bench> = {
  initial: (attempt) => ({
    experimentId: attempt.experimentId,
    length: null,
    readings: [],
    step: "question",
    count: 0,
  }),
  apply(s, e: LabEvent) {
    const d = e.data as Record<string, unknown>;
    switch (e.kind) {
      case "set-length":
        return { ...s, length: d.metres as number, count: s.count + 1 };
      case "record-reading":
        return { ...s, readings: [...s.readings, d.value as number], count: s.count + 1 };
      case "delete-reading":
        return { ...s, readings: s.readings.filter((_, i) => i !== d.index), count: s.count + 1 };
      case "go-to-step":
        return { ...s, step: d.step as string, count: s.count + 1 };
      default:
        return s;
    }
  },
};

export const newEventArb: fc.Arbitrary<NewEvent> = fc.oneof(
  fc
    .double({ min: 0.1, max: 2, noNaN: true })
    .map((metres) => ({ kind: "set-length", data: { metres } })),
  fc
    .double({ min: 0, max: 100, noNaN: true })
    .map((value) => ({ kind: "record-reading", data: { value } })),
  fc.integer({ min: 0, max: 5 }).map((index) => ({ kind: "delete-reading", data: { index } })),
  fc
    .constantFrom("measure", "tabulate", "plot")
    .map((step) => ({ kind: "go-to-step", data: { step } })),
  fc.constant({ kind: "unknown-kind", data: { ignored: true } }),
);
