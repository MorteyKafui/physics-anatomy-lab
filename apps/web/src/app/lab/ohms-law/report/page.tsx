import { t } from "@pa/i18n";
import "@pa/i18n/ohms-law";
import type { Metadata } from "next";

import { OhmsLawReportScreen } from "./screen";

/** The Ohm's law report (step 10), on the experiment's own route like its lab. */
export const metadata: Metadata = {
  title: `${t("report.title")} · ${t("experiments.ohms-law.title")} · Physics Anatomy`,
};

export default function OhmsLawReportPage() {
  return <OhmsLawReportScreen />;
}
