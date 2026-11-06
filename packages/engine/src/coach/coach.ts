import type { Finding, Severity, Skill } from "@pa/analysis";

import type { Projection } from "../events/replay";
import type { Json, NewEvent } from "../events/types";
import {
  coachIsOn,
  decide,
  guidedProjection,
  HELP_LEVELS,
  initialGuidedState,
  type GuidedState,
  type HelpLevel,
} from "../steps/machine";

/**
 * The coach: which findings to show, when, and how strongly. Per the master plan it escalates per
 * skill: first it watches silently, then highlights the part, then gives a written hint, then a
 * demonstration. The help level (GLOSSARY.md) sets when it speaks:
 *
 *   auto            as the student works, escalating each time a skill's mistake comes back
 *   check-my-work   when the student finishes a step, or asks
 *   on-my-own       only when the student asks
 *   exam mode       never (the step machine refuses every hint)
 *
 * Everything the coach does is an event, so escalation is rebuilt on resume and in replays.
 * Findings never block a step: procedure mistakes are let through and carried into the results
 * (master plan, "Allowed mistakes"). Unsafe actions are refused by the step machine instead.
 */

export const ESCALATION = ["watch", "highlight", "hint", "demonstrate"] as const;
export type Escalation = (typeof ESCALATION)[number];

/** When the coach is consulted: after an event, when a step is finished, or when asked. */
export type Moment = "live" | "step-exit" | "asked";

export interface CoachState extends GuidedState {
  /** How many times the coach has acted on each skill (watched or shown), for escalation. */
  seen: Partial<Record<Skill, number>>;
  /**
   * A help level for one skill, where the student or teacher set one (master plan, "Assist
   * levels ... per skill"): Auto for graphs and On my own for tables, say. Unset skills follow
   * the overall help level.
   */
  skillLevels: Partial<Record<Skill, HelpLevel>>;
}

/** The help level that applies to one skill. */
export const helpLevelFor = (state: CoachState, skill: Skill): HelpLevel =>
  state.skillLevels[skill] ?? state.helpLevel;

/**
 * The event for setting (or, with undefined, clearing) one skill's help level, or undefined if
 * it cannot be set: exam mode keeps the coach off for every skill.
 */
export function setSkillLevel(
  state: CoachState,
  skill: Skill,
  level: HelpLevel | undefined,
): NewEvent | undefined {
  if (!coachIsOn(state) || !SKILLS.includes(skill)) return undefined;
  if (state.skillLevels[skill] === level) return undefined;
  return { kind: "coach.set-skill-level", data: { skill, level: level ?? null } };
}

export interface Advice {
  finding: Finding;
  /** How strongly to show it. "watch" is never shown. */
  level: Exclude<Escalation, "watch">;
}

const SKILLS: readonly Skill[] = [
  "apparatus",
  "measurement",
  "tabulation",
  "graph",
  "analysis",
  "writing",
];
const ACTIONABLE: readonly Severity[] = ["error", "warning"];

/** The most serious actionable finding for each skill (findings arrive sorted by runRules). */
function topPerSkill(findings: readonly Finding[]): Finding[] {
  const out = new Map<Skill, Finding>();
  for (const f of findings)
    if (ACTIONABLE.includes(f.severity) && !out.has(f.skill)) out.set(f.skill, f);
  return [...out.values()];
}

const levelFor = (state: CoachState, skill: Skill, floor = 0) =>
  ESCALATION[Math.min(ESCALATION.length - 1, Math.max(floor, state.seen[skill] ?? 0))]!;

function hintEvent(finding: Finding, level: Escalation): NewEvent {
  const data: Json = { hint: finding.key, rule: finding.rule, skill: finding.skill, level };
  return level === "watch" ? { kind: "coach.note", data } : { kind: "coach.hint", data };
}

/**
 * What the coach shows now, and the events that record it (append them to the store). Pure: the
 * same state, findings and moment always give the same answer.
 */
export function coach(
  state: CoachState,
  findings: readonly Finding[],
  moment: Moment,
): { advice: Advice[]; events: NewEvent[] } {
  const none = { advice: [], events: [] };
  if (!coachIsOn(state) || !decide(state, { type: "show-hint", hint: "probe" }).ok) return none;

  let chosen: { finding: Finding; level: Escalation }[] = [];
  const top = topPerSkill(findings);

  if (moment === "asked") {
    // The single most serious problem, as at least a written hint.
    const first = top[0];
    if (first)
      chosen = [
        { finding: first, level: levelFor(state, first.skill, ESCALATION.indexOf("hint")) },
      ];
  } else if (moment === "live") {
    chosen = top
      .filter((f) => helpLevelFor(state, f.skill) === "auto")
      .map((finding) => ({ finding, level: levelFor(state, finding.skill) }));
  } else if (moment === "step-exit") {
    chosen = top
      .filter((f) => helpLevelFor(state, f.skill) !== "on-my-own")
      .map((finding) => ({
        finding,
        level: levelFor(state, finding.skill, ESCALATION.indexOf("hint")),
      }));
  }

  return {
    advice: chosen.filter((c): c is Advice => c.level !== "watch"),
    events: chosen.map((c) => hintEvent(c.finding, c.level)),
  };
}

/**
 * The step state plus the coach's memory, rebuilt from events. A hint counts only if the step
 * machine accepted it, so a hint smuggled into an exam attempt is ignored here too.
 */
export const coachProjection: Projection<CoachState> = {
  initial: (attempt) => ({ ...initialGuidedState(attempt), seen: {}, skillLevels: {} }),
  apply(state, event) {
    const next = guidedProjection.apply(state, event) as CoachState;
    const skill = (event.data as Record<string, Json> | null)?.skill;
    if (event.kind === "coach.set-skill-level") {
      const level = (event.data as Record<string, Json> | null)?.level;
      const valid =
        typeof skill === "string" &&
        SKILLS.includes(skill as Skill) &&
        (level === null || (HELP_LEVELS as readonly Json[]).includes(level ?? null));
      if (!valid || !coachIsOn(state)) return next;
      const skillLevels = { ...next.skillLevels };
      if (level === null) delete skillLevels[skill as Skill];
      else skillLevels[skill as Skill] = level as HelpLevel;
      return { ...next, skillLevels };
    }
    if (typeof skill !== "string" || !SKILLS.includes(skill as Skill)) return next;
    const counts =
      (event.kind === "coach.hint" && next.hintsShown > state.hintsShown) ||
      (event.kind === "coach.note" && coachIsOn(state));
    if (!counts) return next;
    return { ...next, seen: { ...next.seen, [skill]: (next.seen[skill as Skill] ?? 0) + 1 } };
  },
};
