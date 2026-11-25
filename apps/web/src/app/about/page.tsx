import { t } from "@pa/i18n";
import "@pa/i18n/people";
import type { Metadata } from "next";

import { team } from "../_people/people-data";
import { BOX, Empty, MUTED, PeoplePage } from "../_people/people-page";
import { absolute } from "../site";

export const metadata: Metadata = {
  title: `${t("people.about.title")} · Physics Anatomy`,
  alternates: { canonical: absolute("/about") },
};

/** The team (people pages brief, decision 3): only people who have agreed to be listed. */
export default function AboutPage() {
  const people = team();
  return (
    <PeoplePage title={t("people.about.title")}>
      {people.length === 0 ? (
        <Empty title={t("people.about.empty")} about={t("people.about.empty.about")} />
      ) : (
        <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3 p-0">
          {people.map((p) => (
            <li key={p.name} className={`${BOX} flex-row items-center gap-3`}>
              {p.photo ? (
                // A small local photo, with its size given, so nothing shifts as it loads.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.photo}
                  alt={t("people.about.photo", { name: p.name })}
                  width={56}
                  height={56}
                  className="size-14 shrink-0 rounded-full object-cover"
                />
              ) : null}
              <span className="flex flex-col">
                <b>{p.name}</b>
                <span className={MUTED}>{p.role}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </PeoplePage>
  );
}
