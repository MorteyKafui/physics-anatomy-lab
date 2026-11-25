import { t, type MessageKey } from "@pa/i18n";
import "@pa/i18n/people";
import type { Metadata } from "next";

import { REPOSITORY } from "../_people/people-data";
import { partners } from "../_people/people-files";
import { BOX, Empty, H2, MUTED, PeoplePage } from "../_people/people-page";
import { absolute } from "../site";

export const metadata: Metadata = {
  title: `${t("people.partners.title")} · Physics Anatomy`,
  alternates: { canonical: absolute("/partners") },
};

/** Partners and sponsors (people pages brief, decision 4; docs/partners.md). */
export default function PartnersPage() {
  const list = partners();
  return (
    <PeoplePage title={t("people.partners.title")}>
      <section className={BOX} aria-labelledby="rules">
        <h2 id="rules" className={H2}>
          {t("people.partners.rules")}
        </h2>
        <ul className="m-0 flex list-disc flex-col gap-1 pl-5">
          <li>{t("people.partners.noAds")}</li>
          <li>{t("people.partners.noSay")}</li>
        </ul>
      </section>
      {list.length === 0 ? (
        <Empty title={t("people.partners.empty")} about={t("people.partners.empty.about")} />
      ) : (
        <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3 p-0">
          {list.map((p) => (
            <li key={p.name} className={BOX}>
              {/* A partner's own logo, with its size given, so nothing shifts as it loads. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.logo}
                alt={t("people.partners.logo", { name: p.name })}
                width={160}
                height={64}
                className="h-16 w-40 object-contain"
              />
              {p.link ? (
                <a href={p.link} rel="noopener" className="font-semibold underline">
                  {p.name}
                </a>
              ) : (
                <b>{p.name}</b>
              )}
              <span className={MUTED}>{t(`people.partners.kind.${p.kind}` as MessageKey)}</span>
            </li>
          ))}
        </ul>
      )}
      <section className={BOX} aria-labelledby="become">
        <h2 id="become" className={H2}>
          {t("people.partners.become")}
        </h2>
        <p className={`m-0 ${MUTED}`}>{t("people.partners.become.about")}</p>
        <a href={`${REPOSITORY}/issues`} className="self-start underline">
          {t("people.partners.issues")}
        </a>
      </section>
    </PeoplePage>
  );
}
