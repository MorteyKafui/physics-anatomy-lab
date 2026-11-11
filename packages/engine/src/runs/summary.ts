import type { Attempt, Json, LabEvent } from "../events/types";
import { compareEvents } from "../events/types";
import { STEPS, type Step } from "../steps/machine";

/**
 * What one run of an experiment looked like, from its events alone: for the unaided test
 * (master plan Phase 1, `docs/how-to/run-the-unaided-test.md`) and, later, for a teacher's view.
 * It reads only what the lab recorded, and nothing in it identifies a person.
 */
export interface RunSummary {
  mode: Attempt["mode"];
  /** Every step up to the report was completed. */
  finished: boolean;
  /** The step the run was on at its last event. */
  reached: Step;
  /** Wall-clock time from the first to the last event, s. */
  seconds: number;
  /** Seconds from arriving at each step to completing it, for the steps completed. */
  stepSeconds: Partial<Record<Step, number>>;
  /** Times the coach stepped in visibly (a highlight, a written hint or a demonstration). */
  coachHelp: number;
  /** The same, by level of help. */
  coachHelpByLevel: Record<string, number>;
  /** The skills the coach helped with, most often first. */
  coachHelpBySkill: [skill: string, times: number][];
  /** Times the student went back to an earlier step. */
  wentBack: number;
  /** Readings recorded (including any later deleted). */
  readings: number;
  /** Parts placed on the bench, and taken off again. */
  partsPlaced: number;
  partsRemoved: number;
}

const isStep = (v: unknown): v is Step =>
  typeof v === "string" && (STEPS as readonly string[]).includes(v);
const stepOf = (e: LabEvent): Step | undefined => {
  const step = (e.data as Record<string, Json> | null)?.step;
  return isStep(step) ? step : undefined;
};
const index = (s: Step) => STEPS.indexOf(s);

export function summariseRun(attempt: Attempt, events: readonly LabEvent[]): RunSummary {
  const ordered = [...events].sort(compareEvents);
  const first = ordered[0]?.at ?? attempt.createdAt;
  const last = ordered.at(-1)?.at ?? attempt.createdAt;

  let step: Step = STEPS[0];
  let arrived = first;
  const completed = new Set<Step>();
  const stepSeconds: Partial<Record<Step, number>> = {};
  const byLevel: Record<string, number> = {};
  const bySkill = new Map<string, number>();
  let coachHelp = 0;
  let wentBack = 0;
  let readings = 0;
  let partsPlaced = 0;
  let partsRemoved = 0;

  for (const e of ordered) {
    switch (e.kind) {
      case "step.complete": {
        const s: Step = stepOf(e) ?? step;
        completed.add(s);
        stepSeconds[s] = (stepSeconds[s] ?? 0) + (e.at - arrived) / 1000;
        const next: Step | undefined = STEPS[index(s) + 1];
        if (next) step = next;
        arrived = e.at;
        break;
      }
      case "step.go-to": {
        const s = stepOf(e);
        if (!s) break;
        if (index(s) < index(step)) wentBack += 1;
        step = s;
        arrived = e.at;
        break;
      }
      case "coach.hint": {
        const d = (e.data ?? {}) as Record<string, Json>;
        coachHelp += 1;
        const level = typeof d.level === "string" ? d.level : "hint";
        byLevel[level] = (byLevel[level] ?? 0) + 1;
        if (typeof d.skill === "string") bySkill.set(d.skill, (bySkill.get(d.skill) ?? 0) + 1);
        break;
      }
      case "reading.record":
        readings += 1;
        break;
      case "part.place":
        partsPlaced += 1;
        break;
      case "part.remove":
        partsRemoved += 1;
        break;
    }
  }

  const beforeReport = STEPS.slice(0, -1);
  return {
    mode: attempt.mode,
    finished: beforeReport.every((s) => completed.has(s)),
    reached: step,
    seconds: (last - first) / 1000,
    stepSeconds,
    coachHelp,
    coachHelpByLevel: byLevel,
    coachHelpBySkill: [...bySkill].sort((a, b) => b[1] - a[1]),
    wentBack,
    readings,
    partsPlaced,
    partsRemoved,
  };
}
