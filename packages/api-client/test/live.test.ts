import { describe, expect, test } from "bun:test";

import {
  LiveSocket,
  liveSocketUrl,
  StudentLive,
  type BenchSummary,
  type Clock,
  type SocketLike,
  type StudentFrame,
} from "../src";

class FakeSocket implements SocketLike {
  readyState = 0;
  sent: unknown[] = [];
  closedWith: number | undefined;
  onopen: ((event: unknown) => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onclose: ((event: { code: number }) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  send(data: string) {
    this.sent.push(JSON.parse(data));
  }
  close(code?: number) {
    this.closedWith = code;
  }
  open() {
    this.readyState = 1;
    this.onopen?.({});
  }
  receive(frame: object) {
    this.onmessage?.({ data: JSON.stringify(frame) });
  }
  drop(code: number) {
    this.readyState = 3;
    this.onclose?.({ code });
  }
}

/** A clock that only moves when told to. */
class FakeClock implements Clock {
  time = 0;
  private timers: { at: number; fn: () => void; every?: number; id: number }[] = [];
  private next = 1;
  setTimeout(fn: () => void, ms: number) {
    const id = this.next++;
    this.timers.push({ at: this.time + ms, fn, id });
    return id;
  }
  clearTimeout(id: unknown) {
    this.timers = this.timers.filter((t) => t.id !== id);
  }
  setInterval(fn: () => void, ms: number) {
    const id = this.next++;
    this.timers.push({ at: this.time + ms, fn, every: ms, id });
    return id;
  }
  clearInterval(id: unknown) {
    this.clearTimeout(id);
  }
  now() {
    return this.time;
  }
  random() {
    return 0.5;
  }
  advance(ms: number) {
    const end = this.time + ms;
    for (;;) {
      const due = this.timers.filter((t) => t.at <= end).sort((a, b) => a.at - b.at)[0];
      if (due === undefined) break;
      this.time = due.at;
      if (due.every === undefined) this.timers = this.timers.filter((t) => t !== due);
      else due.at += due.every;
      due.fn();
    }
    this.time = end;
  }
}

function setup() {
  const sockets: FakeSocket[] = [];
  const clock = new FakeClock();
  const factory = () => {
    const s = new FakeSocket();
    sockets.push(s);
    return s;
  };
  return { sockets, clock, factory };
}

const summary = (readings: number): BenchSummary => ({
  attempt_id: "a-1",
  experiment_id: "simple-pendulum",
  step: "measure",
  completed: ["question"],
  mistakes: [],
  readings,
});

describe("live socket", () => {
  test("builds the socket URL on the page's origin", () => {
    expect(liveSocketUrl("/live/student", { protocol: "https:", host: "lab.example" })).toBe(
      "wss://lab.example/api/live/student",
    );
    expect(liveSocketUrl("/live/student", { protocol: "http:", host: "localhost:3000" })).toBe(
      "ws://localhost:3000/api/live/student",
    );
  });

  test("reconnects with a growing wait, and gives up when signed out", () => {
    const { sockets, clock, factory } = setup();
    const statuses: string[] = [];
    const live = new LiveSocket({
      url: "ws://x",
      socket: factory,
      clock,
      onFrame: () => undefined,
      onStatus: (s) => statuses.push(s),
    });
    live.start();
    sockets[0]!.drop(1006);
    clock.advance(749);
    expect(sockets).toHaveLength(1);
    clock.advance(1); // 0.75 s: half the first second plus jitter
    expect(sockets).toHaveLength(2);
    sockets[1]!.drop(1006);
    clock.advance(1500); // the second wait is longer
    expect(sockets).toHaveLength(3);
    sockets[2]!.drop(4401);
    clock.advance(60_000);
    expect(sockets).toHaveLength(3);
    expect(statuses.at(-1)).toBe("stopped");
  });

  test("sends a heartbeat while open", () => {
    const { sockets, clock, factory } = setup();
    const live = new LiveSocket({
      url: "ws://x",
      socket: factory,
      clock,
      onFrame: () => undefined,
    });
    live.start();
    sockets[0]!.open();
    clock.advance(25_000);
    expect(sockets[0]!.sent).toEqual([{ type: "ping" }]);
    live.stop();
    expect(sockets[0]!.closedWith).toBe(1000);
  });
});

describe("student live", () => {
  test("says hello with the last message seen, on every connect", () => {
    const { sockets, clock, factory } = setup();
    const frames: StudentFrame[] = [];
    const cursors: number[] = [];
    const live = new StudentLive({
      url: "ws://x",
      socket: factory,
      clock,
      after: 3,
      onFrame: (f) => frames.push(f),
      onCursor: (c) => cursors.push(c),
    });
    live.start();
    sockets[0]!.open();
    expect(sockets[0]!.sent).toEqual([{ type: "hello", after: 3 }]);
    sockets[0]!.receive({
      type: "message",
      message: { id: 7, kind: "broadcast", data: { text: "Hi" }, created_at: "", undone_at: null },
    });
    expect(cursors).toEqual([7]);
    sockets[0]!.drop(1006);
    clock.advance(1000);
    sockets[1]!.open();
    expect(sockets[1]!.sent[0]).toEqual({ type: "hello", after: 7 });
    expect(frames.map((f) => f.type)).toEqual(["message"]);
  });

  test("asks again from its cursor when told to resync", () => {
    const { sockets, clock, factory } = setup();
    const live = new StudentLive({
      url: "ws://x",
      socket: factory,
      clock,
      after: 5,
      onFrame: () => undefined,
    });
    live.start();
    sockets[0]!.open();
    sockets[0]!.receive({ type: "resync" });
    expect(sockets[0]!.sent).toEqual([
      { type: "hello", after: 5 },
      { type: "hello", after: 5 },
    ]);
  });

  test("sends at most one bench every two seconds, ending on the latest", () => {
    const { sockets, clock, factory } = setup();
    const live = new StudentLive({
      url: "ws://x",
      socket: factory,
      clock,
      onFrame: () => undefined,
    });
    live.start();
    sockets[0]!.open();
    live.bench(summary(1));
    live.bench(summary(2));
    live.bench(summary(3));
    const benches = () => sockets[0]!.sent.filter((f) => (f as { type: string }).type === "bench");
    expect(benches()).toHaveLength(1);
    clock.advance(2000);
    expect(benches()).toEqual([
      { type: "bench", ...summary(1) },
      { type: "bench", ...summary(3) },
    ]);
  });

  test("resends the latest bench after a reconnect", () => {
    const { sockets, clock, factory } = setup();
    const live = new StudentLive({
      url: "ws://x",
      socket: factory,
      clock,
      onFrame: () => undefined,
    });
    live.start();
    live.bench(summary(4)); // offline: nothing to send it on
    sockets[0]!.open();
    expect(sockets[0]!.sent).toEqual([
      { type: "hello", after: 0 },
      { type: "bench", ...summary(4) },
    ]);
  });
});
