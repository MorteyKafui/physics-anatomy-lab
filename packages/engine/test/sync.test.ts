import { describe, expect, test } from "bun:test";
import { IDBKeyRange, indexedDB } from "fake-indexeddb";

import {
  adopt,
  batchesOf,
  createIndexedDbHoldings,
  createMemoryHoldings,
  createMemoryStore,
  HeldElsewhereError,
  PUSH_MAX_ATTEMPTS,
  PUSH_MAX_EVENTS,
  syncAccount,
  unheldAttempts,
  type Attempt,
  type EventStore,
  type Holdings,
  type LabEvent,
  type PullPage,
  type PushBatch,
  type Reply,
  type SyncTransport,
} from "../src";
import { freshDbName, testOptions } from "./helpers";

/** The server's push and pull (ADR 0039), in memory: one copy of each attempt per account. */
function fakeServer(pageSize = 3) {
  const attempts = new Map<string, Map<string, Attempt>>();
  const log: { account: string; event: LabEvent }[] = [];
  let online = true;
  const offline = { ok: false as const, status: 0, detail: "offline" };
  const transportFor = (account: string, onPull?: () => Promise<void>): SyncTransport => ({
    push(batches: PushBatch[]): Promise<Reply<unknown>> {
      if (!online) return Promise.resolve(offline);
      expect(batches.length).toBeLessThanOrEqual(PUSH_MAX_ATTEMPTS);
      const mine = attempts.get(account) ?? new Map<string, Attempt>();
      attempts.set(account, mine);
      for (const { attempt, events } of batches) {
        const held = mine.get(attempt.id);
        mine.set(attempt.id, {
          ...attempt,
          updatedAt: Math.max(attempt.updatedAt, held?.updatedAt ?? 0),
        });
        for (const event of events) {
          const known = log.some((l) => l.account === account && l.event.id === event.id);
          if (!known) log.push({ account, event: structuredClone(event) });
        }
      }
      return Promise.resolve({ ok: true, data: {} });
    },
    async pull(after: string | null): Promise<Reply<PullPage>> {
      if (!online) return offline;
      await onPull?.();
      const mine = log
        .map((l, pos) => ({ ...l, pos }))
        .filter((l) => l.account === account && l.pos >= Number(after ?? 0));
      const page = mine.slice(0, pageSize);
      const ids = new Set(page.map((p) => p.event.attemptId));
      const next = page.length > 0 ? page[page.length - 1]!.pos + 1 : Number(after ?? 0);
      return {
        ok: true,
        data: {
          attempts: [...(attempts.get(account)?.values() ?? [])].filter((a) => ids.has(a.id)),
          events: page.map((p) => structuredClone(p.event)),
          cursor: String(next),
          more: mine.length > pageSize,
        },
      };
    },
  });
  return {
    transportFor,
    setOnline: (value: boolean) => (online = value),
    count: (account: string) => log.filter((l) => l.account === account).length,
  };
}

async function attemptWith(store: EventStore, n: number): Promise<Attempt> {
  const attempt = await store.createAttempt({
    experimentId: "simple-pendulum",
    mode: "guided",
    seed: 11,
  });
  await store.append(
    attempt.id,
    Array.from({ length: n }, (_, i) => ({ kind: "set-length", data: { length: 0.5 + i / 10 } })),
  );
  return attempt;
}

/** The error a promise rejects with (Dexie's promises are not native, so no expect().rejects). */
async function refusal(p: PromiseLike<unknown>): Promise<unknown> {
  try {
    await p;
  } catch (error) {
    return error;
  }
  throw new Error("expected a refusal");
}

const ids = (events: LabEvent[]) => events.map((e) => e.id).sort();

