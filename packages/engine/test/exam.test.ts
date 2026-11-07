import { describe, expect, test } from "bun:test";

import {
  decideExam,
  EMPTY_EXAM,
  examProjection,
  replay,
  type Attempt,
  type LabEvent,
} from "../src";

const exam: Attempt = {
  id: "x",
  experimentId: "simple-pendulum",
  mode: "exam",
  seed: 3,
  createdAt: 0,
  updatedAt: 0,
  formatVersion: 1,
};
const ev = (kind: string, at: number, data: unknown = {}): LabEvent =>
  ({ id: `e${at}`, attemptId: "x", seq: at, device: "d", at, kind, data }) as LabEvent;

describe("the exam clock", () => {
  test("starts once and is handed in once, each at the moment it was recorded", () => {
    const state = replay(examProjection, exam, [
      ev("exam.start", 1000),
      ev("exam.start", 2000),
      ev("exam.hand-in", 3000, { auto: false }),
      ev("exam.hand-in", 4000, { auto: true }),
    ]);
    expect(state).toEqual({ startedAt: 1000, handedInAt: 3000, auto: false });
  });

  test("a hand-in before the start is ignored", () => {
    expect(replay(examProjection, exam, [ev("exam.hand-in", 10)])).toEqual(EMPTY_EXAM);
  });

  test("only an exam attempt has a clock, and it runs in order", () => {
    expect(decideExam("guided", EMPTY_EXAM, { type: "start" }).ok).toBe(false);
    expect(decideExam("exam", EMPTY_EXAM, { type: "hand-in", auto: false }).ok).toBe(false);
    expect(decideExam("exam", EMPTY_EXAM, { type: "start" })).toEqual({
      ok: true,
      events: [{ kind: "exam.start", data: {} }],
    });
    const started = { ...EMPTY_EXAM, startedAt: 5 };
    expect(decideExam("exam", started, { type: "start" }).ok).toBe(false);
    expect(decideExam("exam", started, { type: "hand-in", auto: true }).ok).toBe(true);
    expect(
      decideExam("exam", { ...started, handedInAt: 9 }, { type: "hand-in", auto: false }).ok,
    ).toBe(false);
  });
});
