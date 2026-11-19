import { describe, expect, test } from "bun:test";
import type { Json, LabEvent } from "@pa/engine";

import { MAX_EVENTS, summariseEvents, tutorContext } from "../src/app/lab/tutor/context";

let seq = 0;
function ev(kind: string, data: Json): LabEvent {
  seq += 1;
  return { kind, data, id: `e${String(seq)}`, attemptId: "a", seq, device: "d", at: seq };
}

describe("what the tutor is sent", () => {
  test("only listed kinds and fields, with the step each happened in", () => {
    const events = [
      ev("part.place", { part: "boss-and-clamp", slot: "stand-rod" }),
      ev("step.go-to", { step: "measure" }),
      ev("reading.record", { id: "r1", data: { t: 36.12, l: 0.8, note: "Kofi timed this" } }),
      ev("coach.hint", { hint: "count-from-zero", rule: "count-from-one", skill: "measurement" }),
      ev("report.edit", { section: "conclusion", text: "My name is Kofi" }),
      ev("snapshot.caption", { id: "s1", caption: "Kofi's bench" }),
      ev("table.cell", { row: "row-7f3a", column: "t1", value: "36.12" }),
      ev("table.cell", { row: "row-7f3a", column: "notes", value: "done by Kofi" }),
      ev("answer.write", { id: "slope", value: "kofi", unit: "m s-2" }),
    ];
    expect(summariseEvents(events)).toEqual([
      {
        kind: "part.place",
        step: "question",
        detail: { part: "boss-and-clamp", slot: "stand-rod" },
      },
      { kind: "step.go-to", step: "measure", detail: { step: "measure" } },
      { kind: "reading.record", step: "measure", detail: { t: 36.12, l: 0.8 } },
      {
        kind: "coach.hint",
        step: "measure",
        detail: { rule: "count-from-one", skill: "measurement" },
      },
      { kind: "table.cell", step: "measure", detail: { column: "t1", value: 36.12 } },
      { kind: "table.cell", step: "measure", detail: { column: "notes" } },
      { kind: "answer.write", step: "measure", detail: { id: "slope" } },
    ]);
    expect(JSON.stringify(summariseEvents(events)).toLowerCase()).not.toContain("kofi");
  });

  test("the latest events only", () => {
    const many = Array.from({ length: 60 }, (_, i) => ev("reading.record", { data: { t: i } }));
    const out = summariseEvents(many);
    expect(out).toHaveLength(MAX_EVENTS);
    expect(out.at(-1)?.detail).toEqual({ t: 59 });
  });

  test("the request carries the question, the thread and the visible quantities", () => {
    const ctx = tutorContext({
      experimentId: "simple-pendulum",
      experimentVersion: 1,
      step: "measure",
      helpLevel: "auto",
      events: [],
      quantities: [{ symbol: "l", name: "Length of the pendulum", value: 0.8, unit: "m" }],
      question: "  Why zero?  ",
      thread: [
        { role: "student", text: "Hi" },
        { role: "tutor", text: "What have you tried?" },
      ],
    });
    expect(ctx).toEqual({
      experiment_id: "simple-pendulum",
      experiment_version: 1,
      step: "measure",
      help_level: "auto",
      events: [],
      quantities: [{ symbol: "l", name: "Length of the pendulum", value: 0.8, unit: "m" }],
      student_text: "Why zero?",
      thread: [
        { role: "student", text: "Hi" },
        { role: "tutor", text: "What have you tried?" },
      ],
    });
  });
});
