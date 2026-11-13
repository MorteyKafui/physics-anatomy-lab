import { t } from "@pa/i18n";
import "@pa/i18n/method-of-mixtures";
import type { Metadata } from "next";

import { MethodOfMixturesSolidExamScreen } from "./screen";

/** The hot-solid exam, on the experiment's own route like its lab. */
export const metadata: Metadata = {
  title: `${t("exam.title")} · ${t("experiments.method-of-mixtures-solid.title")} · Physics Anatomy`,
};

export default function MethodOfMixturesSolidExamPage() {
  return <MethodOfMixturesSolidExamScreen />;
}
