"use client";

import { t, type MessageKey } from "@pa/i18n";
import "@pa/i18n/landing";
import { topicHue, type Topic } from "@pa/ui";
import { useEffect, useRef, useState, type ReactNode } from "react";

import type { CardsData, FeedRow } from "./cards-data";
import { stillPage } from "./use-lite";

/** How often each card's feed moves on to its next reading, ms (the board's 2.6 s). */
const FEED_MS = 2600;

/** Where each part's note points, in the stage's 300 × 228 drawing (from the board). */
const ANCHORS: Record<
  "circuit" | "lens" | "mixtures",
  Record<string, readonly [number, number]>
> = {
  circuit: {
    cell: [132.7, 33.5],
    key: [169.1, 60.5],
    rheo: [218.4, 81],
    res: [146.5, 86.5],
    amm: [76.4, 72],
    volt: [161.3, 125],
  },
  lens: { obj: [91.1, 28], lens: [143.1, 56], screen: [195.9, 77.5], rule: [140.5, 112.5] },
  mixtures: { can: [150, 129], lag: [150, 102], cal: [150, 73], water: [150, 52], lid: [150, 20] },
};

type CardId = "pendulum" | "circuit" | "lens" | "mixtures";
interface Tip {
  card: CardId;
  at: readonly [number, number];
  title: string;
  text: string;
}

/** The isometric projection of the pendulum card's bar chart (the board's). */
const project = (x: number, y: number, z: number) =>
  [150 + (x - y) * 0.8660254, 92 + (x + y) * 0.5 - z] as const;
