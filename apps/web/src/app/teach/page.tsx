import { t } from "@pa/i18n";
import "@pa/i18n/teach";
import type { Metadata } from "next";

import { Classes } from "./classes";

export const metadata: Metadata = { title: `${t("teach.classes")} · Physics Anatomy` };

export default function TeachPage() {
  return <Classes />;
}
