import { resolveOptions, type EventStore, type StoreOptions } from "./store";
import { ATTEMPT_FORMAT_VERSION, compareEvents, type Attempt, type LabEvent } from "./types";
import { validateAttempt, validateEvent, validateNewEvent } from "./validate";

/** An EventStore held in memory: for tests, scripted students and server-side tools. */
export function createMemoryStore(options: StoreOptions): EventStore {
  const { device, now, newId } = resolveOptions(options);
  const attempts = new Map<string, Attempt>();
  const events = new Map<string, Map<string, LabEvent>>();

  const sorted = (attemptId: string) =>
    [...(events.get(attemptId)?.values() ?? [])].sort(compareEvents);
  const copy = <T>(v: T): T => structuredClone(v);

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
      attempts.set(attempt.id, attempt);
      events.set(attempt.id, new Map());
      return copy(attempt);
    },

    async getAttempt(id) {
      const a = attempts.get(id);
      return a && copy(a);
    },

    async listAttempts(filter = {}) {
      return [...attempts.values()]
        .filter((a) => !filter.experimentId || a.experimentId === filter.experimentId)
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .map(copy);
    },

    async append(attemptId, newEvents) {
      const attempt = attempts.get(attemptId);
      if (!attempt) throw new RangeError(`no attempt ${attemptId} on this device`);
      newEvents.forEach((e, i) => validateNewEvent(e, i));
      const held = events.get(attemptId)!;
      let seq = Math.max(0, ...[...held.values()].map((e) => e.seq));
      const t = now();
      const stored = newEvents.map((e): LabEvent => ({
        id: newId(),
        attemptId,
        seq: ++seq,
        device,
        at: t,
        kind: e.kind,
        data: copy(e.data),
      }));
      for (const e of stored) held.set(e.id, e);
      if (stored.length) attempt.updatedAt = Math.max(attempt.updatedAt, t);
      return stored.map(copy);
    },

    async events(attemptId) {
      return sorted(attemptId).map(copy);
    },

    async merge(incoming, incomingEvents) {
      const header = validateAttempt(incoming);
      const checked = incomingEvents.map((e, i) => validateEvent(e, header.id, i));
      const existing = attempts.get(header.id);
      if (existing && existing.experimentId !== header.experimentId) {
        throw new RangeError(`attempt ${header.id} is a different experiment on this device`);
      }
      if (!existing) {
        attempts.set(header.id, copy(header));
        events.set(header.id, new Map());
      }
      const attempt = attempts.get(header.id)!;
      const held = events.get(header.id)!;
      let added = 0;
      for (const e of checked) {
        if (held.has(e.id)) continue;
        held.set(e.id, copy(e));
        attempt.updatedAt = Math.max(attempt.updatedAt, e.at);
        added++;
      }
      return added;
    },
  };
}
