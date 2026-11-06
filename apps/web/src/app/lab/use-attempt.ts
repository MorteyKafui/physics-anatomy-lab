"use client";

import {
  coachProjection,
  createIndexedDbStore,
  decide,
  newDeviceId,
  replay,
  type Attempt,
  type CoachState,
  type Command,
  type EventStore,
  type LabEvent,
  type NewEvent,
  type Refusal,
} from "@pa/engine";
import { newSeed } from "@pa/instruments";
import { useCallback, useEffect, useRef, useState } from "react";

/** Per-device conveniences only (AGENTS.md): which attempt to reopen, and this device's id. */
function remembered(key: string, make?: () => string): string | undefined {
  try {
    const found = window.localStorage.getItem(key);
    if (found || !make) return found ?? undefined;
    const value = make();
    window.localStorage.setItem(key, value);
    return value;
  } catch {
    return make?.();
  }
}

function remember(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage blocked (private window): the attempt still works, it just is not reopened.
  }
}

/*
 * One store for the page's lifetime, and one opening per experiment. React may mount the screen
 * twice in development; sharing these means the second mount reuses the first's work instead of
 * closing the database under it or starting a second attempt.
 */
let sharedStore: EventStore | undefined;
const openings = new Map<string, Promise<{ attempt: Attempt; events: LabEvent[] }>>();

function store(): EventStore {
  sharedStore ??= createIndexedDbStore({ device: remembered("pa:device", newDeviceId)! });
  return sharedStore;
}

function openAttempt(experimentId: string) {
  let opening = openings.get(experimentId);
  if (!opening) {
    opening = (async () => {
      const key = `pa:attempt:${experimentId}`;
      const previous = remembered(key);
      let attempt = previous ? await store().getAttempt(previous) : undefined;
      if (!attempt) {
        attempt = await store().createAttempt({ experimentId, mode: "guided", seed: newSeed() });
        remember(key, attempt.id);
      }
      return { attempt, events: await store().events(attempt.id) };
    })();
    openings.set(experimentId, opening);
  }
  return opening;
}

export interface AttemptHandle {
  attempt: Attempt;
  state: CoachState;
  events: LabEvent[];
  /** Ask the step machine; on acceptance its events are saved. Returns the refusal, if any. */
  dispatch(command: Command): Promise<Refusal | undefined>;
  /** Save events the coach produced. */
  record(events: readonly NewEvent[]): Promise<void>;
}

/**
 * The current attempt at an experiment on this device: reopened exactly where it was left
 * (the event store), or started fresh. Everything works offline (AGENTS.md rule 5).
 */
export function useAttempt(experimentId: string): AttemptHandle | undefined {
  const [loaded, setLoaded] = useState<{ attempt: Attempt; events: LabEvent[] }>();
  // The events as of the last save, so commands sent one after another see each other.
  const latest = useRef<LabEvent[]>([]);

  useEffect(() => {
    let cancelled = false;
    void openAttempt(experimentId).then((opened) => {
      if (cancelled) return;
      latest.current = opened.events;
      setLoaded(opened);
    });
    return () => {
      cancelled = true;
    };
  }, [experimentId]);

  const save = useCallback(
    async (news: readonly NewEvent[]) => {
      if (!loaded || news.length === 0) return;
      const stored = await store().append(loaded.attempt.id, news);
      latest.current = [...latest.current, ...stored];
      setLoaded((l) => l && { ...l, events: latest.current });
    },
    [loaded],
  );

  if (!loaded) return undefined;
  const state = replay(coachProjection, loaded.attempt, loaded.events);

  return {
    attempt: loaded.attempt,
    state,
    events: loaded.events,
    async dispatch(command) {
      const decision = decide(replay(coachProjection, loaded.attempt, latest.current), command);
      if (!decision.ok) return decision.reason;
      await save(decision.events);
      return undefined;
    },
    record: save,
  };
}
