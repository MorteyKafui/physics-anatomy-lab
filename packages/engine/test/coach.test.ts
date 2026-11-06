import { describe, expect, test } from "bun:test";
import { parseTable, runRules, TABLE_RULES, type Finding, type TableView } from "@pa/analysis";
import fc from "fast-check";

import {
  coach,
  coachProjection,
  createMemoryStore,
  helpLevelFor,
  replay,
  resume,
  type Attempt,
  type CoachState,
  type HelpLevel,
  type LabEvent,
  type Moment,
  type NewEvent,
  setSkillLevel,
} from "../src";

const attempt = (mode: Attempt["mode"]): Attempt => ({
  id: "a",
  experimentId: "simple-pendulum",
  mode,
  seed: 1,
  createdAt: 0,
  updatedAt: 0,
  formatVersion: 1,
});

const meanSlip: Finding = {
  rule: "table-mean-decimals",
  severity: "warning",
  skill: "tabulation",
  key: "table.meanDecimals",
  params: { expected: 3 },
  rows: ["r3"],
};
const scaleTooSmall: Finding = {
  rule: "graph-scale",
  severity: "warning",
  skill: "graph",
  key: "graph.scaleTooSmall",
};
const praise: Finding = {
  rule: "table-too-few-rows",
  severity: "good",
  skill: "tabulation",
  key: "table.enoughRows",
};

let seq = 0;
const asEvents = (news: NewEvent[]): LabEvent[] =>
  news.map((n) => ({ ...n, id: `e${++seq}`, attemptId: "a", seq, device: "d", at: 0 }));

/** Run the coach and fold its events back in, as the lab does. */
function step(state: CoachState, findings: Finding[], moment: Moment) {
  const out = coach(state, findings, moment);
  return { ...out, state: asEvents(out.events).reduce(coachProjection.apply, state) };
}

const start = (mode: Attempt["mode"], level: HelpLevel = "auto"): CoachState => ({
  ...coachProjection.initial(attempt(mode)),
  helpLevel: level,
});

describe("escalation in Auto", () => {
  test("watch silently, then highlight, then a written hint, then a demonstration", () => {
    let s = start("guided");
    const levels: string[] = [];
    for (let i = 0; i < 5; i++) {
      const out = step(s, [meanSlip], "live");
      levels.push(out.advice[0]?.level ?? "silent");
      s = out.state;
    }
    expect(levels).toEqual(["silent", "highlight", "hint", "demonstrate", "demonstrate"]);
    expect(s.seen.tabulation).toBe(5);
  });

  test("each skill escalates on its own", () => {
    let s = start("guided");
    for (let i = 0; i < 3; i++) s = step(s, [meanSlip], "live").state;
    const out = step(s, [meanSlip, scaleTooSmall], "live");
    expect(out.advice).toEqual([{ finding: meanSlip, level: "demonstrate" }]);
    expect(out.events.map((e) => e.kind)).toEqual(["coach.hint", "coach.note"]);
  });

  test("praise and tips are not hints", () => {
    expect(coach(start("guided"), [praise], "live")).toEqual({ advice: [], events: [] });
  });
});

describe("help levels", () => {
  test("Check my work says nothing while the student works, and checks when a step is finished", () => {
    const s = start("guided", "check-my-work");
    expect(coach(s, [meanSlip], "live")).toEqual({ advice: [], events: [] });
    expect(coach(s, [meanSlip], "step-exit").advice).toEqual([
      { finding: meanSlip, level: "hint" },
    ]);
  });

  test("On my own speaks only when asked, with the single most serious problem", () => {
    const s = start("guided", "on-my-own");
    expect(coach(s, [meanSlip], "live").events).toEqual([]);
    expect(coach(s, [meanSlip], "step-exit").events).toEqual([]);
    const error: Finding = { ...scaleTooSmall, severity: "error" };
    expect(coach(s, [error, meanSlip], "asked").advice).toEqual([
      { finding: error, level: "hint" },
    ]);
  });
});

describe("exam mode never shows a hint", () => {
  const findingArb = fc.record({
    rule: fc.string(),
    severity: fc.constantFrom("error", "warning", "tip", "good" as const),
    skill: fc.constantFrom(
      "apparatus",
      "measurement",
      "tabulation",
      "graph",
      "analysis",
      "writing" as const,
    ),
    key: fc.string(),
  });

  test("for any findings, at any moment, at any help level", () => {
    fc.assert(
      fc.property(
        fc.array(findingArb, { maxLength: 8 }),
        fc.constantFrom("live", "step-exit", "asked" as const),
        fc.constantFrom("auto", "check-my-work", "on-my-own" as const),
        (findings, moment, level) => {
          const out = coach(start("exam", level), findings as Finding[], moment);
          return out.advice.length === 0 && out.events.length === 0;
        },
      ),
    );
  });

  test("coach events smuggled into an exam attempt change nothing", () => {
    const events = asEvents([
      { kind: "coach.hint", data: { hint: "x", skill: "tabulation", level: "hint", rule: "r" } },
      { kind: "coach.note", data: { hint: "x", skill: "graph", level: "watch", rule: "r" } },
    ]);
    const s = replay(coachProjection, attempt("exam"), events);
    expect(s.hintsShown).toBe(0);
    expect(s.seen).toEqual({});
  });
});

