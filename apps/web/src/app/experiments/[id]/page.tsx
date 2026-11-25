import { t, type MessageKey } from "@pa/i18n";
import "@pa/i18n/catalogue";
import { topicHue } from "@pa/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { absolute } from "../../site";
import { CATALOGUE, entry, labLinks } from "../catalogue";
import { citation, learningResource, page } from "../seo";
import { SiteFrame } from "../site-frame";
import { CopyCitation } from "./copy-citation";

export const dynamicParams = false;

export function generateStaticParams() {
  return CATALOGUE.map((e) => ({ id: e.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const e = entry((await params).id);
  if (!e) return {};
  return {
    title: `${e.title} · Physics Anatomy`,
    description: e.aim,
    alternates: { canonical: absolute(page(e.id)) },
    openGraph: { title: e.title, description: e.aim, type: "website", url: absolute(page(e.id)) },
  };
}

const button =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pa-accent)]";
const box = "flex flex-col gap-2.5 border border-[var(--pa-paper-line)] bg-white p-5";
const h2 = "m-0 font-display text-2xl font-bold tracking-[-0.01em]";

/** One experiment's page (design/mockups/ExperimentPage.dc.html). */
export default async function ExperimentPage({ params }: { params: Promise<{ id: string }> }) {
  const e = entry((await params).id);
  if (!e) notFound();
  const links = labLinks(e.id);
  const sibling = e.sibling ? entry(e.sibling) : undefined;
  const others = CATALOGUE.filter((o) => o.id !== e.id);
  const topic = t(`catalogue.topic.${e.topic}` as MessageKey);
  return (
    <SiteFrame>
      <script
        type="application/ld+json"
        // JSON-LD from the experiment's own data; < is escaped so no text can close the tag.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(learningResource(e)).replace(/</g, "\\u003c"),
        }}
      />
      <div className="mx-auto flex max-w-[1280px] flex-col gap-8 px-4 pb-[72px] pt-10 sm:px-8">
        <nav
          aria-label={t("catalogue.breadcrumb")}
          className="text-sm text-[var(--pa-on-paper-muted)]"
        >
          <Link
            prefetch={false}
            href="/experiments"
            className="text-[var(--pa-on-paper)] underline"
          >
            {t("catalogue.title")}
          </Link>{" "}
          / {topic}
        </nav>

        <div className="grid items-center gap-10 min-[900px]:grid-cols-[1.1fr_1fr]">
          <div className="flex flex-col gap-[18px]">
            <span className="flex items-center gap-2 text-sm text-[var(--pa-on-paper-muted)]">
              <span className="size-2.5" style={{ background: topicHue[e.topic] }} />
              {topic} · {t("catalogue.version", { version: e.version })}
            </span>
            <h1 className="m-0 font-display text-[clamp(44px,6vw,72px)] font-extrabold leading-[0.95] tracking-[-0.03em]">
              {e.title}
            </h1>
            <p className="m-0 text-xl">{e.aim}</p>
            <div className="flex flex-wrap gap-2.5">
              <Link
                prefetch={false}
                href={links.open}
                className={`bg-[var(--pa-accent)] px-[22px] py-3.5 font-semibold text-[var(--pa-ink-950)] no-underline ${button}`}
              >
                {t("catalogue.open")}
              </Link>
              {(["check", "sheets", "exam"] as const).map((k) => (
                <Link
                  key={k}
                  prefetch={false}
                  href={links[k]}
                  className={`border border-[var(--pa-on-paper)] px-5 py-[13px] font-medium text-[var(--pa-on-paper)] no-underline ${button}`}
                >
                  {t(`catalogue.${k}`)}
                </Link>
              ))}
            </div>
            <span className="text-sm text-[var(--pa-on-paper-muted)]">{t("catalogue.free")}</span>
          </div>
          <div
            className="border border-[var(--pa-paper-line)] px-4 pb-6 pt-3"
            style={{ background: `color-mix(in srgb, ${topicHue[e.topic]} 14%, white)` }}
          >
            <svg
              viewBox="0 0 300 228"
              width={300}
              height={228}
              className="block h-auto w-full overflow-visible"
              role="img"
              aria-label={t("catalogue.figure", { experiment: e.title.toLowerCase() })}
            >
              {e.drawing()}
            </svg>
          </div>
        </div>

        <div className="grid gap-4 min-[900px]:grid-cols-2">
          <section className={box} aria-labelledby="catches">
            <h2 id="catches" className={h2}>
              {t("catalogue.catches")}
            </h2>
            <ul className="m-0 flex list-disc flex-col gap-1.5 pl-5">
              {e.catches.map((c, i) => (
                <li key={`${e.rules[i]}`}>{c}</li>
              ))}
            </ul>
          </section>
          <section className={box} aria-labelledby="apparatus">
            <h2 id="apparatus" className={h2}>
              {t("catalogue.apparatus")}
            </h2>
            <ul className="m-0 flex list-disc flex-col gap-1.5 pl-5">
              {e.apparatus.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </section>
        </div>

        <div className="grid gap-4 min-[900px]:grid-cols-2">
          <section className={box} aria-labelledby="physics">
            <h2 id="physics" className={h2}>
              {t("catalogue.physics")}
            </h2>
            <p className="m-0">{e.theory}</p>
            <p className="m-0 font-semibold">{t("catalogue.finds", { quantity: e.teaches })}</p>
            {sibling && (
              <p className="m-0 text-[var(--pa-on-paper-muted)]">
                {t("catalogue.sibling")}{" "}
                <Link
                  prefetch={false}
                  href={page(sibling.id)}
                  className="text-[var(--pa-on-paper)] underline"
                >
                  {sibling.title}
                </Link>
              </p>
            )}
          </section>
          <section className={box} aria-labelledby="model" data-model-card>
            <h2 id="model" className={h2}>
              {t("catalogue.model")}
            </h2>
            <dl className="m-0 flex flex-col gap-2">
              {(
                [
                  ["how", e.model.how],
                  ["assumes", e.model.assumes],
                  ["limits", e.model.limits],
                  ["validated", e.model.validated],
                ] as const
              ).map(([k, v]) => (
                <div key={k}>
                  <dt className="inline font-semibold">{t(`catalogue.model.${k}`)} </dt>
                  <dd className="m-0 inline">{v}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>

        <section className={box} aria-labelledby="cite">
          <h2 id="cite" className={h2}>
            {t("catalogue.cite")}
          </h2>
          <CopyCitation text={citation(e)} />
        </section>

        <section className="flex flex-col gap-3.5" aria-labelledby="more">
          <h2 id="more" className={h2}>
            {t("catalogue.more")}
          </h2>
          <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3 p-0">
            {others.map((o) => (
              <li key={o.id}>
                <Link
                  prefetch={false}
                  href={page(o.id)}
                  className={`flex h-full flex-col gap-1 border border-[var(--pa-paper-line)] bg-white p-3.5 text-[15px] text-[var(--pa-on-paper)] no-underline hover:border-[var(--pa-on-paper)] ${button}`}
                >
                  <span className="text-[13px] text-[var(--pa-on-paper-muted)]">
                    {t(`catalogue.topic.${o.topic}` as MessageKey)}
                  </span>
                  {o.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </SiteFrame>
  );
}