const points = (corners: readonly (readonly [number, number, number])[]) =>
  corners
    .map(([x, y, z]) => project(x, y, z))
    .map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`)
    .join(" ");

/** A topic hue mixed with white, for the cards' tinted stages and the pendulum's bars. */
const tint = (topic: Topic, percent: number) =>
  `color-mix(in srgb, ${topicHue[topic]} ${percent}%, white)`;

/**
 * The four experiment cards (Main.dc.html, after the Pulseboard reference; landing page brief,
 * decisions 4 and 5). Every reading comes from `cardsData`, worked out on the server from the
 * lab's own models. The feeds move on only while the cards are on screen, and never in Lite mode or
 * with reduced motion.
 */
/** The four stages' drawings, rendered on the server and passed in, so they ship as HTML only. */
export interface Stages {
  pendulum: ReactNode;
  circuit: ReactNode;
  lens: ReactNode;
  mixtures: ReactNode;
}

export function ExperimentCards({ data, stages }: { data: CardsData; stages: Stages }) {
  const root = useRef<HTMLDivElement>(null);
  const [tick, setTick] = useState(0);
  const [squared, setSquared] = useState(true);
  const [tip, setTip] = useState<Tip | null>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    if (stillPage()) {
      el.dataset.still = "true";
      return;
    }
    let timer: ReturnType<typeof setInterval> | undefined;
    const seen = new IntersectionObserver(([entry]) => {
      const on = entry?.isIntersecting ?? false;
      el.dataset.playing = String(on);
      clearInterval(timer);
      if (on) timer = setInterval(() => setTick((n) => n + 1), FEED_MS);
    });
    seen.observe(el);
    return () => {
      seen.disconnect();
      clearInterval(timer);
    };
  }, []);

  const partTip = (card: Exclude<CardId, "pendulum">, key: string): Tip => ({
    card,
    at: ANCHORS[card][key]!,
    title: t(`landing.cards.${card}.tip.${key}` as MessageKey, {
      R: data.circuit.resistor.toFixed(2),
      f: data.lens.focalLengthCm.toFixed(1),
      kg: data.mixtures.calorimeterKg.toFixed(3),
    }),
    text: t(`landing.cards.${card}.tip.${key}.note` as MessageKey),
  });

  /** Pointing at a part with data-tip shows its note; leaving the drawing hides it. */
  const stageEvents = (card: Exclude<CardId, "pendulum">) => ({
    onPointerOver: (e: React.PointerEvent) => {
      const key = (e.target as Element).closest("[data-tip]")?.getAttribute("data-tip");
      setTip(key ? partTip(card, key) : null);
    },
    onPointerLeave: () => setTip(null),
  });

  // The pendulum's bars: T or T² at six lengths, the one in the feed lit.
  const lit = tick % data.pendulum.bars.length;
  const tops: (readonly [number, number])[] = [];
  const bars = data.pendulum.bars.map((b, i) => {
    const x = 8 + i * 15;
    const y = 44;
    const z = 58;
    const w = 11;
    const h = squared ? (b.T2 - 1) * 19 : (b.T - 1.2) * 70;
    const top = project(x + w / 2, y + w / 2, z + h);
    tops.push(top);
    const on = i === lit;
    return (
      <g
        key={b.l}
        data-bar={i}
        className="cursor-pointer"
        stroke="var(--pa-figure-ink)"
        strokeWidth="1"
        strokeLinejoin="round"
        onPointerEnter={() =>
          setTip({
            card: "pendulum",
            at: top,
            title: `l = ${b.l.toFixed(3)} m`,
            text: `T = ${b.T.toFixed(3)} s,  T² = ${b.T2.toFixed(3)} s²`,
          })
        }
        onPointerLeave={() => setTip(null)}
      >
        <polygon
          points={points([
            [x, y + w, z],
            [x + w, y + w, z],
            [x + w, y + w, z + h],
            [x, y + w, z + h],
          ])}
          fill={tint("mechanics", on ? 85 : 35)}
        />
        <polygon
          points={points([
            [x + w, y, z],
            [x + w, y + w, z],
            [x + w, y + w, z + h],
            [x + w, y, z + h],
          ])}
          fill={tint("mechanics", on ? 95 : 65)}
        />
        <polygon
          points={points([
            [x, y, z + h],
            [x + w, y, z + h],
            [x + w, y + w, z + h],
            [x, y + w, z + h],
          ])}
          fill={tint("mechanics", on ? 100 : 15)}
        />
      </g>
    );
  });

  const segment = (on: boolean) =>
    `px-[9px] py-[3px] font-mono text-xs ${on ? "bg-[var(--pa-on-paper)] text-[var(--pa-paper)]" : "bg-transparent text-[var(--pa-on-paper-muted)]"} focus-visible:outline-2 focus-visible:outline-offset-[2px] focus-visible:outline-[var(--pa-accent)]`;

  return (
    <div
      ref={root}
      data-playing="false"
      className="bg-[linear-gradient(100deg,color-mix(in_srgb,var(--pa-topic-mechanics)_45%,transparent),color-mix(in_srgb,var(--pa-topic-electricity)_40%,transparent)_35%,color-mix(in_srgb,var(--pa-topic-light)_42%,transparent)_65%,color-mix(in_srgb,var(--pa-topic-heat)_45%,transparent))] p-2.5"
    >
      <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-2.5">
        <Card
          id="pendulum"
          topic="mechanics"
          rows={data.pendulum.rows}
          tick={tick}
          tip={tip?.card === "pendulum" ? tip : null}
          corner={
            <div
              role="group"
              aria-label={t("landing.cards.plot")}
              className="inline-flex border border-[var(--pa-paper-line)] bg-white"
            >
              <button
                type="button"
                aria-pressed={!squared}
                onClick={() => setSquared(false)}
                className={segment(!squared)}
              >
                T
              </button>
              <button
                type="button"
                aria-pressed={squared}
                onClick={() => setSquared(true)}
                className={segment(squared)}
              >
                T²
              </button>
            </div>
          }
          stage={
            <>
              {stages.pendulum}
              {bars}
              <polyline
                points={tops.map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`).join(" ")}
                fill="none"
                stroke="var(--pa-figure-ink)"
                strokeWidth="1.4"
                strokeDasharray="4 3"
                pointerEvents="none"
              />
            </>
          }
          label={t("landing.cards.pendulum.figure", { what: squared ? "T²" : "T" })}
        />
        <Card
          id="circuit"
          topic="electricity"
          rows={data.circuit.rows}
          tick={tick}
          tip={tip?.card === "circuit" ? tip : null}
          corner={<Badge>{data.circuit.badge}</Badge>}
          stage={stages.circuit}
          stageEvents={stageEvents("circuit")}
          label={t("landing.cards.circuit.figure")}
          positions={data.circuit.positions}
        />
        <Card
          id="lens"
          topic="light"
          rows={data.lens.rows}
          tick={tick}
          tip={tip?.card === "lens" ? tip : null}
          corner={<Badge>{data.lens.badge}</Badge>}
          stage={stages.lens}
          stageEvents={stageEvents("lens")}
          label={t("landing.cards.lens.figure")}
        />
        <Card
          id="mixtures"
          topic="heat"
          rows={data.mixtures.rows}
          tick={tick}
          tip={tip?.card === "mixtures" ? tip : null}
          corner={<Badge>{data.mixtures.badges[tick % data.mixtures.badges.length]}</Badge>}
          stage={stages.mixtures}
          stageEvents={stageEvents("mixtures")}
          label={t("landing.cards.mixtures.figure")}
        />
      </div>
    </div>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-block border border-[var(--pa-paper-line)] bg-white px-2 py-1 font-mono text-xs font-medium text-[var(--pa-on-paper)]">
      {children}
    </span>
  );
}

