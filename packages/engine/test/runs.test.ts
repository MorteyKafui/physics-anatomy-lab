import { describe, expect, test } from "bun:test";

import {
  coachProjection,
  createMemoryStore,
  decide,
  eventsBeforeStep,
  redoEvents,
  replay,
  runProjection,
  type Command,
  type EventStore,
} from "../src";
import { testOptions } from "./helpers";

/** Walk a run through the machine, as the lab does, and return the store and attempt. */
async function walk(store: EventStore, commands: Command[]) {
  const attempt = await store.createAttempt({
    experimentId: "simple-pendulum",
    mode: "guided",
    seed: 42,
  });
  for (const c of commands) {
    const state = replay(coachProjection, attempt, await store.events(attempt.id));
    const d = decide(state, c);
    if (!d.ok) throw new Error(`${c.type}: ${d.reason}`);
    await store.append(attempt.id, d.events);
  }
  return attempt;
}

const through = (steps: readonly string[]): Command[] =>
  steps.flatMap((s) => [
    { type: "complete-step" } as Command,
    { type: "go-to-step", step: s } as Command,
  ]);

describe("redoing a run from a step", () => {
  test("keeps everything before the run first reached the step, and marks where it came from", async () => {
    const store = createMemoryStore(testOptions("tablet"));
    const first = await walk(store, [
      ...through(["predict", "build", "check", "measure"]),
      { type: "record-reading", id: "r1", data: { t: 34.1, count: 20, countedFromOne: true } },
      ...through(["tabulate"]),
    ]);
    const events = await store.events(first.id);
    const kept = eventsBeforeStep(events, "measure")!;
    expect(kept.some((e) => e.kind === "reading.record")).toBe(false);
    expect(kept.at(-1)!.kind).toBe("step.complete");

    const second = await store.createAttempt({
      experimentId: first.experimentId,
      mode: first.mode,
      seed: first.seed,
    });
    await store.append(second.id, redoEvents(events, "measure", first.id)!);
    const again = await store.events(second.id);
    const state = replay(coachProjection, second, again);
    expect(state.step).toBe("measure");
    expect(state.completed).toEqual(["question", "predict", "build", "check"]);
    expect(state.readings).toEqual([]);
    expect(replay(runProjection, second, again)).toEqual({ from: "measure", of: first.id });
    // The first run is untouched.
    expect(await store.events(first.id)).toEqual(events);
    expect(replay(runProjection, first, events)).toBeUndefined();
  });

  test("from Question keeps nothing; a step never reached cannot be redone from", async () => {
    const store = createMemoryStore(testOptions("phone"));
    const first = await walk(store, through(["predict", "build"]));
    const events = await store.events(first.id);
    expect(eventsBeforeStep(events, "question")).toEqual([]);
    expect(redoEvents(events, "question", first.id)).toEqual([
      { kind: "run.start", data: { from: "question", of: first.id } },
    ]);
    expect(eventsBeforeStep(events, "measure")).toBeUndefined();
    expect(redoEvents(events, "measure", first.id)).toBeUndefined();
  });

  test("a damaged marker is ignored, and only the first marker counts", () => {
    const e = (kind: string, data: unknown, seq: number) =>
      ({ id: `e${seq}`, attemptId: "a", seq, device: "d", at: 0, kind, data }) as never;
    const a = {
      id: "a",
      experimentId: "x",
      mode: "guided",
      seed: 1,
      createdAt: 0,
      updatedAt: 0,
      formatVersion: 1,
    } as const;
    expect(replay(runProjection, a, [e("run.start", { from: "nowhere", of: "b" }, 1)])).toBe(
      undefined,
    );
    expect(
      replay(runProjection, a, [
        e("run.start", { from: "plot", of: "b" }, 1),
        e("run.start", { from: "build", of: "c" }, 2),
      ]),
    ).toEqual({ from: "plot", of: "b" });
  });
});
