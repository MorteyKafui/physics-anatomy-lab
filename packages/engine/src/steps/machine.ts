import type { Attempt, Json, LabEvent, NewEvent } from "../events/types";
import type { Projection } from "../events/replay";

/**
 * The ten steps of an attempt (GLOSSARY.md) and the rules for moving between them. The machine
 * is modelled in spec/GuidedSteps.tla and checked by TLC; test/steps.test.ts checks this code
 * exhaustively against the same rules:
 *
 *   1. a student can always reach a report;
 *   2. no reading is ever lost (deleting keeps it, restorable; stepping back keeps everything);
 *   3. exam mode never shows a hint;
 *   4. the accepted value stays hidden until the student has analysed their own data and read
 *      the feedback.
 *
 * Two halves: `decide` turns what the student asks for into events, or refuses with a reason;
 * `guidedProjection` rebuilds the state from events. The projection also ignores any event that
 * breaks a rule (a damaged file, a bad sync), so the rules hold for every state it can produce.
 */

export const STEPS = [
  "question",
  "predict",
  "build",
  "check",
  "measure",
  "tabulate",
  "plot",
  "analyse",
  "conclude",
  "report",
] as const;
export type Step = (typeof STEPS)[number];

/** How much the coach steps in (GLOSSARY.md, "Help level"). Exam mode turns the coach off. */
export const HELP_LEVELS = ["auto", "check-my-work", "on-my-own"] as const;
export type HelpLevel = (typeof HELP_LEVELS)[number];

export interface GuidedState {
  mode: Attempt["mode"];
  helpLevel: HelpLevel;
  step: Step;
  /** Steps whose exit check has passed. Never shrinks. */
  completed: Step[];
  /** Readings in the table, in the order taken: id and what the student recorded. */
  readings: { id: string; data: Json }[];
  /** Readings the student removed. They can be restored, so none is ever lost. */
  deleted: { id: string; data: Json }[];
  hintsShown: number;
  feedbackRead: boolean;
  acceptedValueShown: boolean;
}

export const index = (s: Step) => STEPS.indexOf(s);

/** The furthest step the student may open: the first one not yet completed. */
export function frontier(state: Pick<GuidedState, "completed">): Step {
  return STEPS.find((s) => !state.completed.includes(s)) ?? "report";
}

export const coachIsOn = (state: Pick<GuidedState, "mode">) => state.mode !== "exam";

/** What the student (or the lab, on their behalf) asks to do. */
export type Command =
  | { type: "go-to-step"; step: Step }
  | { type: "complete-step" }
  | { type: "record-reading"; id: string; data: Json }
  | { type: "delete-reading"; id: string }
  | { type: "restore-reading"; id: string }
  | { type: "set-help-level"; level: HelpLevel }
  | { type: "show-hint"; hint: string }
  | { type: "read-feedback" }
  | { type: "reveal-accepted-value" };

/** Why a command was refused: a message key for packages/i18n, under steps.refused. */
export type Refusal =
  | "step-not-open"
  | "already-on-step"
  | "step-already-complete"
  | "measure-needs-a-reading"
  | "readings-only-in-measure"
  | "reading-exists"
  | "no-such-reading"
  | "not-deleted"
  | "coach-off-in-exam"
  | "analyse-first"
  | "read-feedback-first";

export type Decision = { ok: true; events: NewEvent[] } | { ok: false; reason: Refusal };

const refuse = (reason: Refusal): Decision => ({ ok: false, reason });
const accept = (kind: string, data: Json): Decision => ({ ok: true, events: [{ kind, data }] });

