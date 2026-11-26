// @pa/usage: anonymous usage counts from the lab (ADR 0048). See README.md.

/** The six product events (master plan, "Product events"), and nothing else. */
export const USAGE_NAMES = [
  "experiment_viewed",
  "attempt_started",
  "stage_completed",
  "hint_shown",
  "report_exported",
  "attempt_completed",
] as const;
export type UsageName = (typeof USAGE_NAMES)[number];

export type UsageMode = "guided" | "exam" | "own-data";
/** What the report screen downloads. */
export type UsageFormat = "pdf" | "docx" | "figures" | "data";
export type DeviceClass = "phone" | "tablet" | "desktop";

/** What a call site says. The module adds the device class, the app version and the day's id. */
export interface UsageInput {
  name: UsageName;
  experimentId: string;
  /** With `stage_completed` only. */
  step?: string;
  /** The attempt's mode. What-if attempts are not one of the three, so they send none. */
  mode?: string | undefined;
  /** With `report_exported` only. */
  format?: UsageFormat;
}

/** One event as it travels: exactly the fields ADR 0048 allows. */
export interface UsageEvent {
  name: UsageName;
  experimentId: string;
  step?: string;
  mode?: UsageMode;
  format?: UsageFormat;
  device: DeviceClass;
  appVersion: string;
  dayId: string;
}

export const MAX_QUEUE = 200;
export const MAX_BATCH = 50;
export const MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000;
/** Send this long after the last event, if nothing else has sent it. */
export const SETTLE_MS = 30_000;

const QUEUE_KEY = "pa:usage:queue";
const DAY_KEY = "pa:usage:day";
const MODES: readonly string[] = ["guided", "exam", "own-data"];
/** The ten steps of an attempt (packages/engine/src/steps/machine.ts, GLOSSARY.md). */
const STEPS: readonly string[] = [
  "question",
  "predict",
  "build",
  "check",
  "measure",
  "tabulate",
  "plot",
  "analyse",
  "conclude",
  "report",
];
const EXPERIMENT = /^[a-z0-9][a-z0-9-]{0,63}$/;
const VERSION = /^[A-Za-z0-9.+-]{1,40}$/;

interface Queued {
  event: UsageEvent;
  /** When it was queued, by the device's clock, for the three-day drop. */
  at: number;
}

/** The small slice of `Storage` the module uses. */
export interface KeyValue {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Everything the module touches outside itself, so tests can stand in for the browser. */
export interface UsageEnvironment {
  storage?: KeyValue | undefined;
  now: () => Date;
  randomBytes: (n: number) => Uint8Array;
  /** `navigator.sendBeacon`: true if the browser took the body. */
  send: (url: string, body: Blob) => boolean;
  online: () => boolean;
  /** Do Not Track or Global Privacy Control is set. */
  optedOut: () => boolean;
  screenWidth: () => number;
  setTimer: (fn: () => void, ms: number) => unknown;
  clearTimer: (timer: unknown) => void;
}

export interface UsageOptions {
  endpoint: string;
  appVersion: string;
}

export interface Usage {
  track(input: UsageInput): void;
  /** Send what is queued, a batch at a time, if the device is online. */
  flush(): void;
  /** What is waiting (for tests). */
  queued(): UsageEvent[];
}

/** The device's local date, as the day's id is kept by. */
export function localDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${String(d.getFullYear())}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Phone, tablet or desktop, from the screen width in CSS pixels (never the user agent). */
export function deviceClass(width: number): DeviceClass {
  if (width < 600) return "phone";
  if (width < 1024) return "tablet";
  return "desktop";
}

/** Browser signals that the person does not want to be counted. */
export function browserOptedOut(nav: unknown, win: unknown): boolean {
  const n = (nav ?? {}) as { doNotTrack?: unknown; globalPrivacyControl?: unknown };
  const w = (win ?? {}) as { doNotTrack?: unknown };
  return (
    n.globalPrivacyControl === true ||
    n.doNotTrack === "1" ||
    n.doNotTrack === "yes" ||
    w.doNotTrack === "1"
  );
}

function hex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** A memory stand-in when storage is blocked (a private window): counts still work, per page. */
function memoryStore(): KeyValue {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
  };
}

function isQueued(x: unknown): x is Queued {
  const q = x as Partial<Queued> | null;
  return (
    typeof q === "object" &&
    q !== null &&
    typeof q.at === "number" &&
    typeof q.event === "object" &&
    q.event !== null &&
    (USAGE_NAMES as readonly string[]).includes(q.event.name)
  );
}