describe("escalation survives closing and reopening the app", () => {
  test("resume rebuilds what the coach has done, and it carries on from there", async () => {
    const store = createMemoryStore({ device: "tablet-a" });
    const a = await store.createAttempt({
      experimentId: "simple-pendulum",
      mode: "guided",
      seed: 1,
    });
    let s = (await resume(store, a.id, coachProjection)).state;
    for (let i = 0; i < 2; i++) {
      const out = coach(s, [meanSlip], "live");
      await store.append(a.id, out.events);
      s = (await resume(store, a.id, coachProjection)).state;
    }
    expect(s.seen.tabulation).toBe(2);
    expect(coach(s, [meanSlip], "live").advice[0]?.level).toBe("hint");
  });
});

describe("from a student's table to the coach", () => {
  test("a mean with too few decimal places is noticed, then highlighted on the row", () => {
    const table: TableView = {
      columns: [
        { id: "l", symbol: "l", kind: "length", unit: "cm", source: "given" },
        {
          id: "t1",
          symbol: "t₁",
          kind: "time",
          unit: "s",
          source: "measured",
          leastCount: { value: 0.01, unit: "s" },
        },
        {
          id: "t2",
          symbol: "t₂",
          kind: "time",
          unit: "s",
          source: "measured",
          leastCount: { value: 0.01, unit: "s" },
        },
        { id: "t", symbol: "t", kind: "time", unit: "s", source: "derived", meanOf: ["t1", "t2"] },
      ],
      rows: [
        { id: "r1", cells: { l: "100.0", t1: "40.12", t2: "40.08", t: "40.100" } },
        { id: "r2", cells: { l: "90.0", t1: "38.06", t2: "38.10", t: "38.080" } },
        { id: "r3", cells: { l: "80.0", t1: "35.90", t2: "35.92", t: "35.91" } },
        { id: "r4", cells: { l: "70.0", t1: "33.52", t2: "33.48", t: "33.500" } },
        { id: "r5", cells: { l: "60.0", t1: "31.06", t2: "31.10", t: "31.080" } },
      ],
    };
    const findings = runRules(TABLE_RULES, { table: parseTable(table) });
    let s = start("guided");
    s = step(s, findings, "live").state;
    const out = step(s, findings, "live");
    const mean = out.advice.find((a) => a.finding.rule === "table-mean-decimals");
    expect(mean).toMatchObject({ level: "highlight", finding: { rows: ["r3"] } });
  });

  test("one problem per skill at a time: with too few rows, that comes first", () => {
    const table: TableView = {
      columns: [
        { id: "t1", symbol: "t₁", kind: "time", unit: "s", source: "measured" },
        { id: "t2", symbol: "t₂", kind: "time", unit: "s", source: "measured" },
        { id: "t", symbol: "t", kind: "time", unit: "s", source: "derived", meanOf: ["t1", "t2"] },
      ],
      rows: [{ id: "r1", cells: { t1: "35.90", t2: "35.92", t: "35.91" } }],
    };
    const findings = runRules(TABLE_RULES, { table: parseTable(table) });
    const out = coach({ ...start("guided"), seen: { tabulation: 2 } }, findings, "live");
    expect(out.advice.map((a) => a.finding.rule)).toEqual(["table-too-few-rows"]);
  });
});

describe("help levels per skill", () => {
  const withLevel = (state: CoachState, skill: "graph" | "tabulation", level?: HelpLevel) => {
    const e = setSkillLevel(state, skill, level);
    return e ? asEvents([e]).reduce(coachProjection.apply, state) : state;
  };

  test("a skill set to On my own keeps quiet while the others follow the overall level", () => {
    // Watch once, so the next live finding is shown.
    let s = step(start("guided"), [meanSlip, scaleTooSmall], "live").state;
    s = withLevel(s, "graph", "on-my-own");
    expect(helpLevelFor(s, "graph")).toBe("on-my-own");
    expect(helpLevelFor(s, "tabulation")).toBe("auto");
    const shown = coach(s, [meanSlip, scaleTooSmall], "live").advice.map((a) => a.finding.skill);
    expect(shown).toEqual(["tabulation"]);
    expect(coach(s, [scaleTooSmall], "step-exit").advice).toEqual([]);
    // Asked, the coach still answers for that skill.
    expect(coach(s, [scaleTooSmall], "asked").advice.map((a) => a.finding.skill)).toEqual([
      "graph",
    ]);
  });

  test("clearing a skill's level returns it to the overall one", () => {
    const s = withLevel(
      withLevel(start("guided", "check-my-work"), "tabulation", "auto"),
      "tabulation",
    );
    expect(helpLevelFor(s, "tabulation")).toBe("check-my-work");
  });

  test("exam mode cannot be given a skill level, and a smuggled one is ignored", () => {
    const exam = start("exam");
    expect(setSkillLevel(exam, "graph", "auto")).toBeUndefined();
    const smuggled = asEvents([
      { kind: "coach.set-skill-level", data: { skill: "graph", level: "auto" } },
    ]).reduce(coachProjection.apply, exam);
    expect(smuggled.skillLevels).toEqual({});
  });
});
