"use client";

import { lensPins } from "@pa/experiments";
import { t } from "@pa/i18n";
import "@pa/i18n/converging-lens";

import { ReportScreen } from "../../report/screen";
import { lensPinsReport } from "../report-content";

/** The two-pin report: the shared report screen, with this experiment's content. */
export function ConvergingLensPinsReportScreen() {
  return (
    <ReportScreen
      experiment={{ id: lensPins.id, title: t("experiments.converging-lens-pins.title") }}
      build={lensPinsReport}
    />
  );
}
