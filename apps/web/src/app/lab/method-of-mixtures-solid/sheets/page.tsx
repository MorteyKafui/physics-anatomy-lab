import { t } from "@pa/i18n";
import "@pa/i18n/method-of-mixtures";
import type { Metadata } from "next";

import { MethodOfMixturesSolidSheetsScreen } from "./screen";

/** The hot-solid print sheets, on the experiment's own route like its lab. */
export const metadata: Metadata = {
  title: `${t("sheets.title")} · ${t("experiments.method-of-mixtures-solid.title")} · Physics Anatomy`,
};

export default function MethodOfMixturesSolidSheetsPage() {
  return <MethodOfMixturesSolidSheetsScreen />;
}
