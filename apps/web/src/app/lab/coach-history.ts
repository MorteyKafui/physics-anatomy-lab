import type { Skill } from "@pa/analysis";
import { coachProjection, type Attempt, type Json, type LabEvent, type Step } from "@pa/engine";

/** The coach's hints in a run, with the step each was raised in. */
export function coachHistory(attempt: Attempt, events: readonly LabEvent[]) {
  const out: {
    rule: string;
    skill: Skill;
    key: string;
    params: Record<string, string | number>;
    step: Step;
  }[] = [];
  let state = coachProjection.initial(attempt);
  for (const e of events) {
    if (e.kind === "coach.hint" || e.kind === "coach.note") {
      const d = (e.data ?? {}) as Record<string, Json>;
      if (typeof d.rule === "string" && typeof d.hint === "string" && typeof d.skill === "string")
        out.push({
          rule: d.rule,
          skill: d.skill as Skill,
          key: d.hint,
          params:
            d.params && typeof d.params === "object" && !Array.isArray(d.params)
              ? (Object.fromEntries(
                  Object.entries(d.params).filter(
                    ([, v]) => typeof v === "string" || typeof v === "number",
                  ),
                ) as Record<string, string | number>)
              : {},
          step: state.step,
        });
    }
    state = coachProjection.apply(state, e);
  }
  return out;
}
