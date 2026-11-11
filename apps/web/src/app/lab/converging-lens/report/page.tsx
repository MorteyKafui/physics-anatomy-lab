import { t } from "@pa/i18n";
import "@pa/i18n/converging-lens";
import type { Metadata } from "next";

import { ConvergingLensReportScreen } from "./screen";

/** The converging lens report (step 10), on the experiment's own route like its lab. */
export const metadata: Metadata = {
  title: `${t("report.title")} · ${t("experiments.converging-lens.title")} · Physics Anatomy`,
};

export default function ConvergingLensReportPage() {
  return <ConvergingLensReportScreen />;
}
