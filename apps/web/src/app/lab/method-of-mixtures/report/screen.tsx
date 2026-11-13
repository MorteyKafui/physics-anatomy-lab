"use client";

import { methodOfMixtures } from "@pa/experiments";
import { t } from "@pa/i18n";
import "@pa/i18n/method-of-mixtures";

import { ReportScreen } from "../../report/screen";
import { mixturesReport } from "../report-content";

/** The mixtures report: the shared report screen, with this experiment's content. */
export function MethodOfMixturesReportScreen() {
  return (
    <ReportScreen
      experiment={{
        id: methodOfMixtures.id,
        title: t("experiments.method-of-mixtures.title"),
        check: true,
      }}
      build={mixturesReport}
    />
  );
}
