import { t } from "@pa/i18n";
import "@pa/i18n/landing";
import { CircuitStage, LensStage, MixturesStage } from "@pa/ui/illustrations/landing-cards";
import Link from "next/link";

import { Anatomy, StandFigure } from "./_landing/anatomy";
import { Bento } from "./_landing/bento";
import { bentoData, cardsData } from "./_landing/cards-data";
import { CoachDemo } from "./_landing/coach-demo";
import { LandingFooter } from "./_landing/footer";
import { LandingHeader } from "./_landing/header";
import { HeroBench, OpenChosen } from "./_landing/hero-bench";
import { HeroStage } from "./_landing/hero-stage";
import "./_landing/landing.css";
import { PlayWhenSeen } from "./_landing/play-when-seen";
import { OpenBand } from "./_landing/open-band";
import { PracticalProvider } from "./_landing/practicals";
import { TimeIt } from "./_landing/time-it";

// Links here never prefetch: the lab is the biggest download on the site, and a visitor on a
// low-cost phone pays for it only if they choose to go (Lite mode; brief, decision 9).
const START = "/lab/simple-pendulum";

const H2 =
  "m-0 text-balance font-display text-[clamp(38px,5vw,64px)] font-extrabold leading-[0.95] tracking-[-0.03em]";

const focus =
  "focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[var(--pa-accent)]";

/**
 * The landing page (design/mockups/Landing.dc.html, revised from Main.dc.html;
 * docs/content/redesign-brief.md). Open to anyone: no account links (ADR 0047).
 */
