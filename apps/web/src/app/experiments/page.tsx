import { t, type MessageKey } from "@pa/i18n";
import "@pa/i18n/catalogue";
import type { Metadata } from "next";
import Link from "next/link";

import { absolute } from "../site";
import { CATALOGUE, labLinks, type Entry } from "./catalogue";
import { PracticalsGrid } from "./practicals-grid";
import { page } from "./seo";
import { SiteFrame } from "./site-frame";

export const metadata: Metadata = {
  title: `${t("catalogue.title")} · Physics Anatomy`,
  description: t("practicals.lede"),
  alternates: { canonical: absolute("/experiments") },
};

const focus =
  "focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[var(--pa-accent)]";

/** One practical's card: its figure on its topic's pastel ground, its reading, aim and apparatus. */
function PracticalCard({ e }: { e: Entry }) {
  const heading = `practical-${e.id}`;
  const { figure, badge } = e.card;
  return (
    <article
      aria-labelledby={heading}
      className="flex h-full min-w-0 flex-col bg-white transition-[transform,box-shadow] duration-[250ms] ease-[cubic-bezier(.2,.8,.2,1)] hover:-translate-y-[3px] hover:shadow-[0_18px_32px_-22px_color-mix(in_srgb,var(--pa-on-paper)_45%,transparent)] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <div
        className="relative flex min-h-[250px] items-center px-2 pb-2 pt-11"
        style={{ background: `color-mix(in srgb, var(--pa-topic-${e.topic}) 14%, white)` }}
      >
        <span className="absolute left-3.5 top-3 flex items-center gap-[7px] text-[13px] text-[var(--pa-on-paper)]">
          <span className="size-[9px]" style={{ background: `var(--pa-topic-${e.topic})` }} />
          {t(`catalogue.topic.${e.topic}` as MessageKey)}
        </span>
        <span
          data-badge
          className="absolute right-3 top-2.5 border border-[var(--pa-paper-line)] bg-white px-2 py-[3px] font-mono text-xs font-medium text-[var(--pa-on-paper)]"
        >
          {badge}
        </span>
        <svg
          viewBox={figure.viewBox}
          className="mx-auto block h-auto overflow-visible"
          style={{ width: figure.width }}
          role="img"
          aria-label={t(`practicals.figure.${e.id}` as MessageKey)}
        >
          {figure.draw()}
        </svg>
      </div>
      <div className="flex flex-1 flex-col gap-2.5 px-[18px] pb-5 pt-[18px]">
        <h2
          id={heading}
          className="m-0 font-display text-[21px] font-bold leading-[1.15] tracking-[-0.015em]"
        >
          {e.title}
        </h2>
        <p className="m-0 text-[15px] leading-normal text-[var(--pa-on-paper-muted)]">{e.aim}</p>
        <p className="m-0 text-[13px] leading-[1.45] text-[var(--pa-on-paper-muted)]">
          <b className="font-semibold text-[var(--pa-on-paper)]">{t("practicals.apparatus")}</b>{" "}
          {e.apparatus.join(", ")}
        </p>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-2">
          <Link
            prefetch={false}
            href={labLinks(e.id).open}
            className={`bg-[var(--pa-on-paper)] px-4 py-[11px] text-[15px] font-semibold text-[var(--pa-paper)] no-underline ${focus}`}
          >
            {t("practicals.open")}
          </Link>
          <Link
            prefetch={false}
            href={page(e.id)}
            className={`text-[15px] font-medium text-[var(--pa-on-paper)] underline-offset-4 ${focus}`}
          >
            {t("practicals.about")}
          </Link>
        </div>
      </div>
    </article>
  );
}

/** The practicals (design/mockups/Practicals.dc.html): every lab that exists, by topic. */
export default function ExperimentsPage() {
  return (
    <SiteFrame current="page">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-8 px-8 pb-[104px] pt-[72px] max-[520px]:px-4 max-[520px]:pt-12">
        <PracticalsGrid
          intro={
            <div className="flex max-w-[40em] flex-col gap-3.5">
              <h1 className="m-0 font-display text-[clamp(44px,6vw,80px)] font-extrabold leading-[0.92] tracking-[-0.035em]">
                {t("catalogue.title")}
              </h1>
              <p className="m-0 text-[19px] text-[var(--pa-on-paper-muted)]">
                {t("practicals.lede")}
              </p>
            </div>
          }
          cards={CATALOGUE.map((e) => ({
            id: e.id,
            topic: e.topic,
            node: <PracticalCard e={e} />,
          }))}
        />
        <p className="m-0 text-[15px] text-[var(--pa-on-paper-muted)]">
          {t("practicals.teachers")}
        </p>
      </div>
    </SiteFrame>
  );
}
