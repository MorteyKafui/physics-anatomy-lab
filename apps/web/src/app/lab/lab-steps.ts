import { STEPS, type Command, type GuidedState, type Step } from "@pa/engine";

/**
 * The steps each practical's lab has built (LabOpen board, redesign brief section 4). A step whose
 * activity is not built yet stays out of the step strip, the header and the review, and the lab
 * carries an attempt straight past it (use-attempt.ts), so no screen mentions it.
 *
 * The simple pendulum was built first, before the lab had Question, Predict and Check activities;
 * the five later practicals build all ten.
 */
const HIDDEN: Readonly<Record<string, readonly Step[]>> = {
  "simple-pendulum": ["question", "predict", "check"],
};

/** The steps a practical's lab shows, in order. */
export const shownSteps = (experimentId: string): readonly Step[] => {
  const hidden = HIDDEN[experimentId] ?? [];
  return STEPS.filter((s) => !hidden.includes(s));
};

/** Whether a step is left out of a practical's lab. */
export const isHidden = (experimentId: string, step: Step) =>
  (HIDDEN[experimentId] ?? []).includes(step);

/** "Step n of total" for a practical: the step's place among the steps it shows. */
export function stepPlace(experimentId: string, step: Step) {
  const shown = shownSteps(experimentId);
  const i = shown.indexOf(step);
  return { n: (i < 0 ? 0 : i) + 1, total: shown.length };
}

/** The share of a practical's shown steps that are done, as a whole percent. */
export function percentDone(experimentId: string, completed: readonly Step[]) {
  const shown = shownSteps(experimentId);
  return Math.round((shown.filter((s) => completed.includes(s)).length / shown.length) * 100);
}

/**
 * The command that carries an attempt on from a step its lab leaves out: finish the step, then go
 * to the very next one. Undefined once the attempt stands on a step the lab shows.
 */
export function pastHidden(
  experimentId: string,
  state: Pick<GuidedState, "step" | "completed">,
): Command | undefined {
  if (!isHidden(experimentId, state.step)) return undefined;
  if (!state.completed.includes(state.step)) return { type: "complete-step" };
  const next = STEPS[STEPS.indexOf(state.step) + 1];
  return next && { type: "go-to-step", step: next };
}

/** The shown step before or after this one, if there is one. */
export function shownNeighbour(experimentId: string, step: Step, by: 1 | -1): Step | undefined {
  const shown = shownSteps(experimentId);
  const i = STEPS.indexOf(step);
  if (by === 1) return shown.find((s) => STEPS.indexOf(s) > i);
  return [...shown].reverse().find((s) => STEPS.indexOf(s) < i);
}
