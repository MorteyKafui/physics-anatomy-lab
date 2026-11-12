import { t } from "@pa/i18n";
import "@pa/i18n/method-of-mixtures";
import type { Metadata } from "next";

import { MethodOfMixturesScreen } from "./screen";

/**
 * The method of mixtures (Experiment 62), on a route of its own so the other labs do not ship its
 * code (master plan, "Performance budgets"). Not yet linked from anywhere a student would find it.
 */
export const metadata: Metadata = {
  title: `${t("experiments.method-of-mixtures.title")} · Physics Anatomy`,
};

export default function MethodOfMixturesPage() {
  return <MethodOfMixturesScreen />;
}
