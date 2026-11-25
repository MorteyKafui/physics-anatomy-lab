import { t, type MessageKey } from "@pa/i18n";
import "@pa/i18n/catalogue";
import { topicHue } from "@pa/ui";
import type { Metadata } from "next";
import Link from "next/link";

import { absolute } from "../site";
import { CATALOGUE } from "./catalogue";
import { SiteFrame } from "./site-frame";

export const metadata: Metadata = {
  title: `${t("catalogue.title")} · Physics Anatomy`,
  description: t("catalogue.lede"),
  alternates: { canonical: absolute("/experiments") },
};

/** Every lab that exists (docs/content/experiment-pages-brief.md, decision 1). */
export default function ExperimentsPage() {
  return (
    <SiteFrame>
      <div className="mx-auto flex max-w-[1280px] flex-col gap-8 px-4 py-14 sm:px-8">
        <div className="flex max-w-[44em] flex-col gap-4">
          <h1 className="m-0 font-display text-[clamp(44px,7vw,80px)] font-extrabold leading-[0.95] tracking-[-0.03em]">
            {t("catalogue.title")}
          </h1>
          <p className="m-0 text-lg text-[var(--pa-on-paper-muted)]">{t("catalogue.lede")}</p>
        </div>
        <ul
          aria-label={t("catalogue.label")}
          className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4 p-0"
        >
          {CATALOGUE.map((e) => (
            <li key={e.id}>
              <Link
                prefetch={false}
                href={`/experiments/${e.id}`}
                className="flex h-full flex-col gap-2 border border-[var(--pa-paper-line)] bg-white p-5 text-[var(--pa-on-paper)] no-underline hover:border-[var(--pa-on-paper)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pa-accent)]"
              >
                <span className="flex items-center gap-2 text-[13px] text-[var(--pa-on-paper-muted)]">
                  <span className="size-2" style={{ background: topicHue[e.topic] }} />
                  {t(`catalogue.topic.${e.topic}` as MessageKey)}
                </span>
                <span className="text-xl font-semibold leading-tight">{e.title}</span>
                <span className="text-[15px] text-[var(--pa-on-paper-muted)]">{e.aim}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </SiteFrame>
  );
}
