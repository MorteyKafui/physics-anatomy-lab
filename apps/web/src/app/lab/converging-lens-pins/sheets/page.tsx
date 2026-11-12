import { t } from "@pa/i18n";
import "@pa/i18n/converging-lens";
import type { Metadata } from "next";

import { ConvergingLensPinsSheetsScreen } from "./screen";

/** The two-pin print sheets, on the experiment's own route like its lab. */
export const metadata: Metadata = {
  title: `${t("sheets.title")} · ${t("experiments.converging-lens-pins.title")} · Physics Anatomy`,
};

export default function ConvergingLensPinsSheetsPage() {
  return <ConvergingLensPinsSheetsScreen />;
}
