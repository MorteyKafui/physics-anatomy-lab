// Names and money for the AI page (docs/content/ai-quotas-brief.md, decision 5).
import type { AiFeatureUse, AiSwitchState } from "@pa/api-client";

export const FEATURE_NAMES: Readonly<Record<AiFeatureUse["feature"], string>> = {
  tutor: "Tutor",
  "what-if": "What if",
  "report-review": "Report review",
  "question-drafting": "Question drafting",
};

export const switchName = (name: AiSwitchState["name"]) =>
  name === "all" ? "All AI" : FEATURE_NAMES[name];

/** "claude-haiku-5-5" as "Haiku 5.5"; any other id as it is. */
export function modelName(id: string): string {
  const m = /^claude-([a-z]+)-(\d+)-(\d+)$/.exec(id);
  if (!m) return id;
  const [, family = "", major = "", minor = ""] = m;
  return `${family.charAt(0).toUpperCase()}${family.slice(1)} ${major}.${minor}`;
}

/** Millionths of a dollar, as dollars and cents. */
export const dollars = (micro: number) => `$${(micro / 1_000_000).toFixed(2)}`;
