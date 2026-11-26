import { describe, expect, test } from "bun:test";

import {
  browserOptedOut,
  createUsage,
  deviceClass,
  localDate,
  MAX_AGE_MS,
  MAX_BATCH,
  MAX_QUEUE,
  usageFromLabEvents,
  type KeyValue,
  type UsageEnvironment,
  type UsageEvent,
} from "../src/index";

function fakeStorage(): KeyValue & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

/** A device: its clock, its storage and what it has sent. */
function device(overrides: Partial<UsageEnvironment> = {}) {
  const clock = { now: new Date(2026, 10, 26, 9, 0) };
  const storage = fakeStorage();
  const sent: { url: string; events: UsageEvent[] }[] = [];
  const state = { online: true, optedOut: false, accept: true, width: 1440 };
  let counter = 0;
  const bodies: Promise<void>[] = [];
  const env: UsageEnvironment = {
    storage,
    now: () => clock.now,
    randomBytes: (n) => new Uint8Array(n).fill(++counter),
    send: (url, body) => {
      if (!state.accept) return false;
      bodies.push(
        body.text().then((t) => {
          sent.push({ url, events: (JSON.parse(t) as { events: UsageEvent[] }).events });
        }),
      );
      return true;
    },
    online: () => state.online,
    optedOut: () => state.optedOut,
    screenWidth: () => state.width,
    setTimer: () => 0,
    clearTimer: () => undefined,
    ...overrides,
  };
  const usage = createUsage({ endpoint: "/api/usage/events", appVersion: "1.2.0" }, env);
  const delivered = async () => {
    await Promise.all(bodies);
    return sent;
  };
  return { usage, clock, storage, state, delivered };
}

const view = { name: "experiment_viewed", experimentId: "simple-pendulum", mode: "guided" } as const;

describe("the day's id", () => {
  test("is 128 random bits, kept for the day and replaced the next local day", () => {
    const d = device();
    d.usage.track(view);
    d.usage.track(view);
    d.clock.now = new Date(2026, 10, 26, 23, 59);
    d.usage.track(view);
    d.clock.now = new Date(2026, 10, 27, 0, 1);
    d.usage.track(view);
    const ids = d.usage.queued().map((e) => e.dayId);
    expect(ids[0]).toMatch(/^[0-9a-f]{32}$/);
    expect(ids[1]).toBe(ids[0]!);
    expect(ids[2]).toBe(ids[0]!);
    expect(ids[3]).not.toBe(ids[0]!);
    // The old id is forgotten: only today's is kept, and no cookie is involved.
    const kept = JSON.parse(d.storage.data.get("pa:usage:day")!) as { date: string; id: string };
    expect(kept).toEqual({ date: "2026-11-27", id: ids[3]! });
    expect(JSON.stringify([...d.storage.data.values()])).not.toContain(`"id":"${ids[0]!}"`);
  });

  test("uses the device's local date", () => {
    expect(localDate(new Date(2026, 0, 5, 23, 30))).toBe("2026-01-05");
  });
});

describe("what an event carries", () => {
  test("only the fields ADR 0048 allows", () => {
    const d = device();
    d.usage.track({ ...view, name: "stage_completed", step: "measure" });
    d.usage.track({ ...view, name: "report_exported", format: "pdf" });
    const [stage, exported] = d.usage.queued();
    expect(Object.keys(stage!).sort()).toEqual(
      ["appVersion", "dayId", "device", "experimentId", "mode", "name", "step"].sort(),
    );
    expect(exported).toMatchObject({ format: "pdf", device: "desktop", appVersion: "1.2.0" });
    expect(exported).not.toHaveProperty("step");
  });

  test("a what-if attempt sends no mode; a bad step, format or experiment sends nothing", () => {
    const d = device();
    d.usage.track({ ...view, mode: "what-if" });
    d.usage.track({ ...view, name: "stage_completed", step: "lunch" });
    d.usage.track({ ...view, name: "stage_completed" });
    d.usage.track({ ...view, name: "report_exported" });
    d.usage.track({ ...view, experimentId: "Ama's pendulum" });
    const queued = d.usage.queued();
    expect(queued).toHaveLength(1);
    expect(queued[0]).not.toHaveProperty("mode");
  });

  test("the device class comes from the screen width", () => {
    expect([360, 820, 1440].map(deviceClass)).toEqual(["phone", "tablet", "desktop"]);
  });
});