/** Turn a command into events, or refuse it. Pure: the caller appends the events to the store. */
export function decide(state: GuidedState, command: Command): Decision {
  const known = (id: string) => [...state.readings, ...state.deleted].some((r) => r.id === id);
  switch (command.type) {
    case "go-to-step": {
      if (command.step === state.step) return refuse("already-on-step");
      if (index(command.step) > index(frontier(state))) return refuse("step-not-open");
      return accept("step.go-to", { step: command.step });
    }
    case "complete-step": {
      if (state.completed.includes(state.step)) return refuse("step-already-complete");
      if (state.step === "measure" && state.readings.length === 0)
        return refuse("measure-needs-a-reading");
      return accept("step.complete", { step: state.step });
    }
    case "record-reading": {
      if (state.step !== "measure") return refuse("readings-only-in-measure");
      if (known(command.id)) return refuse("reading-exists");
      return accept("reading.record", { id: command.id, data: command.data });
    }
    case "delete-reading": {
      if (state.step !== "measure" && state.step !== "tabulate")
        return refuse("readings-only-in-measure");
      if (!state.readings.some((r) => r.id === command.id)) return refuse("no-such-reading");
      return accept("reading.delete", { id: command.id });
    }
    case "restore-reading": {
      if (!state.deleted.some((r) => r.id === command.id)) return refuse("not-deleted");
      return accept("reading.restore", { id: command.id });
    }
    case "set-help-level": {
      if (!coachIsOn(state)) return refuse("coach-off-in-exam");
      return accept("coach.set-level", { level: command.level });
    }
    case "show-hint": {
      if (!coachIsOn(state)) return refuse("coach-off-in-exam");
      return accept("coach.hint", { hint: command.hint });
    }
    case "read-feedback": {
      if (!state.completed.includes("analyse")) return refuse("analyse-first");
      return accept("feedback.read", {});
    }
    case "reveal-accepted-value": {
      if (!state.completed.includes("analyse")) return refuse("analyse-first");
      if (!state.feedbackRead) return refuse("read-feedback-first");
      return accept("accepted-value.reveal", {});
    }
  }
}

/** The command an event records, or undefined for an event this machine does not handle. */
function commandOf(e: LabEvent): Command | undefined {
  const d = (e.data ?? {}) as Record<string, Json>;
  const isStep = (v: Json | undefined): v is Step =>
    typeof v === "string" && (STEPS as readonly string[]).includes(v);
  switch (e.kind) {
    case "step.go-to":
      return isStep(d.step) ? { type: "go-to-step", step: d.step } : undefined;
    case "step.complete":
      return { type: "complete-step" };
    case "reading.record":
      return typeof d.id === "string"
        ? { type: "record-reading", id: d.id, data: d.data ?? null }
        : undefined;
    case "reading.delete":
      return typeof d.id === "string" ? { type: "delete-reading", id: d.id } : undefined;
    case "reading.restore":
      return typeof d.id === "string" ? { type: "restore-reading", id: d.id } : undefined;
    case "coach.set-level":
      return (HELP_LEVELS as readonly Json[]).includes(d.level ?? null)
        ? { type: "set-help-level", level: d.level as HelpLevel }
        : undefined;
    case "coach.hint":
      return typeof d.hint === "string" ? { type: "show-hint", hint: d.hint } : undefined;
    case "feedback.read":
      return { type: "read-feedback" };
    case "accepted-value.reveal":
      return { type: "reveal-accepted-value" };
    default:
      return undefined;
  }
}

/** The state after a command the machine has accepted. */
export function step(state: GuidedState, command: Command): GuidedState {
  switch (command.type) {
    case "go-to-step":
      return { ...state, step: command.step };
    case "complete-step":
      return { ...state, completed: [...state.completed, state.step] };
    case "record-reading":
      return { ...state, readings: [...state.readings, { id: command.id, data: command.data }] };
    case "delete-reading": {
      const r = state.readings.find((x) => x.id === command.id)!;
      return {
        ...state,
        readings: state.readings.filter((x) => x !== r),
        deleted: [...state.deleted, r],
      };
    }
    case "restore-reading": {
      const r = state.deleted.find((x) => x.id === command.id)!;
      return {
        ...state,
        deleted: state.deleted.filter((x) => x !== r),
        readings: [...state.readings, r],
      };
    }
    case "set-help-level":
      return { ...state, helpLevel: command.level };
    case "show-hint":
      return { ...state, hintsShown: state.hintsShown + 1 };
    case "read-feedback":
      return { ...state, feedbackRead: true };
    case "reveal-accepted-value":
      return { ...state, acceptedValueShown: true };
  }
}

export function initialGuidedState(attempt: Pick<Attempt, "mode">): GuidedState {
  return {
    mode: attempt.mode,
    helpLevel: "auto",
    step: "question",
    completed: [],
    readings: [],
    deleted: [],
    hintsShown: 0,
    feedbackRead: false,
    acceptedValueShown: false,
  };
}

/**
 * Rebuild the step state from an attempt's events. An event is applied only if `decide` would
 * have accepted it in the state reached so far; anything else is skipped, so a damaged or
 * tampered event list can never break the rules.
 */
export const guidedProjection: Projection<GuidedState> = {
  initial: initialGuidedState,
  apply(state, event) {
    const command = commandOf(event);
    if (!command || !decide(state, command).ok) return state;
    return step(state, command);
  },
};
