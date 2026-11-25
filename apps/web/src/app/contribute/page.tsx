import { t } from "@pa/i18n";
import "@pa/i18n/people";
import type { Metadata } from "next";

import { contributors, REPOSITORY } from "../_people/people-data";
import { BOX, BUTTON, Empty, H2, MUTED, PeoplePage } from "../_people/people-page";
import { absolute } from "../site";

export const metadata: Metadata = {
  title: `${t("people.contribute.title")} · Physics Anatomy`,
  alternates: { canonical: absolute("/contribute") },
};

/** Contributors and how to help (people pages brief, decision 5), from CONTRIBUTORS.yml. */
export default function ContributePage() {
  const list = contributors();
  return (
    <PeoplePage title={t("people.contribute.title")}>
      {list.length === 0 ? (
        <Empty title={t("people.contribute.none")} about={t("people.contribute.empty")} />
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {list.map((c) => (
            <li key={c.name} className={BOX}>
              <b>{c.name}</b>
              <span className={MUTED}>{c.contribution}</span>
            </li>
          ))}
        </ul>
      )}
      <section className={BOX} aria-labelledby="how">
        <h2 id="how" className={H2}>
          {t("people.contribute.how")}
        </h2>
        <ul className="m-0 flex list-disc flex-col gap-1 pl-5">
          <li>{t("people.contribute.report")}</li>
          <li>{t("people.contribute.review")}</li>
          <li>{t("people.contribute.code")}</li>
        </ul>
        <a href={REPOSITORY} className={BUTTON}>
          {t("people.contribute.github")}
        </a>
      </section>
    </PeoplePage>
  );
}
