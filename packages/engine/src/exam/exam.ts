import type { Projection } from "../events/replay";
import type { LabEvent, NewEvent } from "../events/types";

/**
 * Exam mode (master plan, "Exam mode"): an attempt in mode "exam" runs to the WASSCE hour. The
 * clock starts with `exam.start` and stops with `exam.hand-in`; both carry the moment they were
 * recorded (the event's own time), so the clock is the same on reload and after sync. The coach is
 * off for the whole attempt (the step machine refuses hints in mode "exam").
 */

export interface ExamState {
  /** When the clock started, ms since 1970. */
  startedAt: number | undefined;
  /** When the script was handed in, and whether the clock did it. */
  handedInAt: number | undefined;
  auto: boolean;
}

export const EMPTY_EXAM: ExamState = { startedAt: undefined, handedInAt: undefined, auto: false };

export type ExamCommand = { type: "start" } | { type: "hand-in"; auto: boolean };

export function decideExam(
  mode: string,
  state: ExamState,
  c: ExamCommand,
): { ok: true; events: NewEvent[] } | { ok: false; reason: string } {
  if (mode !== "exam") return { ok: false, reason: "not-an-exam" };
  if (c.type === "start")
    return state.startedAt === undefined
      ? { ok: true, events: [{ kind: "exam.start", data: {} }] }
      : { ok: false, reason: "started" };
  if (state.startedAt === undefined) return { ok: false, reason: "not-started" };
  if (state.handedInAt !== undefined) return { ok: false, reason: "handed-in" };
  return { ok: true, events: [{ kind: "exam.hand-in", data: { auto: c.auto } }] };
}

export const examProjection: Projection<ExamState> = {
  initial: () => EMPTY_EXAM,
  apply(state, e: LabEvent) {
    if (e.kind === "exam.start" && state.startedAt === undefined)
      return { ...state, startedAt: e.at };
    if (
      e.kind === "exam.hand-in" &&
      state.startedAt !== undefined &&
      state.handedInAt === undefined
    )
      return {
        ...state,
        handedInAt: e.at,
        auto: (e.data as { auto?: unknown } | null)?.auto === true,
      };
    return state;
  },
};
