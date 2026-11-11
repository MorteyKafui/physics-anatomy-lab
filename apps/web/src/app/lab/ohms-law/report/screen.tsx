"use client";

import { ohmsLaw } from "@pa/experiments";
import { t } from "@pa/i18n";
import "@pa/i18n/ohms-law";

import { ReportScreen } from "../../report/screen";
import { ohmsLawReport } from "../report-content";

/** The Ohm's law report: the shared report screen, with this experiment's content. */
export function OhmsLawReportScreen() {
  return (
    <ReportScreen
      experiment={{ id: ohmsLaw.id, title: t("experiments.ohms-law.title") }}
      build={ohmsLawReport}
    />
  );
}
