"use client";

import {
  coachProjection,
  createIndexedDbStore,
  decide,
  decideExam,
  EMPTY_EXAM,
  newDeviceId,
  redoEvents,
  replay,
  type Attempt,
  type CoachState,
  type Command,
  type EventStore,
  type LabEvent,
  type NewEvent,
  type Refusal,
  type Step,
} from "@pa/engine";
import { newSeed } from "@pa/instruments";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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

function forget(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Storage blocked: nothing was remembered either.
  }
}

/*
 * One store for the page's lifetime, and one opening per experiment. React may mount the screen
 * twice in development; sharing these means the second mount reuses the first's work instead of
 * closing the database under it or starting a second attempt. Only which attempt to open is
 * shared: its events are read afresh on every mount, so moving from the lab to the notebook or the
 * report never shows the events as they were when the lab first opened.
 */
let sharedStore: EventStore | undefined;
const openings = new Map<string, Promise<Attempt>>();

function store(): EventStore {
  sharedStore ??= createIndexedDbStore({ device: remembered("pa:device", newDeviceId)! });
  return sharedStore;
}

async function openAttempt(experimentId: string) {
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
      return attempt;
    })();
    openings.set(experimentId, opening);
  }
  const attempt = await opening;
  return { attempt, events: await store().events(attempt.id) };
}

/** Every run of an experiment on this device, oldest first, with its events. */
export async function listRuns(experimentId: string) {
  const attempts = await store().listAttempts({ experimentId });
  const runs = await Promise.all(
    [...attempts]
      .sort((a, b) => a.createdAt - b.createdAt)
      .map(async (attempt) => ({ attempt, events: await store().events(attempt.id) })),
  );
  return runs;
}

/** The run this device opens in the lab for an experiment. */
export const currentRunId = (experimentId: string) => remembered(`pa:attempt:${experimentId}`);

/** Save events in any run on this device (the review records "feedback read" in its own run). */
export const appendTo = (attemptId: string, events: readonly NewEvent[]) =>
  store().append(attemptId, events);

/**
 * Redo a run from a step: a new attempt with the same seed (the same apparatus) that keeps the
 * earlier run's work before that step. The lab opens it from now on; the earlier run is kept.
 */
export async function startRun(source: Attempt, events: readonly LabEvent[], from: Step) {
  const news = redoEvents(events, from, source.id);
  if (!news) return undefined;
  const attempt = await store().createAttempt({
    experimentId: source.experimentId,
    mode: source.mode,
    seed: source.seed,
  });
  await store().append(attempt.id, news);
  remember(`pa:attempt:${source.experimentId}`, attempt.id);
  openings.delete(source.experimentId);
  return attempt;
}

/**
 * Start an exam (master plan, "Exam mode"): a new attempt in mode "exam" with its own apparatus,
 * the clock started. The lab opens it from now on; earlier runs are kept.
 */
export async function startExam(experimentId: string) {
  const attempt = await store().createAttempt({ experimentId, mode: "exam", seed: newSeed() });
  const d = decideExam(attempt.mode, EMPTY_EXAM, { type: "start" });
  if (d.ok) await store().append(attempt.id, d.events);
  remember(`pa:attempt:${experimentId}`, attempt.id);
  openings.delete(experimentId);
  return attempt;
}

/** Leave an exam for practice: the latest run that was not an exam, or a new one if none. */
export async function backToPractice(experimentId: string) {
  const attempts = await store().listAttempts({ experimentId });
  const practice = [...attempts]
    .filter((a) => a.mode !== "exam")
    .sort((a, b) => b.createdAt - a.createdAt)[0];
  if (practice) remember(`pa:attempt:${experimentId}`, practice.id);
  else forget(`pa:attempt:${experimentId}`);
  openings.delete(experimentId);
}

/** Open an earlier run in the lab instead of the latest. */
export function openRun(experimentId: string, attemptId: string) {
  remember(`pa:attempt:${experimentId}`, attemptId);
  openings.delete(experimentId);
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

  // One handle per change of events, so the lab's views of the attempt (the table, the graph,
  // the assembly) are rebuilt only when the attempt changes, never on an animation frame.
  return useMemo(() => {
    if (!loaded) return undefined;
    return {
      attempt: loaded.attempt,
      state: replay(coachProjection, loaded.attempt, loaded.events),
      events: loaded.events,
      async dispatch(command: Command) {
        const decision = decide(replay(coachProjection, loaded.attempt, latest.current), command);
        if (!decision.ok) return decision.reason;
        await save(decision.events);
        return undefined;
      },
      record: save,
    } satisfies AttemptHandle;
  }, [loaded, save]);
}
