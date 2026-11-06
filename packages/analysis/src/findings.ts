/**
 * What a check says about a student's work. Harvested from Physics Bench: each finding names its
 * rule, how serious it is, the skill it is about (the coach escalates per skill), a message key
 * for packages/i18n, and the rows or column it points at so the screen can mark them.
 */

export type Severity = "error" | "warning" | "tip" | "good";

/** The skills of the plan's off-track table; the coach escalates separately for each. */
export type Skill = "apparatus" | "measurement" | "tabulation" | "graph" | "analysis" | "writing";

export interface Finding {
  rule: string;
  severity: Severity;
  skill: Skill;
  /** Message key; the title and detail are `${key}.title` and `${key}.detail`. */
  key: string;
  params?: Record<string, string | number>;
  /** Row ids the finding points at. */
  rows?: string[];
  /** Column id the finding points at. */
  column?: string;
}

export interface Rule<C> {
  id: string;
  skill: Skill;
  check(context: C): Finding[];
}

const ORDER: Record<Severity, number> = { error: 0, warning: 1, tip: 2, good: 3 };

/**
 * Run every rule and return the findings, most serious first. A rule that throws on data it cannot
 * judge stays silent rather than guessing; `onError` is told, so tests and logs can see it.
 */
export function runRules<C>(
  rules: readonly Rule<C>[],
  context: C,
  onError?: (rule: string, error: unknown) => void,
): Finding[] {
  const findings: Finding[] = [];
  for (const rule of rules) {
    try {
      findings.push(...rule.check(context));
    } catch (error) {
      onError?.(rule.id, error);
    }
  }
  return findings.sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);
}
