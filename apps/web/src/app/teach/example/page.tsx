import { t } from "@pa/i18n";
import "@pa/i18n/teach";
import type { Metadata } from "next";

import { ExampleBoard } from "./example-board";

export const metadata: Metadata = { title: `${t("teach.example")} · Physics Anatomy` };

export default function ExamplePage() {
  return <ExampleBoard />;
}
