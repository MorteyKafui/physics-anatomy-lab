"use client";

import { EXAM_MINUTES, followUps, markScript, simplePendulum } from "@pa/experiments";
import { t, type MessageKey } from "@pa/i18n";
import { DEFAULT_ENVIRONMENT } from "@pa/instruments";

import { reportContent } from "../report/content";
import { examFacts } from "./facts";
import { ExamScreen, type ExamExperiment } from "./screen";

const E = simplePendulum;
const G = DEFAULT_ENVIRONMENT.g;

const experiment: ExamExperiment = {
  id: E.id,
  title: t("experiments.simple-pendulum.title"),
  question: {
    meta: t("exam.question.meta", { minutes: EXAM_MINUTES }),
    lead: t("exam.question.lead"),
    parts: [1, 2, 3, 4, 5, 6].map((n) =>
      t(`exam.question.${n}` as MessageKey, { swings: E.swings }),
    ),
  },
  mark: (attempt, events) => markScript(examFacts(reportContent(attempt, events, G))),
  itemText: (id) => t(`exam.item.${id}` as MessageKey, { swings: E.swings }),
  followUps: followUps(G).map((q) => ({
    id: q.id,
    q: t(`exam.q.${q.id}` as MessageKey, q.params),
    a: t(`exam.a.${q.id}` as MessageKey, q.params),
  })),
};

/** The simple pendulum's exam. */
export function PendulumExamScreen() {
  return <ExamScreen experiment={experiment} />;
}
