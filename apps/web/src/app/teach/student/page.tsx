import { t } from "@pa/i18n";
import "@pa/i18n/privacy";
import type { Metadata } from "next";
import { Suspense } from "react";

import { StudentData } from "./student-data";

export const metadata: Metadata = { title: `${t("privacy.students.title")} · Physics Anatomy` };

/** One student's data, for ?class=…&member=…, so the page itself is static. */
export default function StudentPage() {
  return (
    <Suspense>
      <StudentData />
    </Suspense>
  );
}
