import { t } from "@pa/i18n";
import "@pa/i18n/method-of-mixtures";
import type { Metadata } from "next";

import { MethodOfMixturesCheckScreen } from "../../check/method-of-mixtures";

/** The method of mixtures' model check (data templates brief, decision 8): signed out, no AI. */
export const metadata: Metadata = {
  title: `${t("labData.check.title")} · ${t("experiments.method-of-mixtures.title")} · Physics Anatomy`,
};

export default function MethodOfMixturesCheckPage() {
  return <MethodOfMixturesCheckScreen />;
}
