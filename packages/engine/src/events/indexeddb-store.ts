import Dexie, { type EntityTable } from "dexie";

import { resolveOptions, type EventStore, type StoreOptions } from "./store";
import { ATTEMPT_FORMAT_VERSION, compareEvents, type Attempt, type LabEvent } from "./types";
import { validateAttempt, validateEvent, validateNewEvent } from "./validate";

class LabDatabase extends Dexie {
  attempts!: EntityTable<Attempt, "id">;
  events!: EntityTable<LabEvent, "id">;

  constructor(name: string, deps?: { indexedDB: IDBFactory; IDBKeyRange: typeof IDBKeyRange }) {
    super(name, deps);
    this.version(1).stores({
      attempts: "&id, experimentId, updatedAt",
      events: "&id, attemptId, [attemptId+seq]",
    });
  }
}

export interface IndexedDbStoreOptions extends StoreOptions {
  /** Database name. One per installed app; tests use a fresh name each. */
  name?: string;
  /** For tests outside a browser (fake-indexeddb). The browser's own are used otherwise. */
  indexedDB?: IDBFactory;
  IDBKeyRange?: typeof IDBKeyRange;
}

/**
 * The lab's store: attempts and events in the device's IndexedDB, so everything works offline
 * (AGENTS.md rule 5). Each append runs in one transaction, so two tabs appending to one attempt
 * never hand out the same seq.
 */
export function createIndexedDbStore(
  options: IndexedDbStoreOptions,
): EventStore & { close(): void } {
  const { device, now, newId } = resolveOptions(options);
  const deps =
    options.indexedDB && options.IDBKeyRange
      ? { indexedDB: options.indexedDB, IDBKeyRange: options.IDBKeyRange }
      : undefined;
  const db = new LabDatabase(options.name ?? "physics-anatomy", deps);

  const highestSeq = async (attemptId: string) => {
    const last = await db.events
      .where("[attemptId+seq]")
      .between([attemptId, Dexie.minKey], [attemptId, Dexie.maxKey])
      .last();
    return last?.seq ?? 0;
  };

  return {
    async createAttempt({ experimentId, mode, seed }) {
      const t = now();
      const attempt = validateAttempt({
        id: newId(),
        experimentId,
        mode,
        seed,
        createdAt: t,
        updatedAt: t,
        formatVersion: ATTEMPT_FORMAT_VERSION,
      });
      await db.attempts.add(attempt);
      return attempt;
    },

    getAttempt: (id) => db.attempts.get(id),

    async listAttempts(filter = {}) {
      const all = filter.experimentId
        ? await db.attempts.where("experimentId").equals(filter.experimentId).toArray()
        : await db.attempts.toArray();
      return all.sort((a, b) => b.updatedAt - a.updatedAt);
    },

    async append(attemptId, newEvents) {
      newEvents.forEach((e, i) => validateNewEvent(e, i));
      return db.transaction("rw", db.attempts, db.events, async () => {
        const attempt = await db.attempts.get(attemptId);
        if (!attempt) throw new RangeError(`no attempt ${attemptId} on this device`);
        let seq = await highestSeq(attemptId);
        const t = now();
        const stored = newEvents.map((e): LabEvent => ({
          id: newId(),
          attemptId,
          seq: ++seq,
          device,
          at: t,
          kind: e.kind,
          data: e.data,
        }));
        await db.events.bulkAdd(stored);
        if (stored.length)
          await db.attempts.update(attemptId, { updatedAt: Math.max(attempt.updatedAt, t) });
        return stored;
      });
    },

    async events(attemptId) {
      const all = await db.events.where("attemptId").equals(attemptId).toArray();
      return all.sort(compareEvents);
    },

    async merge(incoming, incomingEvents) {
      const header = validateAttempt(incoming);
      const checked = incomingEvents.map((e, i) => validateEvent(e, header.id, i));
      return db.transaction("rw", db.attempts, db.events, async () => {
        const existing = await db.attempts.get(header.id);
        if (existing && existing.experimentId !== header.experimentId) {
          throw new RangeError(`attempt ${header.id} is a different experiment on this device`);
        }
        const held = await db.events.bulkGet(checked.map((e) => e.id));
        const fresh = checked.filter((_, i) => held[i] === undefined);
        // The same id twice within one batch counts once.
        const unique = [...new Map(fresh.map((e) => [e.id, e])).values()];
        await db.events.bulkAdd(unique);
        const latest = Math.max(
          existing?.updatedAt ?? header.updatedAt,
          ...unique.map((e) => e.at),
        );
        if (existing) await db.attempts.update(header.id, { updatedAt: latest });
        else await db.attempts.add({ ...header, updatedAt: latest });
        return unique.length;
      });
    },

    close: () => db.close(),
  };
}
