import { t } from "@pa/i18n";
import "@pa/i18n/method-of-mixtures";
import type { Metadata } from "next";

import { MethodOfMixturesExamScreen } from "./screen";

/** The mixtures exam, on the experiment's own route like its lab. */
export const metadata: Metadata = {
  title: `${t("exam.title")} · ${t("experiments.method-of-mixtures.title")} · Physics Anatomy`,
};

export default function MethodOfMixturesExamPage() {
  return <MethodOfMixturesExamScreen />;
}
