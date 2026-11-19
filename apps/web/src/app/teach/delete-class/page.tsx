import { t } from "@pa/i18n";
import "@pa/i18n/privacy";
import type { Metadata } from "next";
import { Suspense } from "react";

import { DeleteClass } from "./delete-class";

export const metadata: Metadata = { title: `${t("privacy.deleteClass.link")} · Physics Anatomy` };

export default function DeleteClassPage() {
  return (
    <Suspense>
      <DeleteClass />
    </Suspense>
  );
}
