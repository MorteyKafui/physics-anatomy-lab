import { t } from "@pa/i18n";
import "@pa/i18n/converging-lens";
import type { Metadata } from "next";

import { ConvergingLensPinsExamScreen } from "./screen";

/** The two-pin exam, on the experiment's own route like its lab. */
export const metadata: Metadata = {
  title: `${t("exam.title")} · ${t("experiments.converging-lens-pins.title")} · Physics Anatomy`,
};

export default function ConvergingLensPinsExamPage() {
  return <ConvergingLensPinsExamScreen />;
}
