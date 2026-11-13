import { t } from "@pa/i18n";
import "@pa/i18n/method-of-mixtures";
import type { Metadata } from "next";

import { MethodOfMixturesSolidCheckScreen } from "../../check/method-of-mixtures-solid";

/** The hot solid's model check (data templates brief, decision 8): signed out, with no AI. */
export const metadata: Metadata = {
  title: `${t("labData.check.title")} · ${t("experiments.method-of-mixtures-solid.title")} · Physics Anatomy`,
};

export default function MethodOfMixturesSolidCheckPage() {
  return <MethodOfMixturesSolidCheckScreen />;
}