export default function Home() {
  return (
    <PracticalProvider>
      <div className="bg-[var(--pa-ink-950)] text-[var(--pa-text)]">
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:bg-[var(--pa-text)] focus:px-4 focus:py-2 focus:text-[var(--pa-ink-950)]"
        >
          {t("landing.skip")}
        </a>
        <LandingHeader
          links={[
            { href: "/experiments", label: t("landing.nav.practicals") },
            { href: "#anatomy", label: t("landing.nav.howItWorks") },
            { href: "#coach", label: t("landing.nav.coach") },
            { href: "/about", label: t("landing.nav.about") },
          ]}
          action={{ href: START, label: t("landing.nav.open") }}
        />
        <main id="content">
          <HeroStage
            bench={
              <HeroBench
                data={cardsData()}
                stages={{
                  pendulum: <StandFigure />,
                  circuit: <CircuitStage />,
                  lens: <LensStage />,
                  pins: <LensStage />,
                  mixtures: <MixturesStage />,
                  solid: <MixturesStage />,
                }}
              />
            }
          >
            <h1 className="m-0 text-balance font-display text-[clamp(52px,7vw,108px)] font-extrabold leading-[0.9] tracking-[-0.04em]">
              {t("landing.hero.title")}
              <span aria-hidden="true" className="pa-bob" />
            </h1>
            <p className="m-0 max-w-[28em] text-pretty text-xl text-[var(--pa-text-soft)]">
              {t("landing.hero.lede")}
            </p>
            <div className="flex flex-wrap gap-3">
              <OpenChosen
                className={`bg-[var(--pa-accent)] px-[26px] py-4 text-[17px] font-semibold text-[var(--pa-ink-950)] no-underline ${focus}`}
              />
              <Link
                prefetch={false}
                href="#anatomy"
                className={`border border-[var(--pa-dash-quiet)] bg-[color-mix(in_srgb,var(--pa-ink-950)_85%,transparent)] px-6 py-[15px] text-[17px] font-medium text-[var(--pa-text)] no-underline ${focus}`}
              >
                {t("landing.hero.how")}
              </Link>
            </div>
          </HeroStage>

          <section
            aria-label={t("landing.timeIt.label")}
            className="border-t border-[var(--pa-ink-800)] bg-[var(--pa-ink-900)] [contain-intrinsic-size:auto_640px] [content-visibility:auto]"
          >
            <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-14 px-4 py-[104px] sm:px-8">
              <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-5">
                <h2 className={H2}>{t("landing.timeIt.title")}</h2>
                <p className="m-0 max-w-[30em] text-lg text-[var(--pa-text-soft)]">
                  {t("landing.timeIt.lede")}
                </p>
                <p className="m-0 max-w-[34em] text-[15px] text-[var(--pa-text-muted)]">
                  {t("landing.timeIt.wassce")}
                </p>
              </div>
              <TimeIt />
            </div>
          </section>

          <section
            id="anatomy"
            aria-label={t("landing.anatomy.label")}
            className="bg-[var(--pa-paper)] text-[var(--pa-on-paper)] [contain-intrinsic-size:auto_900px] [content-visibility:auto]"
          >
            <div className="mx-auto flex max-w-[1280px] flex-col gap-10 px-4 py-[104px] sm:px-8">
              <div className="flex flex-wrap items-end justify-between gap-x-16 gap-y-6">
                <h2 className={`${H2} max-w-[11em] text-[clamp(38px,5vw,68px)]`}>
                  {t("landing.anatomy.title")}
                </h2>
                <p className="m-0 max-w-[26em] text-lg text-[var(--pa-on-paper-muted)]">
                  {t("landing.anatomy.lede")}
                </p>
              </div>
              <Anatomy />
            </div>
          </section>

          <section
            id="coach"
            aria-label={t("landing.coach.label")}
            className="bg-[var(--pa-paper-2)] text-[var(--pa-on-paper)] [contain-intrinsic-size:auto_640px] [content-visibility:auto]"
          >
            <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-14 px-4 py-[104px] sm:px-8">
              <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-5">
                <h2 className={H2}>{t("landing.coach.title")}</h2>
                <p className="m-0 text-lg text-[var(--pa-on-paper-muted)]">
                  {t("landing.coach.lede")}
                </p>
                <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                  {(["voice", "levels", "exam"] as const).map((c) => (
                    <li
                      key={c}
                      className="border border-[var(--pa-paper-line)] bg-white px-3.5 py-2 text-sm"
                    >
                      {t(`landing.coach.chip.${c}`)}
                    </li>
                  ))}
                </ul>
              </div>
              <PlayWhenSeen className="flex min-w-0 flex-[1_1_600px]">
                <CoachDemo />
              </PlayWhenSeen>
            </div>
          </section>

          <section
            aria-label={t("landing.bento.label")}
            className="bg-[var(--pa-ink-950)] [contain-intrinsic-size:auto_1100px] [content-visibility:auto]"
          >
            <div className="mx-auto flex max-w-[1280px] flex-col gap-10 px-4 py-[104px] sm:px-8">
              <h2 className={`${H2} max-w-[14em]`}>{t("landing.bento.title")}</h2>
              <Bento data={bentoData()} />
            </div>
          </section>

          <section
            id="open"
            aria-label={t("landing.open.label")}
            className="bg-[var(--pa-accent)] text-[var(--pa-ink-950)] [contain-intrinsic-size:auto_560px] [content-visibility:auto]"
          >
            <div className="mx-auto flex max-w-[1280px] flex-wrap items-stretch gap-8 px-4 py-24 sm:px-8">
              <div className="flex min-w-0 flex-[1_1_360px] flex-col justify-center gap-4">
                <h2 className="m-0 font-display text-[clamp(40px,5.4vw,72px)] font-extrabold leading-[0.92] tracking-[-0.035em]">
                  {t("landing.open.title")}
                </h2>
                <p className="m-0 max-w-[26em] text-lg">{t("landing.open.lede")}</p>
              </div>
              <OpenBand />
            </div>
          </section>
        </main>
        <LandingFooter
          product={[
            { href: "/experiments", label: t("landing.footer.all") },
            { href: START, label: t("landing.cards.pendulum.title") },
            { href: "/lab/ohms-law", label: t("landing.cards.circuit.title") },
            { href: "/lab/converging-lens", label: t("landing.cards.lens.title") },
          ]}
        />
      </div>
    </PracticalProvider>
  );
}
