import { t } from "@pa/i18n";
import "@pa/i18n/ohms-law";
import type { Metadata } from "next";

import { OhmsLawSheetsScreen } from "./screen";

/** The Ohm's law print sheets, on the experiment's own route like its lab. */
export const metadata: Metadata = {
  title: `${t("sheets.title")} · ${t("experiments.ohms-law.title")} · Physics Anatomy`,
};

export default function OhmsLawSheetsPage() {
  return <OhmsLawSheetsScreen />;
}
