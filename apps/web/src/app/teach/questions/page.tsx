import { t } from "@pa/i18n";
import "@pa/i18n/teach";
import type { Metadata } from "next";

import { Questions } from "./questions";

export const metadata: Metadata = { title: `${t("teach.questions.title")} · Physics Anatomy` };

export default function QuestionsPage() {
  return <Questions />;
}
