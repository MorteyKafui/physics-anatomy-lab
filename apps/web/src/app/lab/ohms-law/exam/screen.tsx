"use client";

import { EXAM_MINUTES, markOhmsLawScript, ohmsLaw, ohmsLawFollowUps } from "@pa/experiments";
import { hasMessage, t, type MessageKey } from "@pa/i18n";
import "@pa/i18n/ohms-law";

import { ExamScreen, sharedLostText, type ExamExperiment } from "../../exam/screen";
import { ohmsLawExamFacts } from "./facts";

const X = "experiments.ohms-law.exam";
const msg = (key: string, params?: Record<string, string | number>) => t(key as MessageKey, params);

const experiment: ExamExperiment = {
  id: ohmsLaw.id,
  title: t("experiments.ohms-law.title"),
  question: {
    meta: t(`${X}.question.meta`, { minutes: EXAM_MINUTES }),
    lead: t(`${X}.question.lead`),
    parts: [1, 2, 3, 4, 5, 6].map((n) =>
      msg(`${X}.question.${n}`, {
        list: ohmsLaw.jockeyPositions.map((pj) => (pj * 100).toFixed(0)).join(", "),
      }),
    ),
  },
  mark: (attempt, events) => markOhmsLawScript(ohmsLawExamFacts(attempt, events)),
  // This experiment's words where it has its own, the shared ones otherwise.
  itemText: (id) =>
    hasMessage(`${X}.item.${id}`) ? msg(`${X}.item.${id}`) : msg(`exam.item.${id}`),
  lostText: (m) =>
    m.lost && hasMessage(`${X}.lost.${m.lost.key}`)
      ? msg(`${X}.lost.${m.lost.key}`, m.lost.params)
      : sharedLostText(m),
  followUps: ohmsLawFollowUps().map((q) => ({
    id: q.id,
    q: msg(`${X}.q.${q.id}`, q.params),
    a: msg(`${X}.a.${q.id}`, q.params),
  })),
};

/** The Ohm's law exam: the shared exam screen, with this practical's question and rubric. */
export function OhmsLawExamScreen() {
  return <ExamScreen experiment={experiment} />;
}
