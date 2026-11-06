import type { Projection } from "../events/replay";
import type { Json, LabEvent, NewEvent } from "../events/types";

/**
 * The answers a student writes in the Analyse step (the slope, g), exactly as typed: the number
 * and the unit separately, so each can be checked on its own. Each change is an event, so the
 * working resumes exactly and a teacher can replay it.
 */

export interface WrittenAnswer {
  value: string;
  unit: string;
}

export type AnswersState = Readonly<Record<string, WrittenAnswer>>;

export const EMPTY_ANSWERS: AnswersState = {};

const MAX = 40;
const fits = (v: unknown, max = MAX): v is string => typeof v === "string" && v.length <= max;

/** The event for writing an answer, or undefined if it is not one (or nothing changed). */
export function writeAnswer(
  state: AnswersState,
  id: string,
  answer: WrittenAnswer,
): NewEvent | undefined {
  if (!fits(id, 20) || id === "" || !fits(answer.value) || !fits(answer.unit)) return undefined;
  const now = state[id];
  if (now && now.value === answer.value && now.unit === answer.unit) return undefined;
  return { kind: "answer.write", data: { id, value: answer.value, unit: answer.unit } };
}

export const answersProjection: Projection<AnswersState> = {
  initial: () => EMPTY_ANSWERS,
  apply(state, e: LabEvent) {
    if (e.kind !== "answer.write") return state;
    const d = (e.data ?? {}) as Record<string, Json>;
    if (!fits(d.id, 20) || d.id === "" || !fits(d.value) || !fits(d.unit)) return state;
    return { ...state, [d.id]: { value: d.value, unit: d.unit } };
  },
};
