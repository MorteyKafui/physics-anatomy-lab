"use client";

import { t, type MessageKey } from "@pa/i18n";
import "@pa/i18n/catalogue";
import { topicHue, type Topic } from "@pa/ui";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type ReactNode } from "react";

/** One practical's card, drawn on the server, and the topic it is filtered by. */
export interface Card {
  id: string;
  topic: Topic;
  node: ReactNode;
}

/** Every topic in the master plan, in its order: a chip each, even before it has a practical. */
const TOPICS = Object.keys(topicHue) as Topic[];

const focus =
  "focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[var(--pa-accent)]";

/**
 * The topic chips and the cards on the four-colour frame (Practicals.dc.html). There is a chip for
 * every topic, with how many practicals it has; a chip shows only its topic's practicals, or says
 * they are coming soon. All shows every one. Without JavaScript every card shows.
 * /experiments?topic=heat (the header's "All heat practicals") opens on that topic's chip.
 */
export function PracticalsGrid({ cards, intro }: { cards: Card[]; intro: ReactNode }) {
  const [topic, setTopic] = useState<Topic | "all">("all");
  const chips = [
    { id: "all" as const, name: t("practicals.all"), count: cards.length },
    ...TOPICS.map((tp) => ({
      id: tp,
      name: t(`catalogue.topic.${tp}` as MessageKey),
      count: cards.filter((c) => c.topic === tp).length,
    })),
  ];

  const pick = (id: Topic | "all") => {
    setTopic(id);
    const url = new URL(window.location.href);
    if (id === "all") url.searchParams.delete("topic");
    else url.searchParams.set("topic", id);
    window.history.replaceState(null, "", url);
  };

  return (
    <>
      <Suspense fallback={null}>
        <TopicFromUrl topics={TOPICS} onTopic={setTopic} />
      </Suspense>
      <div className="flex flex-wrap items-end justify-between gap-x-12 gap-y-5">
        {intro}
        <div role="group" aria-label={t("practicals.filter")} className="flex flex-wrap gap-1.5">
          {chips.map((c) => {
            const on = topic === c.id;
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={on}
                onClick={() => pick(c.id)}
                className={`inline-flex cursor-pointer items-center gap-0.5 border px-3 py-2 text-sm font-medium ${
                  on
                    ? "border-[var(--pa-on-paper)] bg-[var(--pa-on-paper)] text-[var(--pa-paper)]"
                    : "border-[var(--pa-paper-line)] bg-white text-[var(--pa-on-paper)]"
                } ${focus}`}
              >
                {c.id !== "all" && (
                  <span
                    aria-hidden="true"
                    className="mr-1.5 inline-block size-2"
                    style={{ background: `var(--pa-topic-${c.id})` }}
                  />
                )}
                {c.name}
                <span className="ml-1 font-mono text-xs opacity-70">{c.count}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="bg-[linear-gradient(100deg,color-mix(in_srgb,var(--pa-topic-mechanics)_45%,transparent),color-mix(in_srgb,var(--pa-topic-electricity)_40%,transparent)_35%,color-mix(in_srgb,var(--pa-topic-light)_42%,transparent)_65%,color-mix(in_srgb,var(--pa-topic-heat)_45%,transparent))] p-2.5">
        <ul
          aria-label={t("practicals.label")}
          className="m-0 grid list-none grid-cols-3 gap-2.5 p-0 max-[1100px]:grid-cols-2 max-[700px]:grid-cols-1"
        >
          {cards.map((c) => (
            <li
              key={c.id}
              data-practical={c.id}
              hidden={topic !== "all" && topic !== c.topic}
              className="min-w-0"
            >
              {c.node}
            </li>
          ))}
        </ul>
        {topic !== "all" && !cards.some((c) => c.topic === topic) && (
          <p
            role="status"
            className="m-0 bg-white px-6 py-16 text-center text-[17px] text-[var(--pa-on-paper-muted)]"
          >
            {t("practicals.soon", {
              topic: t(`catalogue.topic.${topic}` as MessageKey).toLowerCase(),
            })}
          </p>
        )}
      </div>
    </>
  );
}

/** Follows ?topic= in the address, so a header link to a topic shows only its practicals. */
function TopicFromUrl({
  topics,
  onTopic,
}: {
  topics: Topic[];
  onTopic: (t: Topic | "all") => void;
}) {
  const wanted = useSearchParams().get("topic");
  useEffect(() => {
    onTopic(topics.includes(wanted as Topic) ? (wanted as Topic) : "all");
  }, [wanted, topics, onTopic]);
  return null;
}
