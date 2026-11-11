"use client";

import { simplePendulum } from "@pa/experiments";
import { t } from "@pa/i18n";

import { reportContent } from "./content";
import { ReportScreen } from "./screen";

const build = (...args: Parameters<typeof reportContent>) => reportContent(args[0], args[1]);

/** The simple pendulum's report. */
export function PendulumReportScreen() {
  return (
    <ReportScreen
      experiment={{ id: simplePendulum.id, title: t("experiments.simple-pendulum.title") }}
      build={build}
    />
  );
}
