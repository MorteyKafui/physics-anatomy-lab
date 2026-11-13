import { t } from "@pa/i18n";
import "@pa/i18n/converging-lens";
import type { Metadata } from "next";

import { ConvergingLensPinsCheckScreen } from "../../check/converging-lens-pins";

/** The two pins' model check (data templates brief, decision 8): signed out, with no AI. */
export const metadata: Metadata = {
  title: `${t("labData.check.title")} · ${t("experiments.converging-lens-pins.title")} · Physics Anatomy`,
};

export default function ConvergingLensPinsCheckPage() {
  return <ConvergingLensPinsCheckScreen />;
}
