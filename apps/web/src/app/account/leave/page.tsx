import { t } from "@pa/i18n";
import "@pa/i18n/privacy";
import type { Metadata } from "next";

import { LeaveClass } from "./leave-class";

export const metadata: Metadata = { title: `${t("privacy.leaveClass.title")} · Physics Anatomy` };

export default function LeavePage() {
  return <LeaveClass />;
}