export function createUsage(options: UsageOptions, env: UsageEnvironment): Usage {
  const store = env.storage ?? memoryStore();
  const memory = memoryStore();
  const appVersion = VERSION.test(options.appVersion) ? options.appVersion : "unknown";
  let timer: unknown;

  // Storage can throw at any time (quota, blocked); fall back to memory and carry on.
  const read = (key: string) => {
    try {
      return store.getItem(key) ?? memory.getItem(key);
    } catch {
      return memory.getItem(key);
    }
  };
  const write = (key: string, value: string) => {
    memory.setItem(key, value);
    try {
      store.setItem(key, value);
    } catch {
      // Kept in memory for this page.
    }
  };
  const remove = (key: string) => {
    memory.removeItem(key);
    try {
      store.removeItem(key);
    } catch {
      // Nothing was stored either.
    }
  };

  /** Today's id: kept with the local date, replaced (and the old one forgotten) on a new day. */
  const dayId = () => {
    const today = localDate(env.now());
    try {
      const kept = JSON.parse(read(DAY_KEY) ?? "null") as { date?: unknown; id?: unknown } | null;
      if (kept?.date === today && typeof kept.id === "string" && /^[0-9a-f]{32}$/.test(kept.id))
        return kept.id;
    } catch {
      // Unreadable: make a new one.
    }
    const id = hex(env.randomBytes(16));
    write(DAY_KEY, JSON.stringify({ date: today, id }));
    return id;
  };

  /** The queue, without anything older than three days. */
  const load = (): Queued[] => {
    try {
      const raw: unknown = JSON.parse(read(QUEUE_KEY) ?? "[]");
      const cutoff = env.now().getTime() - MAX_AGE_MS;
      return Array.isArray(raw) ? raw.filter(isQueued).filter((q) => q.at >= cutoff) : [];
    } catch {
      return [];
    }
  };
  const save = (queue: readonly Queued[]) => {
    if (queue.length === 0) remove(QUEUE_KEY);
    else write(QUEUE_KEY, JSON.stringify(queue.slice(-MAX_QUEUE)));
  };

  const flush = () => {
    try {
      if (env.optedOut()) return save([]);
      let queue = load();
      if (queue.length === 0 || !env.online()) return save(queue);
      // At most four batches (the whole queue) per flush.
      while (queue.length > 0) {
        const batch = queue.slice(0, MAX_BATCH);
        const body = new Blob([JSON.stringify({ events: batch.map((q) => q.event) })], {
          type: "application/json",
        });
        if (!env.send(options.endpoint, body)) break;
        queue = queue.slice(batch.length);
      }
      save(queue);
    } catch {
      // Counting never breaks the lab: the queue stays as it was.
    }
  };

  const track = (input: UsageInput) => {
    try {
      if (env.optedOut()) return save([]);
      if (!(USAGE_NAMES as readonly string[]).includes(input.name)) return;
      if (!EXPERIMENT.test(input.experimentId)) return;
      const event: UsageEvent = {
        name: input.name,
        experimentId: input.experimentId,
        device: deviceClass(env.screenWidth()),
        appVersion,
        dayId: dayId(),
      };
      if (input.name === "stage_completed") {
        if (!input.step || !STEPS.includes(input.step)) return;
        event.step = input.step;
      }
      if (input.name === "report_exported") {
        if (!input.format) return;
        event.format = input.format;
      }
      if (input.mode && MODES.includes(input.mode)) event.mode = input.mode as UsageMode;
      const queue = [...load(), { event, at: env.now().getTime() }];
      save(queue.slice(-MAX_QUEUE));
      if (queue.length >= MAX_BATCH) flush();
      else {
        env.clearTimer(timer);
        timer = env.setTimer(flush, SETTLE_MS);
      }
    } catch {
      // Counting never breaks the lab.
    }
  };

  return { track, flush, queued: () => load().map((q) => q.event) };
}

/**
 * Turn the lab's saved events into usage events: a finished step, a hint shown, and a finished
 * attempt (the report step done, or an exam handed in). Pure, so the lab's call is one line.
 */
export function usageFromLabEvents(
  attempt: { experimentId: string; mode: string },
  events: readonly { kind: string; data?: unknown }[],
): UsageInput[] {
  const out: UsageInput[] = [];
  const base = { experimentId: attempt.experimentId, mode: attempt.mode };
  for (const e of events) {
    if (e.kind === "step.complete") {
      const step = (e.data as { step?: unknown } | null | undefined)?.step;
      if (typeof step !== "string") continue;
      out.push({ ...base, name: "stage_completed", step });
      if (step === "report") out.push({ ...base, name: "attempt_completed" });
    } else if (e.kind === "exam.hand-in") {
      out.push({ ...base, name: "attempt_completed" });
    } else if (e.kind === "coach.hint") {
      out.push({ ...base, name: "hint_shown" });
    }
  }
  return out;
}

// The page's one instance, in the browser.

let shared: Usage | undefined;
const early: UsageInput[] = [];

function browserEnvironment(): UsageEnvironment {
  let storage: KeyValue | undefined;
  try {
    storage = window.localStorage;
  } catch {
    storage = undefined;
  }
  return {
    storage,
    now: () => new Date(),
    randomBytes: (n) => crypto.getRandomValues(new Uint8Array(n)),
    send: (url, body) =>
      typeof navigator.sendBeacon === "function" && navigator.sendBeacon(url, body),
    online: () => navigator.onLine,
    optedOut: () => browserOptedOut(navigator, window),
    screenWidth: () => window.screen.width,
    setTimer: (fn, ms) => window.setTimeout(fn, ms),
    clearTimer: (t) => window.clearTimeout(t as number),
  };
}

/** Start counting on this page: send when the page is hidden and when the connection returns. */
export function startUsage(options: UsageOptions): void {
  try {
    if (shared || typeof window === "undefined") return;
    const usage = createUsage(options, browserEnvironment());
    shared = usage;
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") usage.flush();
    });
    window.addEventListener("pagehide", () => usage.flush());
    window.addEventListener("online", () => usage.flush());
    for (const input of early.splice(0)) usage.track(input);
    usage.flush();
  } catch {
    // Counting never breaks the lab.
  }
}

/** Count one event. Returns at once; never throws. Before `startUsage`, events wait in memory. */
export function trackUsage(input: UsageInput): void {
  if (shared) shared.track(input);
  else if (early.length < MAX_QUEUE) early.push(input);
}

/** Count each of these (the lab's saved events, through `usageFromLabEvents`). */
export function trackAll(inputs: readonly UsageInput[]): void {
  for (const input of inputs) trackUsage(input);
}
