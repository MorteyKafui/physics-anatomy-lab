import { t } from "@pa/i18n";
import "@pa/i18n/converging-lens";
import type { Metadata } from "next";

import { ConvergingLensExamScreen } from "./screen";

/** The converging lens exam, on the experiment's own route like its lab. */
export const metadata: Metadata = {
  title: `${t("exam.title")} · ${t("experiments.converging-lens.title")} · Physics Anatomy`,
};

export default function ConvergingLensExamPage() {
  return <ConvergingLensExamScreen />;
}
