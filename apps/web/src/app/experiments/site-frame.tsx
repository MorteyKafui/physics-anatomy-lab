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
            { href: "/experiments", label: t("landing.nav.practicals") },
            { href: "/#anatomy", label: t("landing.nav.howItWorks") },
            { href: "/#coach", label: t("landing.nav.coach") },
            { href: "/about", label: t("landing.nav.about") },
          ]}
          action={{ href: "/lab/simple-pendulum", label: t("landing.nav.open") }}
        />
      </div>
      <main id="content">{children}</main>
      <LandingFooter
        product={[
          { href: "/experiments", label: t("landing.footer.all") },
          { href: "/lab/simple-pendulum", label: t("landing.cards.pendulum.title") },
          { href: "/lab/ohms-law", label: t("landing.cards.circuit.title") },
          { href: "/lab/converging-lens", label: t("landing.cards.lens.title") },
        ]}
      />
    </div>
  );
}
