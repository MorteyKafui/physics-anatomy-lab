import { t } from "@pa/i18n";
import "@pa/i18n/landing";
import Link from "next/link";

import { LandingFooter } from "./_landing/footer";
import { LandingHeader } from "./_landing/header";
import { HeroStage } from "./_landing/hero-stage";
import "./_landing/landing.css";

// Links here never prefetch: the lab is the biggest download on the site, and a visitor on a
// low-cost phone pays for it only if they choose to go (Lite mode; brief, decision 9).
const START = "/lab/simple-pendulum";
// Until /sign-in is built (landing page brief, decision 6), signing up starts at the teacher's
// classes, which ask a signed-out visitor to sign in.
const SIGN_UP = { href: "/teach", label: t("landing.signUp") };

const focus =
  "focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[var(--pa-accent)]";

/** The landing page (design/mockups/Main.dc.html; docs/content/landing-page-brief.md). */
export default function Home() {
  return (
    <div className="bg-[var(--pa-ink-950)] text-[var(--pa-text)]">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:bg-[var(--pa-text)] focus:px-4 focus:py-2 focus:text-[var(--pa-ink-950)]"
      >
        {t("landing.skip")}
      </a>
      <LandingHeader links={[]} signUp={SIGN_UP} />
      <main id="content">
        <HeroStage>
          <h1 className="m-0 text-balance font-display text-[clamp(52px,9vw,132px)] font-extrabold leading-[0.9] tracking-[-0.04em]">
            {t("landing.hero.title1")}
            <br />
            <span className="pa-outline">{t("landing.hero.title2")}</span>
          </h1>
          <p className="m-0 max-w-[32em] text-pretty text-xl text-[var(--pa-text-soft)]">
            {t("landing.hero.lede")}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              prefetch={false}
              href={START}
              className={`bg-[var(--pa-accent)] px-[26px] py-4 text-[17px] font-semibold text-[var(--pa-ink-950)] no-underline ${focus}`}
            >
              {t("landing.hero.start")}
            </Link>
            <Link
              prefetch={false}
              href={SIGN_UP.href}
              className={`border border-[var(--pa-dash-quiet)] bg-[rgba(13,13,13,.85)] px-6 py-[15px] text-[17px] font-medium text-[var(--pa-text)] no-underline ${focus}`}
            >
              {SIGN_UP.label}
            </Link>
          </div>
        </HeroStage>
      </main>
      <LandingFooter
        product={[
          { href: START, label: t("landing.footer.experiments") },
          { href: "/teach", label: t("landing.footer.teachers") },
          { href: "/account", label: t("landing.footer.account") },
        ]}
      />
    </div>
  );
}
