// Live classes over WebSockets (ADR 0041). The frames mirror apps/api/app/live/schemas.py and
// app/routes/live.py; they are not in OpenAPI, so they are written here by hand and listed in
// the ADR.
//
// Offline first (AGENTS.md rule 5): nothing in the lab waits on this socket. It connects when it
// can, reconnects with a growing wait, and a student catches up from the database by saying which
// message they saw last.
import type { BenchOut, LiveMessageOut, LiveSessionOut, Mistake } from "./generated";

export type StepName = BenchOut["step"];

// What the teacher's board receives.
export type TeacherFrame =
  | { readonly type: "bench"; readonly bench: BenchOut }
  | { readonly type: "presence"; readonly member_id: string; readonly here: boolean }
  | { readonly type: "message"; readonly message: LiveMessageOut }
  | { readonly type: "undone"; readonly id: number }
  | { readonly type: "lock"; readonly locked: boolean }
  | { readonly type: "started" | "ended"; readonly session: LiveSessionOut }
  | { readonly type: "resync" }
  | { readonly type: "pong" };

// What a student's device receives. Students never see the class id or who else a message reached.
export type StudentLiveSession = Omit<LiveSessionOut, "class_id">;
export type StudentMessage = Omit<LiveMessageOut, "to_member_ids">;
export type StudentFrame =
  | {
      readonly type: "state";
      readonly session: StudentLiveSession | null;
      readonly cursor: number;
    }
  | { readonly type: "message"; readonly message: StudentMessage }
  | { readonly type: "undone"; readonly id: number }
  | { readonly type: "lock"; readonly locked: boolean }
  | { readonly type: "started" | "ended"; readonly session: StudentLiveSession }
  | { readonly type: "resync" }
  | { readonly type: "pong" };

/** What a bench tells the teacher: a summary the device computes from its attempt. */
export interface BenchSummary {
  readonly attempt_id: string | null;
  readonly experiment_id: string;
  readonly step: StepName;
  readonly completed: readonly StepName[];
  readonly mistakes: readonly Mistake[];
  readonly readings: number;
}

/** The numbers ADR 0041 fixes on the device side. */
export const LIVE = {
  benchEveryMs: 2000,
  heartbeatMs: 25_000,
  firstRetryMs: 1000,
  longestRetryMs: 30_000,
} as const;

/** Close codes after which reconnecting cannot help: signed out, not allowed, no such class. */
export const FINAL_CLOSE_CODES: readonly number[] = [4401, 4403, 4404];

export type LiveStatus = "connecting" | "open" | "waiting" | "stopped";

/** The part of the browser's WebSocket the client uses, so tests can pass a fake. */
export interface SocketLike {
  readonly readyState: number;
  onopen: ((event: unknown) => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
  onclose: ((event: { code: number }) => void) | null;
  onerror: ((event: unknown) => void) | null;
  send(data: string): void;
  close(code?: number): void;
}
export type SocketFactory = (url: string) => SocketLike;

export interface Clock {
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
  setInterval(fn: () => void, ms: number): unknown;
  clearInterval(handle: unknown): void;
  now(): number;
  random(): number;
}

const realClock: Clock = {
  setTimeout: (fn, ms) => globalThis.setTimeout(fn, ms),
  clearTimeout: (h) => {
    globalThis.clearTimeout(h as ReturnType<typeof setTimeout>);
  },
  setInterval: (fn, ms) => globalThis.setInterval(fn, ms),
  clearInterval: (h) => {
    globalThis.clearInterval(h as ReturnType<typeof setInterval>);
  },
  now: () => Date.now(),
  random: () => Math.random(),
};

/** The socket's URL on this page's origin: the web app forwards /api to the API. */
export function liveSocketUrl(
  path: string,
  location: { protocol: string; host: string },
  baseUrl = "/api",
): string {
  const scheme = location.protocol === "https:" ? "wss:" : "ws:";
  return `${scheme}//${location.host}${baseUrl}${path}`;
}

export interface LiveSocketOptions<In> {
  readonly url: string;
  readonly onFrame: (frame: In) => void;
  /** Called on every (re)connect, before frames arrive: the place to send `hello`. */
  readonly onOpen?: (send: (frame: object) => void) => void;
  readonly onStatus?: (status: LiveStatus, closeCode?: number) => void;
  readonly socket?: SocketFactory;
  readonly clock?: Clock;
}

const OPEN = 1;

/** One reconnecting socket. `start` once; `stop` when the screen goes away. */
export class LiveSocket<In extends { readonly type: string }> {
  private ws: SocketLike | null = null;
  private retry = 0;
  private timer: unknown = null;
  private heartbeat: unknown = null;
  private stopped = false;
  private readonly clock: Clock;
  private readonly make: SocketFactory;

  constructor(private readonly options: LiveSocketOptions<In>) {
    this.clock = options.clock ?? realClock;
    this.make = options.socket ?? ((url) => new globalThis.WebSocket(url) as unknown as SocketLike);
  }

