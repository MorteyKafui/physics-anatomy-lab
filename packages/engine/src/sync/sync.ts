import type { EventStore } from "../events/store";
import type { Attempt, LabEvent } from "../events/types";
import { validateAttempt, validateEvent } from "../events/validate";
import type { Holdings } from "./holdings";

/**
 * Syncing an account's attempts with the server (ADR 0039): push what the server lacks, then
 * pull what the device lacks. Both sides skip events they hold, so a sync can stop anywhere
 * (offline, closed tab) and simply run again. Nothing in the lab waits for it (AGENTS.md rule 5).
 */

/** What a call to the server returned: the shape of @pa/api-client's Result. */
export type Reply<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly status: number; readonly detail: string };

export interface PushBatch {
  attempt: Attempt;
  events: LabEvent[];
}

/** The server's answer per attempt: "conflict" means it holds that id with another header. */
export interface PushReply {
  attempts: { id: string; status: "ok" | "conflict" }[];
}

export interface PullPage {
  attempts: Attempt[];
  events: LabEvent[];
  cursor: string;
  more: boolean;
}

/** The two server calls sync needs. The web app passes @pa/api-client's sync calls. */
export interface SyncTransport {
  push(batches: PushBatch[]): Promise<Reply<PushReply>>;
  pull(after: string | null): Promise<Reply<PullPage>>;
}

/** The server's limits per push (ADR 0039). */
export const PUSH_MAX_ATTEMPTS = 20;
export const PUSH_MAX_EVENTS = 2000;
/** Kept under the server's 2 MB body limit, with room for the headers and JSON around events. */
export const PUSH_MAX_BYTES = 1_500_000;

const encoder = new TextEncoder();
const sizeOf = (e: LabEvent) => encoder.encode(JSON.stringify(e)).length;

export interface SyncResult {
  /** Attempts whose events reached the server. */
  pushed: number;
  /** Events from the server that were new on this device. */
  pulled: number;
  /** Attempts the server sent that another account on this device already holds; left alone. */
  skipped: string[];
  /**
   * Attempts the server holds under the same id with another experiment or seed. Their events
   * stay on this device and are not sent again until they change.
   */
  conflicts: string[];
  /** Why the sync stopped early, if it did; the next sync carries on from there. */
  stopped?: { status: number; detail: string };
}

/** Attempts no account on this device holds yet: signed-out work, which the person may adopt. */
export async function unheldAttempts(store: EventStore, holdings: Holdings): Promise<Attempt[]> {
  const all = await store.listAttempts();
  const unheld: Attempt[] = [];
  for (const a of all) if ((await holdings.holder(a.id)) === undefined) unheld.push(a);
  return unheld;
}

/**
 * Give the chosen signed-out attempts to the account. Only ever called with attempts the person
 * picked: school computers are shared, so nothing is adopted without asking (ADR 0039).
 */
export async function adopt(
  holdings: Holdings,
  account: string,
  attemptIds: readonly string[],
): Promise<void> {
  for (const id of attemptIds) await holdings.hold(id, account);
}

/** An attempt's events in slices within the server's limits on count and size. */
function slicesOf(events: readonly LabEvent[]): LabEvent[][] {
  const slices: LabEvent[][] = [];
  let current: LabEvent[] = [];
  let bytes = 0;
  for (const e of events) {
    const size = sizeOf(e);
    if (
      current.length === PUSH_MAX_EVENTS ||
      (current.length > 0 && bytes + size > PUSH_MAX_BYTES)
    ) {
      slices.push(current);
      current = [];
      bytes = 0;
    }
    current.push(e);
    bytes += size;
  }
  slices.push(current); // an attempt with no events still sends its header
  return slices;
}

/**
 * Split an account's changed attempts into pushes within the server's limits. Each attempt goes
 * once per request; a long attempt's later slices go in requests of their own.
 */
export function batchesOf(changed: readonly PushBatch[]): PushBatch[][] {
  const out: PushBatch[][] = [];
  let current: PushBatch[] = [];
  let count = 0;
  let bytes = 0;
  const flush = () => {
    if (current.length > 0) out.push(current);
    current = [];
    count = 0;
    bytes = 0;
  };
  const later: PushBatch[] = [];
  for (const { attempt, events } of changed) {
    const [first = [], ...rest] = slicesOf(events);
    const size = first.reduce((n, e) => n + sizeOf(e), 0);
    const full =
      current.length === PUSH_MAX_ATTEMPTS ||
      count + first.length > PUSH_MAX_EVENTS ||
      bytes + size > PUSH_MAX_BYTES;
    if (full) flush();
    current.push({ attempt, events: first });
    count += first.length;
    bytes += size;
    for (const slice of rest) later.push({ attempt, events: slice });
  }
  flush();
  for (const slice of later) out.push([slice]);
  return out;
}

