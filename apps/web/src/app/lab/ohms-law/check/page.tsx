import { t } from "@pa/i18n";
import "@pa/i18n/ohms-law";
import type { Metadata } from "next";

import { OhmsLawCheckScreen } from "../../check/ohms-law";

/** Ohm's law's model check (data templates brief, decision 8): it works signed out, with no AI. */
export const metadata: Metadata = {
  title: `${t("labData.check.title")} · ${t("experiments.ohms-law.title")} · Physics Anatomy`,
};

export default function OhmsLawCheckPage() {
  return <OhmsLawCheckScreen />;
}
