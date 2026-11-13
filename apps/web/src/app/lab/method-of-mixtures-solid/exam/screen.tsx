"use client";

import { EXAM_MINUTES, hotSolid, markSolidScript, solidFollowUps } from "@pa/experiments";
import { hasMessage, t, type MessageKey } from "@pa/i18n";
import "@pa/i18n/method-of-mixtures";

import { ExamScreen, sharedLostText, type ExamExperiment } from "../../exam/screen";
import { solidExamFacts } from "./facts";

const X = "experiments.method-of-mixtures-solid.exam";
const msg = (key: string, params?: Record<string, string | number>) => t(key as MessageKey, params);

const experiment: ExamExperiment = {
  id: hotSolid.id,
  title: t("experiments.method-of-mixtures-solid.title"),
  question: {
    meta: msg(`${X}.question.meta`, { minutes: EXAM_MINUTES }),
    lead: msg(`${X}.question.lead`),
    parts: [1, 2, 3, 4, 5, 6].map((n) =>
      msg(`${X}.question.${n}`, {
        cc: hotSolid.given.calorimeter,
        cw: hotSolid.given.water,
      }),
    ),
  },
  mark: (attempt, events) => markSolidScript(solidExamFacts(attempt, events)),
  // This experiment's words where it has its own, the shared ones otherwise.
  itemText: (id) =>
    hasMessage(`${X}.item.${id}`) ? msg(`${X}.item.${id}`) : msg(`exam.item.${id}`),
  lostText: (m) =>
    m.lost && hasMessage(`${X}.lost.${m.lost.key}`)
      ? msg(`${X}.lost.${m.lost.key}`, m.lost.params)
      : sharedLostText(m),
  followUps: solidFollowUps().map((q) => ({
    id: q.id,
    q: msg(`${X}.q.${q.id}`, q.params),
    a: msg(`${X}.a.${q.id}`, q.params),
  })),
};

/** The hot-solid exam: the shared exam screen, with this practical's question and rubric. */
export function MethodOfMixturesSolidExamScreen() {
  return <ExamScreen experiment={experiment} />;
}
