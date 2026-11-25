import { t } from "@pa/i18n";
import "@pa/i18n/people";
import type { Metadata } from "next";
import Link from "next/link";

import { BOX, BUTTON, Empty, MUTED, PeoplePage } from "../_people/people-page";
import { absolute } from "../site";

export const metadata: Metadata = {
  title: `${t("people.donate.title")} · Physics Anatomy`,
  alternates: { canonical: absolute("/donate") },
};

/**
 * Donate (people pages brief, decision 6). The route must be agreed with UEW and isn't yet, so the
 * page says so. It takes no payment details, links no payment provider and names no account.
 */
export default function DonatePage() {
  return (
    <PeoplePage title={t("people.donate.title")}>
      <p className="m-0 text-lg">{t("people.donate.free")}</p>
      <Empty title={t("people.donate.closed")} about={t("people.donate.closed.about")} />
      <div className={BOX}>
        <span className={MUTED}>{t("people.donate.organisations")}</span>
        <Link prefetch={false} href="/partners" className={BUTTON}>
          {t("people.donate.partners")}
        </Link>
      </div>
    </PeoplePage>
  );
}
