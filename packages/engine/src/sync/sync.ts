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

export interface PullPage {
  attempts: Attempt[];
  events: LabEvent[];
  cursor: string;
  more: boolean;
}

/** The two server calls sync needs. The web app passes @pa/api-client's sync calls. */
export interface SyncTransport {
  push(batches: PushBatch[]): Promise<Reply<unknown>>;
  pull(after: string | null): Promise<Reply<PullPage>>;
}

/** The server's limits per push (ADR 0039). */
export const PUSH_MAX_ATTEMPTS = 20;
export const PUSH_MAX_EVENTS = 2000;

export interface SyncResult {
  /** Attempts whose events reached the server. */
  pushed: number;
  /** Events from the server that were new on this device. */
  pulled: number;
  /** Attempts the server sent that another account on this device already holds; left alone. */
  skipped: string[];
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

/**
 * Split an account's changed attempts into pushes within the server's limits. Each attempt goes
 * once per request; a long attempt's later slices go in requests of their own.
 */
export function batchesOf(changed: readonly PushBatch[]): PushBatch[][] {
  const out: PushBatch[][] = [];
  let current: PushBatch[] = [];
  let count = 0;
  const flush = () => {
    if (current.length > 0) out.push(current);
    current = [];
    count = 0;
  };
  const later: PushBatch[] = [];
  for (const { attempt, events } of changed) {
    const first = events.slice(0, PUSH_MAX_EVENTS);
    if (current.length === PUSH_MAX_ATTEMPTS || count + first.length > PUSH_MAX_EVENTS) flush();
    current.push({ attempt, events: first });
    count += first.length;
    for (let i = PUSH_MAX_EVENTS; i < events.length; i += PUSH_MAX_EVENTS) {
      later.push({ attempt, events: events.slice(i, i + PUSH_MAX_EVENTS) });
    }
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
): Promise<{ pushed: number; stopped?: SyncResult["stopped"] }> {
  const changed: PushBatch[] = [];
  for (const id of await holdings.heldBy(account)) {
    const attempt = await store.getAttempt(id);
    if (!attempt) continue;
    const events = await store.events(id);
    if (events.length <= (await holdings.pushedCount(account, id))) continue;
    // All of them: the server skips the ones it has, and merges put new events anywhere.
    changed.push({ attempt, events });
  }
  const done = new Set<string>();
  for (const batch of batchesOf(changed)) {
    const reply = await transport.push(batch);
    if (!reply.ok) return { pushed: done.size, stopped: reply };
    for (const b of batch) done.add(b.attempt.id);
  }
  for (const { attempt, events } of changed) {
    await holdings.setPushedCount(account, attempt.id, events.length);
  }
  return { pushed: done.size };
}

/** Push this account's changed attempts, then pull everything new for it. */
export async function syncAccount(input: {
  store: EventStore;
  holdings: Holdings;
  account: string;
  transport: SyncTransport;
}): Promise<SyncResult> {
  const { store, holdings, account, transport } = input;
  const result: SyncResult = { pushed: 0, pulled: 0, skipped: [] };

  const pushed = await pushAll(store, holdings, account, transport);
  result.pushed = pushed.pushed;
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
