import { describe, expect, test } from "bun:test";
import fc from "fast-check";

import { assertJson, compareEvents, exportAttempt, importAttempt, replay, resume } from "../src";
import { benchProjection, freshDbName, newEventArb, STORE_KINDS } from "./helpers";

for (const kind of STORE_KINDS) {
  describe(`${kind.name} store`, () => {
    test("creates an attempt and lists it", async () => {
      const store = kind.open("tablet-a", freshDbName());
      const a = await store.createAttempt({
        experimentId: "simple-pendulum",
        mode: "guided",
        seed: 123456789,
      });
      expect(a).toMatchObject({
        experimentId: "simple-pendulum",
        mode: "guided",
        seed: 123456789,
        formatVersion: 1,
      });
      expect(await store.getAttempt(a.id)).toEqual(a);
      expect(
        (await store.listAttempts({ experimentId: "simple-pendulum" })).map((x) => x.id),
      ).toEqual([a.id]);
      expect(await store.listAttempts({ experimentId: "converging-lens" })).toEqual([]);
    });

    test("appends events with consecutive seqs, this device and the time", async () => {
      const store = kind.open("tablet-a", freshDbName());
      const a = await store.createAttempt({
        experimentId: "simple-pendulum",
        mode: "guided",
        seed: 1,
      });
      const first = await store.append(a.id, [{ kind: "set-length", data: { metres: 0.8 } }]);
      const more = await store.append(a.id, [
        { kind: "record-reading", data: { value: 35.9 } },
        { kind: "record-reading", data: { value: 36.0 } },
      ]);
      expect([...first, ...more].map((e) => e.seq)).toEqual([1, 2, 3]);
      expect(more.every((e) => e.device === "tablet-a" && e.attemptId === a.id)).toBe(true);
      expect((await store.events(a.id)).map((e) => e.kind)).toEqual([
        "set-length",
        "record-reading",
        "record-reading",
      ]);
      expect((await store.getAttempt(a.id))!.updatedAt).toBe(more[0]!.at);
    });

    test("lists the most recently changed attempt first", async () => {
      const store = kind.open("tablet-a", freshDbName());
      const older = await store.createAttempt({
        experimentId: "simple-pendulum",
        mode: "guided",
        seed: 1,
      });
      const newer = await store.createAttempt({
        experimentId: "simple-pendulum",
        mode: "exam",
        seed: 2,
      });
      await store.append(older.id, [{ kind: "go-to-step", data: { step: "measure" } }]);
      expect((await store.listAttempts()).map((x) => x.id)).toEqual([older.id, newer.id]);
    });

    test("refuses events that are not plain JSON, and attempts it does not hold", async () => {
      const store = kind.open("tablet-a", freshDbName());
      const a = await store.createAttempt({
        experimentId: "simple-pendulum",
        mode: "guided",
        seed: 1,
      });
      await expect(store.append(a.id, [{ kind: "x", data: { v: Number.NaN } }])).rejects.toThrow(
        TypeError,
      );
      await expect(store.append(a.id, [{ kind: "", data: null }])).rejects.toThrow(TypeError);
      await expect(store.append("no-such-attempt", [{ kind: "x", data: null }])).rejects.toThrow(
        RangeError,
      );
      expect(await store.events(a.id)).toEqual([]);
    });

    test("merging the same events twice changes nothing", async () => {
      const db = freshDbName();
      const a = kind.open("tablet-a", db);
      const b = kind.open("phone-b", db);
      const attempt = await a.createAttempt({
        experimentId: "simple-pendulum",
        mode: "guided",
        seed: 9,
      });
      await a.append(attempt.id, [{ kind: "set-length", data: { metres: 0.6 } }]);
      const events = await a.events(attempt.id);
      expect(await b.merge(attempt, events)).toBe(1);
      expect(await b.merge(attempt, events)).toBe(0);
      expect(await b.events(attempt.id)).toEqual(events);
    });

    test("exact resume: closing and reopening mid-attempt gives the same state", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(newEventArb, { maxLength: 30 }),
          fc.nat(),
          async (events, cut) => {
            const db = freshDbName();
            const split = events.length ? cut % (events.length + 1) : 0;
            const first = kind.open("tablet-a", db);
            const attempt = await first.createAttempt({
              experimentId: "simple-pendulum",
              mode: "guided",
              seed: 42,
            });
            for (const e of events.slice(0, split)) await first.append(attempt.id, [e]);
            first.close?.();

            const reopened = kind.open("tablet-a", db);
            await reopened.append(attempt.id, events.slice(split));
            const { state } = await resume(reopened, attempt.id, benchProjection);

            // The same events folded directly, as the lab would have done live.
            const live = events.reduce(
              (s, e, i) =>
                benchProjection.apply(s, {
                  ...e,
                  id: `${i}`,
                  attemptId: attempt.id,
                  seq: i + 1,
                  device: "x",
                  at: 0,
                }),
              benchProjection.initial(attempt),
            );
            expect(state).toEqual(live);
            reopened.close?.();
          },
        ),
        { numRuns: kind.name === "IndexedDB" ? 25 : 100 },
      );
    });

    test("two devices working offline converge, whatever order they swap events in", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(newEventArb, { maxLength: 12 }),
          fc.array(newEventArb, { maxLength: 12 }),
          fc.boolean(),
          async (onA, onB, bFirst) => {
            const db = freshDbName();
            const a = kind.open("tablet-a", db);
            const b = kind.open("phone-b", db);
            const attempt = await a.createAttempt({
              experimentId: "simple-pendulum",
              mode: "guided",
              seed: 7,
            });
            await b.merge(attempt, []);
            for (const e of onA) await a.append(attempt.id, [e]);
            for (const e of onB) await b.append(attempt.id, [e]);

            const aEvents = await a.events(attempt.id);
            const bEvents = await b.events(attempt.id);
            if (bFirst) {
              await a.merge(attempt, bEvents);
              await b.merge(attempt, aEvents);
            } else {
              await b.merge(attempt, aEvents);
              await a.merge(attempt, [...bEvents].reverse());
            }

            const onAState = (await resume(a, attempt.id, benchProjection)).state;
            const onBState = (await resume(b, attempt.id, benchProjection)).state;
            expect(onAState).toEqual(onBState);
            expect(await a.events(attempt.id)).toEqual(await b.events(attempt.id));
            expect(onAState.count).toBe(
              onA.length +
                onB.length -
                [...onA, ...onB].filter((e) => e.kind === "unknown-kind").length,
            );
            a.close?.();
            b.close?.();
          },
        ),
        { numRuns: kind.name === "IndexedDB" ? 20 : 100 },
      );
    });

    test("after a merge, new events go above every seq held", async () => {
      const db = freshDbName();
      const a = kind.open("tablet-a", db);
      const b = kind.open("phone-b", db);
      const attempt = await a.createAttempt({
        experimentId: "simple-pendulum",
        mode: "guided",
        seed: 3,
      });
      await a.append(
        attempt.id,
        [1, 2, 3].map((value) => ({ kind: "record-reading", data: { value } })),
      );
      await b.merge(attempt, await a.events(attempt.id));
      const [next] = await b.append(attempt.id, [{ kind: "record-reading", data: { value: 4 } }]);
      expect(next!.seq).toBe(4);
    });

    test("an attempt file round-trips to the same state, and importing twice adds nothing", async () => {
      const db = freshDbName();
      const a = kind.open("tablet-a", db);
      const attempt = await a.createAttempt({
        experimentId: "converging-lens",
        mode: "own-data",
        seed: 5,
      });
      await a.append(attempt.id, [
        { kind: "set-length", data: { metres: 0.3 } },
        { kind: "record-reading", data: { value: 15 } },
        { kind: "go-to-step", data: { step: "plot" } },
      ]);
      const file = JSON.parse(JSON.stringify(await exportAttempt(a, attempt.id)));

      const b = kind.open("phone-b", db);
      expect((await importAttempt(b, file)).added).toBe(3);
      expect((await importAttempt(b, file)).added).toBe(0);
      expect((await resume(b, attempt.id, benchProjection)).state).toEqual(
        (await resume(a, attempt.id, benchProjection)).state,
      );
    });

    test("an attempt file that is not one, or is damaged, is refused with a reason", async () => {
      const store = kind.open("tablet-a", freshDbName());
      await expect(importAttempt(store, { hello: "world" })).rejects.toThrow(
        "not a Physics Anatomy attempt",
      );
      const a = await store.createAttempt({
        experimentId: "simple-pendulum",
        mode: "guided",
        seed: 1,
      });
      await store.append(a.id, [{ kind: "x", data: null }]);
      const file = await exportAttempt(store, a.id);
      await expect(importAttempt(store, { ...file, version: 99 })).rejects.toThrow(
        "different version",
      );
      const wrongAttempt = { ...file, events: [{ ...file.events[0]!, attemptId: "someone-else" }] };
      await expect(importAttempt(store, wrongAttempt)).rejects.toThrow("another attempt");
      const badSeq = { ...file, events: [{ ...file.events[0]!, seq: 0 }] };
      await expect(importAttempt(store, badSeq)).rejects.toThrow(TypeError);
    });
  });
}

