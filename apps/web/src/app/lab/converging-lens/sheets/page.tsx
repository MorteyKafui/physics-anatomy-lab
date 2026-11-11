import { t } from "@pa/i18n";
import "@pa/i18n/converging-lens";
import type { Metadata } from "next";

import { ConvergingLensSheetsScreen } from "./screen";

/** The converging lens print sheets, on the experiment's own route like its lab. */
export const metadata: Metadata = {
  title: `${t("sheets.title")} · ${t("experiments.converging-lens.title")} · Physics Anatomy`,
};

export default function ConvergingLensSheetsPage() {
  return <ConvergingLensSheetsScreen />;
}
