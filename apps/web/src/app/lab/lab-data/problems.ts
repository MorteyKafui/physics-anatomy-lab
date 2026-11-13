import { t, type MessageKey } from "@pa/i18n";

import type { MatchProblem } from "./match";
import type { ReadProblem } from "./read";

/** A problem in a student's file, in words, on the cell it is in. */
export function problemText(problem: ReadProblem | MatchProblem): string {
  const { code, ...params } = problem;
  return t(`labData.problem.${code}` as MessageKey, params as Record<string, string | number>);
}
