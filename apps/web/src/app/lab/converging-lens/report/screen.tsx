"use client";

import { convergingLens } from "@pa/experiments";
import { t } from "@pa/i18n";
import "@pa/i18n/converging-lens";

import { ReportScreen } from "../../report/screen";
import { convergingLensReport } from "../report-content";

/** The converging lens report: the shared report screen, with this experiment's content. */
export function ConvergingLensReportScreen() {
  return (
    <ReportScreen
      experiment={{
        id: convergingLens.id,
        title: t("experiments.converging-lens.title"),
        check: true,
      }}
      build={convergingLensReport}
    />
  );
}
