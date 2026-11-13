import { t } from "@pa/i18n";
import "@pa/i18n/method-of-mixtures";
import type { Metadata } from "next";

import { MethodOfMixturesSolidReportScreen } from "./screen";

/** The hot-solid report (step 10), on the experiment's own route like its lab. */
export const metadata: Metadata = {
  title: `${t("report.title")} · ${t("experiments.method-of-mixtures-solid.title")} · Physics Anatomy`,
};

export default function MethodOfMixturesSolidReportPage() {
  return <MethodOfMixturesSolidReportScreen />;
}
