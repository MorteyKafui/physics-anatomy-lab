import { t } from "@pa/i18n";
import "@pa/i18n/teach";
import type { Metadata } from "next";
import { Suspense } from "react";

import { LiveClass } from "./live-class";

export const metadata: Metadata = { title: `${t("teach.nav.classes")} · Physics Anatomy` };

/** The live board for the class in ?class=…, so the page itself is static and works offline. */
export default function LivePage() {
  return (
    <Suspense>
      <LiveClass />
    </Suspense>
  );
}
