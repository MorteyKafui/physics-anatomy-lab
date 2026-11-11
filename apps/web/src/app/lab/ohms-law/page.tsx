import { t } from "@pa/i18n";
import "@pa/i18n/ohms-law";
import type { Metadata } from "next";

import { OhmsLawScreen } from "./screen";

/**
 * The Ohm's law lab (Phase 2), on a route of its own so the pendulum lab does not ship its code
 * (master plan, "Performance budgets": the lab within 350 KB). Not yet linked from anywhere a
 * student would find it.
 */
export const metadata: Metadata = {
  title: `${t("experiments.ohms-law.title")} · Physics Anatomy`,
};

export default function OhmsLawPage() {
  return <OhmsLawScreen />;
}
