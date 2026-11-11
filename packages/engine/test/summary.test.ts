import { describe, expect, test } from "bun:test";

import {
  coachProjection,
  createMemoryStore,
  decide,
  replay,
  STEPS,
  summariseRun,
  type Command,
  type EventStore,
} from "../src";
import { testOptions } from "./helpers";

// The test clock ticks one second per event (helpers.ts).
async function walk(store: EventStore, commands: Command[]) {
  const attempt = await store.createAttempt({
    experimentId: "simple-pendulum",
    mode: "guided",
    seed: 7,
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

describe("a run's summary, for the unaided test", () => {
  test("a run taken to the report is finished, with the time spent on each step", async () => {
    // The summary reads events only, so the run is written as the lab would record it.
    const store = createMemoryStore(testOptions("summary-a"));
    const attempt = await store.createAttempt({
      experimentId: "simple-pendulum",
      mode: "guided",
      seed: 7,
    });
    for (const [i, step] of STEPS.slice(0, -1).entries()) {
      await store.append(attempt.id, [{ kind: "step.complete", data: { step } }]);
      await store.append(attempt.id, [{ kind: "step.go-to", data: { step: STEPS[i + 1]! } }]);
    }
    const s = summariseRun(attempt, await store.events(attempt.id));
    expect(s.finished).toBe(true);
    expect(s.reached).toBe("report");
    expect(s.wentBack).toBe(0);
    expect(s.coachHelp).toBe(0);
    // Question is completed on the first event; every later step took one second to complete.
    expect(s.stepSeconds.predict).toBe(1);
    expect(s.stepSeconds.conclude).toBe(1);
  });

  test("counts the coach's visible help by level and skill, readings and going back", async () => {
    const store = createMemoryStore(testOptions("summary-b"));
    const attempt = await walk(store, [
      ...through(["predict", "build", "check", "measure"]),
      { type: "record-reading", id: "r1", data: { t: 34.1, count: 20, countedFromOne: true } },
      { type: "show-hint", hint: "count-from-zero" },
      { type: "go-to-step", step: "check" },
    ]);
    // The coach's own events, as the lab records them: a silent note does not count as help.
    await store.append(attempt.id, [
      { kind: "coach.note", data: { hint: "x", skill: "timing", level: "watch" } },
      { kind: "coach.hint", data: { hint: "y", skill: "timing", level: "demonstrate" } },
    ]);
    const s = summariseRun(attempt, await store.events(attempt.id));
    expect(s.finished).toBe(false);
    expect(s.reached).toBe("check");
    expect(s.wentBack).toBe(1);
    expect(s.readings).toBe(1);
    expect(s.coachHelp).toBe(2);
    expect(s.coachHelpByLevel).toEqual({ hint: 1, demonstrate: 1 });
    expect(s.coachHelpBySkill).toEqual([["timing", 1]]);
  });
});
