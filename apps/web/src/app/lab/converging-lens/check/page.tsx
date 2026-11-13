import { t } from "@pa/i18n";
import "@pa/i18n/converging-lens";
import type { Metadata } from "next";

import { ConvergingLensCheckScreen } from "../../check/converging-lens";

/** The converging lens's model check (data templates brief, decision 8): signed out, with no AI. */
export const metadata: Metadata = {
  title: `${t("labData.check.title")} · ${t("experiments.converging-lens.title")} · Physics Anatomy`,
};

export default function ConvergingLensCheckPage() {
  return <ConvergingLensCheckScreen />;
}
