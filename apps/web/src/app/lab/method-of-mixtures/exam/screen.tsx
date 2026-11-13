"use client";

import {
  EXAM_MINUTES,
  markMixturesScript,
  methodOfMixtures,
  mixturesFollowUps,
} from "@pa/experiments";
import { hasMessage, t, type MessageKey } from "@pa/i18n";
import "@pa/i18n/method-of-mixtures";

import { ExamScreen, sharedLostText, type ExamExperiment } from "../../exam/screen";
import { mixturesExamFacts } from "./facts";

const X = "experiments.method-of-mixtures.exam";
const msg = (key: string, params?: Record<string, string | number>) => t(key as MessageKey, params);

const experiment: ExamExperiment = {
  id: methodOfMixtures.id,
  title: t("experiments.method-of-mixtures.title"),
  question: {
    meta: t(`${X}.question.meta`, { minutes: EXAM_MINUTES }),
    lead: t(`${X}.question.lead`),
    parts: [1, 2, 3, 4, 5, 6].map((n) =>
      msg(`${X}.question.${n}`, {
        first: methodOfMixtures.volumes[0],
        list: methodOfMixtures.volumes.slice(1).join(", "),
        hot: methodOfMixtures.hot.volume,
        hotT: methodOfMixtures.hot.temperature,
      }),
    ),
  },
  mark: (attempt, events) => markMixturesScript(mixturesExamFacts(attempt, events)),
  // This experiment's words where it has its own, the shared ones otherwise.
  itemText: (id) =>
    hasMessage(`${X}.item.${id}`) ? msg(`${X}.item.${id}`) : msg(`exam.item.${id}`),
  lostText: (m) =>
    m.lost && hasMessage(`${X}.lost.${m.lost.key}`)
      ? msg(`${X}.lost.${m.lost.key}`, m.lost.params)
      : sharedLostText(m),
  followUps: mixturesFollowUps().map((q) => ({
    id: q.id,
    q: msg(`${X}.q.${q.id}`, q.params),
    a: msg(`${X}.a.${q.id}`, q.params),
  })),
};

/** The mixtures exam: the shared exam screen, with this practical's question and rubric. */
export function MethodOfMixturesExamScreen() {
  return <ExamScreen experiment={experiment} />;
}
