import { t } from "@pa/i18n";
import "@pa/i18n/ohms-law";
import type { Metadata } from "next";

import { OhmsLawExamScreen } from "./screen";

/** The Ohm's law exam, on the experiment's own route like its lab. */
export const metadata: Metadata = {
  title: `${t("exam.title")} · ${t("experiments.ohms-law.title")} · Physics Anatomy`,
};

export default function OhmsLawExamPage() {
  return <OhmsLawExamScreen />;
}
