import { t } from "@pa/i18n";
import "@pa/i18n/privacy";
import type { Metadata } from "next";

import { DeleteAccount } from "./delete-account";

export const metadata: Metadata = {
  title: `${t("privacy.deleteAccount.title")} · Physics Anatomy`,
};

export default function DeleteAccountPage() {
  return <DeleteAccount />;
}