describe("replay order", () => {
  const e = (seq: number, device: string, id: string) => ({
    id,
    attemptId: "a",
    seq,
    device,
    at: 0,
    kind: "k",
    data: null,
  });

  test("by seq, then device, then id", () => {
    const events = [e(2, "a", "z"), e(1, "b", "y"), e(1, "a", "x"), e(1, "a", "w")];
    expect([...events].sort(compareEvents).map((x) => x.id)).toEqual(["w", "x", "y", "z"]);
  });

  test("replay does not depend on the order events arrive in", () => {
    fc.assert(
      fc.property(fc.array(newEventArb, { maxLength: 20 }), fc.array(fc.nat()), (news, keys) => {
        const attempt = {
          id: "a",
          experimentId: "p",
          mode: "guided" as const,
          seed: 1,
          createdAt: 0,
          updatedAt: 0,
          formatVersion: 1,
        };
        const events = news.map((n, i) => ({
          ...n,
          id: `id-${i}`,
          attemptId: "a",
          seq: i + 1,
          device: "d",
          at: 0,
        }));
        const shuffled = events
          .map((ev, i) => ({ ev, k: keys[i] ?? 0 }))
          .sort((x, y) => x.k - y.k)
          .map((x) => x.ev);
        expect(replay(benchProjection, attempt, shuffled)).toEqual(
          replay(benchProjection, attempt, events),
        );
      }),
    );
  });
});

describe("plain JSON only", () => {
  test.each([
    [undefined],
    [Number.POSITIVE_INFINITY],
    [new Date(0)],
    [() => 1],
    [{ nested: { bad: Number.NaN } }],
  ])("refuses %p", (value) => {
    expect(() => assertJson(value)).toThrow(TypeError);
  });

  test("accepts nested plain data", () => {
    expect(() => assertJson({ a: [1, "two", true, null, { b: 3.5 }] })).not.toThrow();
  });
});
