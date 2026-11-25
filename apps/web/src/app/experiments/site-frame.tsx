import { t } from "@pa/i18n";
import "@pa/i18n/landing";
import type { ReactNode } from "react";

import { LandingFooter } from "../_landing/footer";
import { LandingHeader } from "../_landing/header";
import "../_landing/landing.css";

/** The public site's header and footer around a page that is not the landing page itself. */
export function SiteFrame({ children }: { children: ReactNode }) {
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
            { href: "/#signup", label: t("landing.nav.teachers") },
          ]}
          signUp={{ href: "/#signup", label: t("landing.signUp") }}
          logIn={{ href: "/sign-in", label: t("landing.logIn") }}
        />
      </div>
      <main id="content">{children}</main>
      <LandingFooter
        product={[
          { href: "/experiments", label: t("landing.nav.experiments") },
          { href: "/teach", label: t("landing.footer.teachers") },
          { href: "/account", label: t("landing.footer.account") },
        ]}
      />
    </div>
  );
}
