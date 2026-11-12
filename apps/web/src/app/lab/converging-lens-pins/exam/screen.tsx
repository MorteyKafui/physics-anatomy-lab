"use client";

import { EXAM_MINUTES, lensPins, markPinsScript, pinsFollowUps } from "@pa/experiments";
import { hasMessage, t, type MessageKey } from "@pa/i18n";
import "@pa/i18n/converging-lens";

import { ExamScreen, sharedLostText, type ExamExperiment } from "../../exam/screen";
import { pinsExamFacts } from "./facts";

const X = "experiments.converging-lens-pins.exam";
const msg = (key: string, params?: Record<string, string | number>) => t(key as MessageKey, params);

const experiment: ExamExperiment = {
  id: lensPins.id,
  title: t("experiments.converging-lens-pins.title"),
  question: {
    meta: t(`${X}.question.meta`, { minutes: EXAM_MINUTES }),
    lead: t(`${X}.question.lead`),
    parts: [1, 2, 3, 4, 5, 6].map((n) =>
      msg(`${X}.question.${n}`, {
        first: (lensPins.objectDistances[0]! * 100).toFixed(1),
        list: lensPins.objectDistances
          .slice(1)
          .map((u) => (u * 100).toFixed(1))
          .join(", "),
      }),
    ),
  },
  mark: (attempt, events) => markPinsScript(pinsExamFacts(attempt, events)),
  // This experiment's words where it has its own, the shared ones otherwise.
  itemText: (id) =>
    hasMessage(`${X}.item.${id}`) ? msg(`${X}.item.${id}`) : msg(`exam.item.${id}`),
  lostText: (m) =>
    m.lost && hasMessage(`${X}.lost.${m.lost.key}`)
      ? msg(`${X}.lost.${m.lost.key}`, m.lost.params)
      : sharedLostText(m),
  followUps: pinsFollowUps().map((q) => ({
    id: q.id,
    q: msg(`${X}.q.${q.id}`, q.params),
    a: msg(`${X}.a.${q.id}`, q.params),
  })),
};

/** The two-pin exam: the shared exam screen, with this practical's question and rubric. */
export function ConvergingLensPinsExamScreen() {
  return <ExamScreen experiment={experiment} />;
}
