import { t } from "@pa/i18n";
import "@pa/i18n/converging-lens";
import type { Metadata } from "next";

import { ConvergingLensPinsReportScreen } from "./screen";

/** The two-pin report (step 10), on the experiment's own route like its lab. */
export const metadata: Metadata = {
  title: `${t("report.title")} · ${t("experiments.converging-lens-pins.title")} · Physics Anatomy`,
};

export default function ConvergingLensPinsReportPage() {
  return <ConvergingLensPinsReportScreen />;
}