describe("sync", () => {
  test("two devices of one account end with the same events", async () => {
    const server = fakeServer();
    const phone = createMemoryStore(testOptions("phone"));
    const laptop = createMemoryStore(testOptions("laptop"));
    const phoneHoldings = createMemoryHoldings();
    const laptopHoldings = createMemoryHoldings();
    const a = await attemptWith(phone, 4);
    await adopt(phoneHoldings, "member:kofi", [a.id]);

    const first = await syncAccount({
      store: phone,
      holdings: phoneHoldings,
      account: "member:kofi",
      transport: server.transportFor("member:kofi"),
    });
    expect(first.pushed).toBe(1);

    const onLaptop = await syncAccount({
      store: laptop,
      holdings: laptopHoldings,
      account: "member:kofi",
      transport: server.transportFor("member:kofi"),
    });
    expect(onLaptop.pulled).toBe(4);
    expect(ids(await laptop.events(a.id))).toEqual(ids(await phone.events(a.id)));

    // Both record offline, then sync: neither loses anything.
    await laptop.append(a.id, [{ kind: "start-stopwatch", data: null }]);
    await phone.append(a.id, [{ kind: "stop-stopwatch", data: null }]);
    for (const [store, holdings] of [
      [laptop, laptopHoldings],
      [phone, phoneHoldings],
      [laptop, laptopHoldings],
    ] as const) {
      await syncAccount({
        store,
        holdings,
        account: "member:kofi",
        transport: server.transportFor("member:kofi"),
      });
    }
    expect((await phone.events(a.id)).length).toBe(6);
    expect(ids(await laptop.events(a.id))).toEqual(ids(await phone.events(a.id)));
    expect(server.count("member:kofi")).toBe(6);
  });

  test("signed-out work is adopted only when chosen", async () => {
    const store = createMemoryStore(testOptions("school-pc"));
    const holdings = createMemoryHoldings();
    const earlierPupil = await attemptWith(store, 2);
    const mine = await attemptWith(store, 2);
    expect((await unheldAttempts(store, holdings)).map((a) => a.id).sort()).toEqual(
      [earlierPupil.id, mine.id].sort(),
    );
    await adopt(holdings, "member:ama", [mine.id]);
    expect((await unheldAttempts(store, holdings)).map((a) => a.id)).toEqual([earlierPupil.id]);

    const server = fakeServer();
    await syncAccount({
      store,
      holdings,
      account: "member:ama",
      transport: server.transportFor("member:ama"),
    });
    expect(server.count("member:ama")).toBe(2); // only the adopted attempt went up
  });

  test("an attempt held by one account is never given to another", async () => {
    const holdings = createMemoryHoldings();
    await holdings.hold("a-1", "member:kofi");
    expect(await refusal(adopt(holdings, "member:ama", ["a-1"]))).toBeInstanceOf(
      HeldElsewhereError,
    );
  });

  test("going offline stops the sync safely, and the next one carries on", async () => {
    const server = fakeServer();
    const store = createMemoryStore(testOptions("phone"));
    const holdings = createMemoryHoldings();
    const a = await attemptWith(store, 3);
    await adopt(holdings, "teacher:t", [a.id]);
    server.setOnline(false);
    const offline = await syncAccount({
      store,
      holdings,
      account: "teacher:t",
      transport: server.transportFor("teacher:t"),
    });
    expect(offline.stopped?.status).toBe(0);
    expect(server.count("teacher:t")).toBe(0);
    server.setOnline(true);
    const online = await syncAccount({
      store,
      holdings,
      account: "teacher:t",
      transport: server.transportFor("teacher:t"),
    });
    expect(online.stopped).toBeUndefined();
    expect(server.count("teacher:t")).toBe(3);
  });

  test("an event recorded while a sync runs still goes up next time", async () => {
    const server = fakeServer();
    const store = createMemoryStore(testOptions("phone"));
    const holdings = createMemoryHoldings();
    const a = await attemptWith(store, 2);
    await adopt(holdings, "teacher:t", [a.id]);
    let once = true;
    const transport = server.transportFor("teacher:t", async () => {
      if (once) await store.append(a.id, [{ kind: "record-reading", data: { t: 35.9 } }]);
      once = false;
    });
    await syncAccount({ store, holdings, account: "teacher:t", transport });
    expect(server.count("teacher:t")).toBe(2);
    await syncAccount({ store, holdings, account: "teacher:t", transport });
    expect(server.count("teacher:t")).toBe(3);
  });

  test("pulls page through the cursor and keep it", async () => {
    const server = fakeServer(2);
    const phone = createMemoryStore(testOptions("phone"));
    const phoneHoldings = createMemoryHoldings();
    const a = await attemptWith(phone, 5);
    await adopt(phoneHoldings, "member:kofi", [a.id]);
    await syncAccount({
      store: phone,
      holdings: phoneHoldings,
      account: "member:kofi",
      transport: server.transportFor("member:kofi"),
    });

    const laptop = createMemoryStore(testOptions("laptop"));
    const laptopHoldings = createMemoryHoldings();
    const pulled = await syncAccount({
      store: laptop,
      holdings: laptopHoldings,
      account: "member:kofi",
      transport: server.transportFor("member:kofi"),
    });
    expect(pulled.pulled).toBe(5);
    expect(await laptopHoldings.cursor("member:kofi")).toBe("5");
    const again = await syncAccount({
      store: laptop,
      holdings: laptopHoldings,
      account: "member:kofi",
      transport: server.transportFor("member:kofi"),
    });
    expect(again.pulled).toBe(0);
  });

  test("pushes keep within the server's limits", async () => {
    const header = (id: string): Attempt => ({
      id,
      experimentId: "simple-pendulum",
      mode: "guided",
      seed: 1,
      createdAt: 1,
      updatedAt: 1,
      formatVersion: 1,
    });
    const events = (id: string, n: number) =>
      Array.from({ length: n }, (_, i) => ({
        id: `${id}-${i}`,
        attemptId: id,
        seq: i + 1,
        device: "d",
        at: 1,
        kind: "k",
        data: null,
      }));
    const changed: PushBatch[] = [
      ...Array.from({ length: 25 }, (_, i) => ({
        attempt: header(`a${i}`),
        events: events(`a${i}`, 10),
      })),
      { attempt: header("long"), events: events("long", PUSH_MAX_EVENTS * 2 + 5) },
    ];
    const batches = batchesOf(changed);
    for (const batch of batches) {
      expect(batch.length).toBeLessThanOrEqual(PUSH_MAX_ATTEMPTS);
      expect(batch.reduce((n, b) => n + b.events.length, 0)).toBeLessThanOrEqual(PUSH_MAX_EVENTS);
      expect(new Set(batch.map((b) => b.attempt.id)).size).toBe(batch.length);
    }
    const sent = batches.flat().reduce((n, b) => n + b.events.length, 0);
    expect(sent).toBe(25 * 10 + PUSH_MAX_EVENTS * 2 + 5);
  });
});

describe.each([
  ["memory", () => createMemoryHoldings()],
  [
    "IndexedDB",
    (): Holdings => createIndexedDbHoldings({ name: freshDbName(), indexedDB, IDBKeyRange }),
  ],
] as const)("holdings (%s)", (_, open) => {
  test("keep holders, push marks and cursors per account", async () => {
    const h = open();
    expect(await h.holder("a-1")).toBeUndefined();
    await h.hold("a-1", "member:kofi");
    await h.hold("a-1", "member:kofi"); // holding twice is fine
    expect(await refusal(h.hold("a-1", "teacher:t"))).toBeInstanceOf(HeldElsewhereError);
    expect(await h.heldBy("member:kofi")).toEqual(["a-1"]);
    expect(await h.pushedCount("member:kofi", "a-1")).toBe(0);
    await h.setPushedCount("member:kofi", "a-1", 42);
    expect(await h.pushedCount("member:kofi", "a-1")).toBe(42);
    expect(await h.cursor("member:kofi")).toBeNull();
    await h.setCursor("member:kofi", "17");
    expect(await h.cursor("member:kofi")).toBe("17");
    expect(await h.cursor("teacher:t")).toBeNull();
  });
});
