import { t } from "@pa/i18n";
import "@pa/i18n/catalogue";
import "@pa/i18n/landing";
import type { ReactNode } from "react";

import { accountsEnabled } from "../accounts";
import { LandingFooter } from "../_landing/footer";
import { LandingHeader } from "../_landing/header";
import "../_landing/landing.css";

/**
 * The public site's header and footer around a page that is not the landing page itself. With
 * accounts switched off (ADR 0047) it has no sign-in, sign-up, teacher or account link, and the
 * header's button opens the practicals instead.
 */
export function SiteFrame({ children }: { children: ReactNode }) {
  const accounts = accountsEnabled();
  return (
    <div className="bg-[var(--pa-paper)] text-[var(--pa-on-paper)]">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:bg-[var(--pa-on-paper)] focus:px-4 focus:py-2 focus:text-[var(--pa-paper)]"
      >
        {t("landing.skip")}
      </a>
      <div className="bg-[var(--pa-ink-950)] pb-[76px] text-[var(--pa-text)]">
        <LandingHeader
          links={[
            { href: "/#anatomy", label: t("landing.nav.howItWorks") },
            { href: "/experiments", label: t("landing.nav.experiments") },
            { href: "/#research", label: t("landing.nav.research") },
            ...(accounts ? [{ href: "/#signup", label: t("landing.nav.teachers") }] : []),
          ]}
          signUp={
            accounts
              ? { href: "/#signup", label: t("landing.signUp") }
              : { href: "/experiments", label: t("catalogue.open") }
          }
          {...(accounts ? { logIn: { href: "/sign-in", label: t("landing.logIn") } } : {})}
        />
      </div>
      <main id="content">{children}</main>
      <LandingFooter
        product={[
          { href: "/experiments", label: t("landing.nav.experiments") },
          ...(accounts
            ? [
                { href: "/teach", label: t("landing.footer.teachers") },
                { href: "/account", label: t("landing.footer.account") },
              ]
            : []),
        ]}
      />
    </div>
  );
}
