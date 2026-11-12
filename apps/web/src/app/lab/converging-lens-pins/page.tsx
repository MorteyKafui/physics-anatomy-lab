import { t } from "@pa/i18n";
import "@pa/i18n/converging-lens";
import type { Metadata } from "next";

import { ConvergingLensPinsScreen } from "./screen";

/**
 * The converging lens with two pins (Experiment 96), on a route of its own so the other labs do
 * not ship its code (master plan, "Performance budgets"). Not yet linked from anywhere a student
 * would find it.
 */
export const metadata: Metadata = {
  title: `${t("experiments.converging-lens-pins.title")} · Physics Anatomy`,
};

export default function ConvergingLensPinsPage() {
  return <ConvergingLensPinsScreen />;
}
