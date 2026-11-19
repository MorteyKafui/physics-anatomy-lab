import { t } from "@pa/i18n";
import "@pa/i18n/privacy";
import "@pa/i18n/teach";
import type { Metadata } from "next";
import { Suspense } from "react";

import { Students } from "./students";

export const metadata: Metadata = { title: `${t("privacy.students.title")} · Physics Anatomy` };

export default function StudentsPage() {
  return (
    <Suspense>
      <Students />
    </Suspense>
  );
}