describe("the queue", () => {
  test("holds at most 200, dropping the oldest", () => {
    const d = device();
    d.state.online = false;
    for (let i = 0; i < MAX_QUEUE + 30; i++) {
      d.clock.now = new Date(2026, 10, 26, 9, 0, i);
      d.usage.track({ ...view, name: "stage_completed", step: i < 30 ? "question" : "measure" });
    }
    const queued = d.usage.queued();
    expect(queued).toHaveLength(MAX_QUEUE);
    expect(queued.every((e) => e.step === "measure")).toBe(true);
  });

  test("drops what was not sent within three days", () => {
    const d = device();
    d.state.online = false;
    d.usage.track(view);
    d.clock.now = new Date(d.clock.now.getTime() + MAX_AGE_MS - 60_000);
    d.usage.track(view);
    expect(d.usage.queued()).toHaveLength(2);
    d.clock.now = new Date(d.clock.now.getTime() + 2 * 60_000);
    expect(d.usage.queued()).toHaveLength(1);
  });

  test("a failed send stays queued", () => {
    const d = device();
    d.state.accept = false;
    d.usage.track(view);
    d.usage.flush();
    expect(d.usage.queued()).toHaveLength(1);
  });
});

describe("sending", () => {
  test("in batches of up to 50, only when online", async () => {
    const d = device();
    d.state.online = false;
    for (let i = 0; i < 120; i++) d.usage.track(view);
    d.usage.flush();
    expect(await d.delivered()).toHaveLength(0);
    d.state.online = true;
    d.usage.flush();
    const sent = await d.delivered();
    expect(sent.map((s) => s.events.length)).toEqual([MAX_BATCH, MAX_BATCH, 20]);
    expect(sent.every((s) => s.url === "/api/usage/events")).toBe(true);
    expect(d.usage.queued()).toHaveLength(0);
  });

  test("50 waiting events are sent without waiting for the page to hide", async () => {
    const d = device();
    for (let i = 0; i < MAX_BATCH; i++) d.usage.track(view);
    expect((await d.delivered()).map((s) => s.events.length)).toEqual([MAX_BATCH]);
  });

  test("Do Not Track or Global Privacy Control sends nothing and keeps nothing", async () => {
    const d = device();
    d.state.online = false;
    d.usage.track(view);
    d.state.optedOut = true;
    d.state.online = true;
    for (let i = 0; i < 60; i++) d.usage.track(view);
    d.usage.flush();
    expect(await d.delivered()).toHaveLength(0);
    expect(d.usage.queued()).toHaveLength(0);
    expect(d.storage.data.has("pa:usage:queue")).toBe(false);
  });

  test("the browser's signals are read as opting out", () => {
    expect(browserOptedOut({ doNotTrack: "1" }, {})).toBe(true);
    expect(browserOptedOut({ globalPrivacyControl: true }, {})).toBe(true);
    expect(browserOptedOut({}, { doNotTrack: "1" })).toBe(true);
    expect(browserOptedOut({ doNotTrack: "0", globalPrivacyControl: false }, {})).toBe(false);
  });
});

describe("never in the lab's way", () => {
  test("storage that throws, a beacon that throws: nothing reaches the caller", () => {
    const broken: KeyValue = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("quota");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    };
    const d = device({
      storage: broken,
      send: () => {
        throw new Error("no beacon");
      },
    });
    expect(() => {
      d.usage.track(view);
      d.usage.flush();
    }).not.toThrow();
    // Kept in memory for the page instead.
    expect(d.usage.queued()).toHaveLength(1);
  });

  test("a corrupt queue is started again", () => {
    const d = device();
    d.storage.data.set("pa:usage:queue", "{not json");
    d.usage.track(view);
    expect(d.usage.queued()).toHaveLength(1);
  });
});

describe("the lab's events", () => {
  test("a finished step, a hint and a finished attempt", () => {
    const attempt = { experimentId: "simple-pendulum", mode: "exam" };
    const inputs = usageFromLabEvents(attempt, [
      { kind: "step.complete", data: { step: "measure" } },
      { kind: "coach.hint", data: {} },
      { kind: "coach.note", data: {} },
      { kind: "table.cell", data: { value: 1.23 } },
      { kind: "step.complete", data: { step: "report" } },
      { kind: "exam.hand-in", data: {} },
    ]);
    expect(inputs.map((i) => [i.name, i.step])).toEqual([
      ["stage_completed", "measure"],
      ["hint_shown", undefined],
      ["stage_completed", "report"],
      ["attempt_completed", undefined],
      ["attempt_completed", undefined],
    ]);
    expect(inputs.every((i) => i.mode === "exam")).toBe(true);
  });
});
