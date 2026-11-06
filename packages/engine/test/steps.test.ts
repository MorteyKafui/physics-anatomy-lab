import { describe, expect, test } from "bun:test";
import fc from "fast-check";

import {
  decide,
  frontier,
  guidedProjection,
  HELP_LEVELS,
  initialGuidedState,
  replay,
  STEPS,
  type Attempt,
  type Command,
  type GuidedState,
  type LabEvent,
  type NewEvent,
} from "../src";

const READINGS = ["r1", "r2"];

/** Every command the model checker tries in every state: the same alphabet as the TLA+ spec. */
const ALPHABET: Command[] = [
  ...STEPS.map((step): Command => ({ type: "go-to-step", step })),
  { type: "complete-step" },
  ...READINGS.flatMap((id): Command[] => [
    { type: "record-reading", id, data: { value: id === "r1" ? 40.12 : 40.08 } },
    { type: "delete-reading", id },
    { type: "restore-reading", id },
  ]),
  ...HELP_LEVELS.map((level): Command => ({ type: "set-help-level", level })),
  { type: "show-hint", hint: "count-from-zero" },
  { type: "read-feedback" },
  { type: "reveal-accepted-value" },
];

const attemptIn = (mode: Attempt["mode"]): Attempt => ({
  id: "a",
  experimentId: "simple-pendulum",
  mode,
  seed: 1,
  createdAt: 0,
  updatedAt: 0,
  formatVersion: 1,
});

let seq = 0;
const asEvent = (e: NewEvent): LabEvent => ({
  ...e,
  id: `e${++seq}`,
  attemptId: "a",
  seq,
  device: "d",
  at: 0,
});

/** Apply a command through the real code path: decide, then the projection replays the event. */
function run(state: GuidedState, command: Command): GuidedState | undefined {
  const d = decide(state, command);
  if (!d.ok) return undefined;
  return d.events.reduce((s, e) => guidedProjection.apply(s, asEvent(e)), state);
}

/** Hints only matter as "none" or "some", which keeps the state space finite. */
const key = (s: GuidedState) => JSON.stringify({ ...s, hintsShown: Math.min(s.hintsShown, 1) });

/** The four rules, checked in one state (the TLA+ invariants, plus the type shape). */
function violations(s: GuidedState, recordedEver: Set<string>): string[] {
  const out: string[] = [];
  if (s.mode === "exam" && s.hintsShown > 0) out.push("exam mode showed a hint");
  const held = new Set([...s.readings, ...s.deleted].map((r) => r.id));
  for (const id of recordedEver) if (!held.has(id)) out.push(`reading ${id} was lost`);
  if (s.acceptedValueShown && !(s.completed.includes("analyse") && s.feedbackRead)) {
    out.push("the accepted value was shown too early");
  }
  if (!STEPS.includes(s.step)) out.push(`unknown step ${s.step}`);
  if (STEPS.indexOf(s.step) > STEPS.indexOf(frontier(s))) out.push("on a step beyond the frontier");
  return out;
}

describe("model check: every reachable state, every mode", () => {
  for (const mode of ["guided", "exam", "own-data"] as const) {
    test(`${mode}: the four rules hold everywhere, and the report is always reachable`, () => {
      const start = initialGuidedState(attemptIn(mode));
      const states = new Map<string, GuidedState>([[key(start), start]]);
      const edges = new Map<string, Set<string>>();
      const queue = [start];
      const recorded = (s: GuidedState) => new Set([...s.readings, ...s.deleted].map((r) => r.id));

      while (queue.length) {
        const s = queue.shift()!;
        const k = key(s);
        expect(violations(s, recorded(s))).toEqual([]);
        for (const c of ALPHABET) {
          const next = run(s, c);
          if (!next) continue;
          // No reading is ever lost: anything held before a move is still held after it.
          for (const id of recorded(s)) expect(recorded(next).has(id)).toBe(true);
          // Completed steps never shrink.
          for (const done of s.completed) expect(next.completed).toContain(done);
          const nk = key(next);
          if (!edges.has(k)) edges.set(k, new Set());
          edges.get(k)!.add(nk);
          if (!states.has(nk)) {
            states.set(nk, next);
            queue.push(next);
          }
        }
      }

      // A student can always reach a report: walk the edges backwards from every report state.
      const reverse = new Map<string, string[]>();
      for (const [from, tos] of edges)
        for (const to of tos) reverse.set(to, [...(reverse.get(to) ?? []), from]);
      const canReach = new Set([...states].filter(([, s]) => s.step === "report").map(([k]) => k));
      const stack = [...canReach];
      while (stack.length) {
        for (const from of reverse.get(stack.pop()!) ?? []) {
          if (!canReach.has(from)) {
            canReach.add(from);
            stack.push(from);
          }
        }
      }
      const stuck = [...states.keys()].filter((k) => !canReach.has(k));
      expect(stuck).toEqual([]);
      expect(states.size).toBeGreaterThan(1000);
    });
  }
});