async function pushAll(
  store: EventStore,
  holdings: Holdings,
  account: string,
  transport: SyncTransport,
): Promise<{ pushed: number; conflicts: string[]; stopped?: SyncResult["stopped"] }> {
  const changed: PushBatch[] = [];
  for (const id of await holdings.heldBy(account)) {
    const attempt = await store.getAttempt(id);
    if (!attempt) continue;
    const events = await store.events(id);
    if (events.length <= (await holdings.pushedCount(account, id))) continue;
    // All of them: the server skips the ones it has, and merges put new events anywhere.
    changed.push({ attempt, events });
  }
  // Mark an attempt pushed as soon as its last slice lands, so a failure later in the run
  // repeats only what did not get through.
  const batches = batchesOf(changed);
  const slicesLeft = new Map<string, number>();
  for (const b of batches.flat())
    slicesLeft.set(b.attempt.id, (slicesLeft.get(b.attempt.id) ?? 0) + 1);
  const total = new Map(changed.map((c) => [c.attempt.id, c.events.length]));
  const done = new Set<string>();
  const conflicts: string[] = [];
  for (const batch of batches) {
    const reply = await transport.push(batch);
    if (!reply.ok) return { pushed: done.size, conflicts, stopped: reply };
    const conflicting = new Set(
      reply.data.attempts.filter((a) => a.status === "conflict").map((a) => a.id),
    );
    for (const { attempt } of batch) {
      const left = (slicesLeft.get(attempt.id) ?? 1) - 1;
      slicesLeft.set(attempt.id, left);
      if (conflicting.has(attempt.id)) {
        if (!conflicts.includes(attempt.id)) conflicts.push(attempt.id);
      } else if (left === 0) {
        done.add(attempt.id);
      }
      // A conflicting attempt is marked too, so it is not sent again until it changes.
      if (left === 0)
        await holdings.setPushedCount(account, attempt.id, total.get(attempt.id) ?? 0);
    }
  }
  return { pushed: done.size, conflicts };
}

/** Push this account's changed attempts, then pull everything new for it. */
export async function syncAccount(input: {
  store: EventStore;
  holdings: Holdings;
  account: string;
  transport: SyncTransport;
}): Promise<SyncResult> {
  const { store, holdings, account, transport } = input;
  const result: SyncResult = { pushed: 0, pulled: 0, skipped: [], conflicts: [] };

  const pushed = await pushAll(store, holdings, account, transport);
  result.pushed = pushed.pushed;
  result.conflicts = pushed.conflicts;
  if (pushed.stopped) return { ...result, stopped: pushed.stopped };

  let cursor = await holdings.cursor(account);
  for (;;) {
    const reply = await transport.pull(cursor);
    if (!reply.ok) return { ...result, stopped: reply };
    const page = reply.data;
    const byAttempt = new Map<string, LabEvent[]>();
    for (const [i, e] of page.events.entries()) {
      const event = validateEvent(e, e.attemptId, i);
      byAttempt.set(event.attemptId, [...(byAttempt.get(event.attemptId) ?? []), event]);
    }
    for (const header of page.attempts) {
      const attempt = validateAttempt(header);
      const holder = await holdings.holder(attempt.id);
      if (holder !== undefined && holder !== account) {
        result.skipped.push(attempt.id);
        continue;
      }
      // If nothing here was waiting to be pushed, what the server sent needs no push back.
      // Counting from before the merge means an event recorded meanwhile still goes up later.
      const before = (await store.events(attempt.id)).length;
      const upToDate = before <= (await holdings.pushedCount(account, attempt.id));
      const added = await store.merge(attempt, byAttempt.get(attempt.id) ?? []);
      result.pulled += added;
      await holdings.hold(attempt.id, account);
      if (upToDate) await holdings.setPushedCount(account, attempt.id, before + added);
    }
    cursor = page.cursor;
    await holdings.setCursor(account, cursor);
    if (!page.more) return result;
  }
}