  start(): void {
    this.stopped = false;
    this.connect();
  }

  stop(): void {
    this.stopped = true;
    if (this.timer !== null) this.clock.clearTimeout(this.timer);
    this.stopHeartbeat();
    const ws = this.ws;
    this.ws = null;
    ws?.close(1000);
    this.options.onStatus?.("stopped");
  }

  /** Send a frame if connected; otherwise drop it (the next `hello` or bench covers it). */
  send(frame: object): boolean {
    if (this.ws?.readyState !== OPEN) return false;
    this.ws.send(JSON.stringify(frame));
    return true;
  }

  private connect(): void {
    if (this.stopped) return;
    this.options.onStatus?.("connecting");
    let ws: SocketLike;
    try {
      ws = this.make(this.options.url);
    } catch {
      this.wait();
      return;
    }
    this.ws = ws;
    ws.onopen = () => {
      this.retry = 0;
      this.options.onStatus?.("open");
      this.heartbeat = this.clock.setInterval(() => {
        this.send({ type: "ping" });
      }, LIVE.heartbeatMs);
      this.options.onOpen?.((frame) => this.send(frame));
    };
    ws.onmessage = (event) => {
      if (typeof event.data !== "string") return;
      let frame: unknown;
      try {
        frame = JSON.parse(event.data);
      } catch {
        return;
      }
      if (typeof frame === "object" && frame !== null && "type" in frame) {
        this.options.onFrame(frame as In);
      }
    };
    ws.onerror = () => {
      // A close always follows.
    };
    ws.onclose = (event) => {
      if (this.ws !== ws) return;
      this.ws = null;
      this.stopHeartbeat();
      if (this.stopped) return;
      if (FINAL_CLOSE_CODES.includes(event.code)) {
        this.stopped = true;
        this.options.onStatus?.("stopped", event.code);
        return;
      }
      this.wait(event.code);
    };
  }

  private wait(code?: number): void {
    this.options.onStatus?.("waiting", code);
    // Full jitter, so a whole class does not reconnect at the same moment after a restart.
    const ceiling = Math.min(LIVE.longestRetryMs, LIVE.firstRetryMs * 2 ** this.retry);
    this.retry += 1;
    const delay = Math.round(ceiling / 2 + (this.clock.random() * ceiling) / 2);
    this.timer = this.clock.setTimeout(() => {
      this.timer = null;
      this.connect();
    }, delay);
  }

  private stopHeartbeat(): void {
    if (this.heartbeat !== null) this.clock.clearInterval(this.heartbeat);
    this.heartbeat = null;
  }
}

export interface StudentLiveOptions extends Omit<LiveSocketOptions<StudentFrame>, "onOpen"> {
  /** The last message id this device has seen, kept across page loads by the caller. */
  readonly after?: number;
  readonly onCursor?: (cursor: number) => void;
}

/**
 * A student's side of a live class: says `hello` with its cursor on every connect, keeps the
 * cursor as messages arrive, and sends bench summaries at most every two seconds, always ending
 * on the latest.
 */
export class StudentLive {
  private cursor: number;
  private readonly socket: LiveSocket<StudentFrame>;
  private readonly clock: Clock;
  private lastSent = Number.NEGATIVE_INFINITY;
  private pending: BenchSummary | null = null;
  private latest: BenchSummary | null = null;
  private flush: unknown = null;

  constructor(private readonly options: StudentLiveOptions) {
    this.cursor = options.after ?? 0;
    this.clock = options.clock ?? realClock;
    this.socket = new LiveSocket<StudentFrame>({
      ...options,
      onOpen: (send) => {
        send({ type: "hello", after: this.cursor });
        // The server forgets nothing it stored, but a bench changed while offline is resent.
        if (this.latest !== null) {
          this.lastSent = this.clock.now();
          send({ type: "bench", ...this.latest });
        }
      },
      onFrame: (frame) => {
        if (frame.type === "state") this.advance(frame.cursor);
        if (frame.type === "message") this.advance(frame.message.id);
        options.onFrame(frame);
      },
    });
  }

  start(): void {
    this.socket.start();
  }

  stop(): void {
    if (this.flush !== null) this.clock.clearTimeout(this.flush);
    this.flush = null;
    this.socket.stop();
  }

  bench(summary: BenchSummary): void {
    this.latest = summary;
    const wait = this.lastSent + LIVE.benchEveryMs - this.clock.now();
    if (wait <= 0 && this.flush === null) {
      this.sendBench(summary);
      return;
    }
    this.pending = summary;
    this.flush ??= this.clock.setTimeout(
      () => {
        this.flush = null;
        const next = this.pending;
        this.pending = null;
        if (next !== null) this.sendBench(next);
      },
      Math.max(0, wait),
    );
  }

  private sendBench(summary: BenchSummary): void {
    this.lastSent = this.clock.now();
    this.socket.send({ type: "bench", ...summary });
  }

  private advance(id: number): void {
    if (id > this.cursor) {
      this.cursor = id;
      this.options.onCursor?.(id);
    }
  }
}
