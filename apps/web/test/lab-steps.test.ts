import { describe, expect, test } from "bun:test";

import { decide, guidedProjection, initialGuidedState, STEPS, type GuidedState } from "@pa/engine";

import {
  isHidden,
  pastHidden,
  percentDone,
  shownNeighbour,
  shownSteps,
  stepPlace,
} from "../src/app/lab/lab-steps";

const PRACTICALS = [
  "simple-pendulum",
  "ohms-law",
  "converging-lens",
  "converging-lens-pins",
  "method-of-mixtures",
  "method-of-mixtures-solid",
];

// Steps whose activity is not built stay out of the lab (LabOpen board, redesign brief section 4).
describe("the steps each practical's lab shows", () => {
  test("the pendulum leaves out Question, Predict and Check; the others show all ten", () => {
    expect(shownSteps("simple-pendulum")).toEqual([
      "build",
      "measure",
      "tabulate",
      "plot",
      "analyse",
      "conclude",
      "report",
    ]);
    for (const id of PRACTICALS.slice(1)) expect(shownSteps(id), id).toEqual([...STEPS]);
  });

  test("Measure, where readings are taken, and Report are never left out", () => {
    for (const id of PRACTICALS) {
      expect(isHidden(id, "measure"), id).toBe(false);
      expect(isHidden(id, "report"), id).toBe(false);
    }
  });

  test("steps are numbered among the ones shown", () => {
    expect(stepPlace("simple-pendulum", "build")).toEqual({ n: 1, total: 7 });
    expect(stepPlace("simple-pendulum", "measure")).toEqual({ n: 2, total: 7 });
    expect(stepPlace("ohms-law", "measure")).toEqual({ n: 5, total: 10 });
  });

  test("progress counts only the steps shown", () => {
    expect(percentDone("simple-pendulum", ["question", "predict"])).toBe(0);
    expect(percentDone("simple-pendulum", ["question", "predict", "build", "check"])).toBe(14);
    expect(percentDone("ohms-law", ["question"])).toBe(10);
  });

  test("the next and previous steps skip the ones left out", () => {
    expect(shownNeighbour("simple-pendulum", "build", 1)).toBe("measure");
    expect(shownNeighbour("simple-pendulum", "measure", -1)).toBe("build");
    expect(shownNeighbour("simple-pendulum", "build", -1)).toBeUndefined();
    expect(shownNeighbour("ohms-law", "build", 1)).toBe("check");
  });
});

/** Run the step machine on pastHidden's commands, as use-attempt.ts does with the event store. */
function carried(id: string, state: GuidedState): GuidedState {
  let s = state;
  for (let guard = 0; guard < 2 * STEPS.length; guard++) {
    const command = pastHidden(id, s);
    if (!command) break;
    const d = decide(s, command);
    if (!d.ok) break;
    s = d.events.reduce(
      (x, e) =>
        guidedProjection.apply(x, { ...e, id: "", attemptId: "", seq: 0, device: "", at: 0 }),
      s,
    );
  }
  return s;
}

describe("carrying an attempt past the steps its lab leaves out", () => {
  test("a new pendulum attempt opens on Build, and finishing Build goes on to Measure", () => {
    const fresh = carried("simple-pendulum", initialGuidedState({ mode: "guided" }));
    expect(fresh.step).toBe("build");
    expect(fresh.completed).toEqual(["question", "predict"]);

    const built = {
      ...fresh,
      completed: [...fresh.completed, "build" as const],
      step: "check" as const,
    };
    const on = carried("simple-pendulum", built);
    expect(on.step).toBe("measure");
    expect(on.completed).toEqual(["question", "predict", "build", "check"]);
  });

  test("an attempt at a practical that shows every step is left where it is", () => {
    const fresh = carried("ohms-law", initialGuidedState({ mode: "guided" }));
    expect(fresh.step).toBe("question");
    expect(fresh.completed).toEqual([]);
  });
});
