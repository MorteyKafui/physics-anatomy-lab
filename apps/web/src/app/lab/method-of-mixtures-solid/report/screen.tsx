"use client";

import { hotSolid } from "@pa/experiments";
import { t } from "@pa/i18n";
import "@pa/i18n/method-of-mixtures";

import { ReportScreen } from "../../report/screen";
import { solidReport } from "../report-content";

/** The hot-solid report: the shared report screen, with this experiment's content. */
export function MethodOfMixturesSolidReportScreen() {
  return (
    <ReportScreen
      experiment={{ id: hotSolid.id, title: t("experiments.method-of-mixtures-solid.title") }}
      build={solidReport}
    />
  );
}
