import { describe, expect, test } from "bun:test";

import {
  answersProjection,
  EMPTY_ANSWERS,
  replay,
  writeAnswer,
  type Attempt,
  type LabEvent,
  type NewEvent,
} from "../src";

const attempt: Attempt = {
  id: "a",
  experimentId: "simple-pendulum",
  mode: "guided",
  seed: 1,
  createdAt: 0,
  updatedAt: 0,
  formatVersion: 1,
};
const asEvents = (news: NewEvent[]): LabEvent[] =>
  news.map((e, i) => ({ ...e, id: `e${i}`, attemptId: "a", seq: i + 1, device: "d", at: i }));

describe("written answers", () => {
  test("keep exactly what was typed, the latest for each answer", () => {
    const events = [
      writeAnswer(EMPTY_ANSWERS, "slope", { value: "4.0", unit: "" })!,
      writeAnswer(EMPTY_ANSWERS, "slope", { value: "4.03", unit: "s² m⁻¹" })!,
      writeAnswer(EMPTY_ANSWERS, "g", { value: "9.80", unit: "m s⁻²" })!,
    ];
    expect(replay(answersProjection, attempt, asEvents(events))).toEqual({
      slope: { value: "4.03", unit: "s² m⁻¹" },
      g: { value: "9.80", unit: "m s⁻²" },
    });
  });

  test("an unchanged answer makes no event, and a damaged one is ignored", () => {
    const state = { slope: { value: "4.03", unit: "s² m⁻¹" } };
    expect(writeAnswer(state, "slope", { value: "4.03", unit: "s² m⁻¹" })).toBeUndefined();
    expect(writeAnswer(state, "", { value: "1", unit: "" })).toBeUndefined();
    const bad = { kind: "answer.write", data: { id: "slope", value: 4.03, unit: null } };
    expect(replay(answersProjection, attempt, asEvents([bad as unknown as NewEvent]))).toEqual({});
  });
});