function Card({
  id,
  topic,
  rows,
  tick,
  tip,
  corner,
  stage,
  stageEvents,
  label,
  positions,
}: {
  id: CardId;
  topic: Topic;
  rows: FeedRow[];
  tick: number;
  tip: Tip | null;
  corner: ReactNode;
  stage: ReactNode;
  stageEvents?: {
    onPointerOver: (e: React.PointerEvent) => void;
    onPointerLeave: () => void;
  };
  label: string;
  positions?: number;
}) {
  // The newest reading first, then the two before it, fading.
  const shown = [0, 1, 2].map(
    (k) => rows[(((tick - k) % rows.length) + rows.length) % rows.length]!,
  );
  return (
    <article data-card={id} className="flex min-w-0 flex-col bg-white">
      <div className="relative pb-10 pt-3" style={{ background: tint(topic, 14) }}>
        <div className="absolute right-2.5 top-2.5 z-[2]">{corner}</div>
        <div className="relative" {...stageEvents}>
          <svg
            viewBox="0 0 300 228"
            width={300}
            height={228}
            className="block h-auto w-full overflow-visible"
            role="img"
            aria-label={label}
          >
            {stage}
          </svg>
          {tip && (
            <div
              role="tooltip"
              className="pointer-events-none absolute z-[5] flex w-max max-w-[200px] -translate-x-1/2 -translate-y-[calc(100%+10px)] flex-col gap-0.5 bg-[var(--pa-on-paper)] px-2.5 py-2 text-xs leading-[1.35] text-[var(--pa-paper)] shadow-[0_10px_24px_-12px_color-mix(in_srgb,var(--pa-ink-1000)_50%,transparent)]"
              style={{
                left: `${((tip.at[0] / 300) * 100).toFixed(2)}%`,
                top: `${((tip.at[1] / 228) * 100).toFixed(2)}%`,
              }}
            >
              <b className="font-semibold">{tip.title}</b>
              <span className="text-[var(--pa-text-soft)]">{tip.text}</span>
            </div>
          )}
        </div>
      </div>
      <div className="relative mx-3 -mt-[30px] flex flex-col gap-1.5 border border-[var(--pa-paper-line)] bg-white px-3 py-2.5 shadow-[0_10px_24px_-16px_color-mix(in_srgb,var(--pa-on-paper)_35%,transparent)]">
        <span className="flex items-center gap-1.5 text-xs text-[var(--pa-on-paper-muted)]">
          <span className="pa-pulse size-[7px] rounded-full bg-[var(--pa-topic-measurement)]" />
          {t("landing.cards.live")}
        </span>
        {shown.map((r, k) => (
          <div
            key={`${tick}-${k}`}
            data-feed-row={k}
            className={`flex justify-between gap-2 whitespace-nowrap font-mono text-xs ${
              [
                "text-[var(--pa-on-paper)] pa-row-in",
                "text-[var(--pa-on-paper-muted)]",
                "text-[var(--pa-on-paper-muted)]",
              ][k]
            }`}
          >
            <span>{r[0]}</span>
            <span>{r[1]}</span>
            <span>{r[2]}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-1.5 px-4 pb-5 pt-4">
        <span className="flex items-center gap-2 text-[13px] text-[var(--pa-on-paper-muted)]">
          <span className="size-2" style={{ background: topicHue[topic] }} />
          {t(`landing.cards.${id}.topic` as MessageKey)}
        </span>
        <h3 className="m-0 text-[19px] font-semibold leading-tight">
          {t(`landing.cards.${id}.title` as MessageKey)}
        </h3>
        <p className="m-0 text-sm text-[var(--pa-on-paper-muted)]">
          {t(`landing.cards.${id}.about` as MessageKey, { positions: positions ?? 0 })}
        </p>
      </div>
    </article>
  );
}