describe("the machine", () => {
  const guided = initialGuidedState(attemptIn("guided"));

  test("steps forward only as far as the first unfinished step, and back anywhere", () => {
    expect(decide(guided, { type: "go-to-step", step: "predict" })).toEqual({
      ok: false,
      reason: "step-not-open",
    });
    const s = run(guided, { type: "complete-step" })!;
    expect(decide(s, { type: "go-to-step", step: "predict" }).ok).toBe(true);
    expect(decide(s, { type: "go-to-step", step: "build" })).toEqual({
      ok: false,
      reason: "step-not-open",
    });
  });

  test("measure cannot finish without a reading", () => {
    let s = guided;
    for (let i = 0; i < 4; i++)
      s = run(run(s, { type: "complete-step" })!, { type: "go-to-step", step: STEPS[i + 1]! })!;
    expect(s.step).toBe("measure");
    expect(decide(s, { type: "complete-step" })).toEqual({
      ok: false,
      reason: "measure-needs-a-reading",
    });
    s = run(s, { type: "record-reading", id: "r1", data: { t: 40.12 } })!;
    expect(decide(s, { type: "complete-step" }).ok).toBe(true);
  });

  test("exam mode refuses hints and help-level changes", () => {
    const exam = initialGuidedState(attemptIn("exam"));
    expect(decide(exam, { type: "show-hint", hint: "x" })).toEqual({
      ok: false,
      reason: "coach-off-in-exam",
    });
    expect(decide(exam, { type: "set-help-level", level: "auto" })).toEqual({
      ok: false,
      reason: "coach-off-in-exam",
    });
  });

  test("the accepted value waits for analysis and feedback", () => {
    const analysed = { ...guided, completed: [...STEPS.slice(0, 8)], step: "analyse" as const };
    expect(decide(guided, { type: "reveal-accepted-value" })).toEqual({
      ok: false,
      reason: "analyse-first",
    });
    expect(decide(analysed, { type: "reveal-accepted-value" })).toEqual({
      ok: false,
      reason: "read-feedback-first",
    });
    const read = run(analysed, { type: "read-feedback" })!;
    expect(run(read, { type: "reveal-accepted-value" })!.acceptedValueShown).toBe(true);
  });
});

describe("the projection never breaks a rule, whatever events it is given", () => {
  const dataArb = fc.oneof(
    fc.constant(null),
    fc.dictionary(
      fc.constantFrom("step", "id", "level", "hint", "data"),
      fc.oneof(
        fc.string(),
        fc.constantFrom(...STEPS, ...READINGS, ...HELP_LEVELS),
        fc.constant(null),
      ),
    ),
  );
  const eventArb = fc.record({
    kind: fc.constantFrom(
      "step.go-to",
      "step.complete",
      "reading.record",
      "reading.delete",
      "reading.restore",
      "coach.set-level",
      "coach.hint",
      "feedback.read",
      "accepted-value.reveal",
      "unrelated.kind",
    ),
    data: dataArb,
  });

  test("random, tampered or out-of-order event lists", () => {
    fc.assert(
      fc.property(
        fc.constantFrom("guided", "exam", "own-data" as const),
        fc.array(eventArb, { maxLength: 60 }),
        (mode, news) => {
          const events = news.map((n, i): LabEvent => ({
            ...n,
            id: `x${i}`,
            attemptId: "a",
            seq: i + 1,
            device: "d",
            at: 0,
          }));
          const state = replay(guidedProjection, attemptIn(mode as Attempt["mode"]), events);
          // Readings the projection accepted, from the events it would have applied.
          const ever = new Set(state.readings.concat(state.deleted).map((r) => r.id));
          return (
            violations(state, ever).length === 0 && (mode !== "exam" || state.hintsShown === 0)
          );
        },
      ),
      { numRuns: 2000 },
    );
  });

  test("a hint event smuggled into an exam attempt is ignored", () => {
    const events: LabEvent[] = [
      {
        id: "h",
        attemptId: "a",
        seq: 1,
        device: "d",
        at: 0,
        kind: "coach.hint",
        data: { hint: "x" },
      },
    ];
    expect(replay(guidedProjection, attemptIn("exam"), events).hintsShown).toBe(0);
  });
});
