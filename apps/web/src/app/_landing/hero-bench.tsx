"use client";

import { t, type MessageKey } from "@pa/i18n";
import "@pa/i18n/landing";
import { topicHue } from "@pa/ui";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";

import type { CardsData, FeedRow } from "./cards-data";
import { tint } from "./pendulum-bars";
import { PRACTICALS, practicalShort, useChosenPractical, type PracticalId } from "./practicals";
import { stillPage } from "./use-lite";

/**
 * The practicals the hero's bench tours: the first three (Mortey, 26 November 2026), so the tabs fit
 * one row. The other three are a click away on the practicals page and in the orange band.
 */
const HERO_PRACTICALS = PRACTICALS.slice(0, 3);

/** Lite mode and reduced motion are fixed for the page's life: nothing to subscribe to. */
const noSubscription = () => () => {};

/** How often the readings move on, ms (the board's 2.6 s), and the tour to the next practical. */
const FEED_MS = 2600;
const TOUR_MS = 7000;

/** Where each part's note points, in the stage's 300 × 228 drawing (from the board). */
const ANCHORS: Partial<Record<PracticalId, Record<string, readonly [number, number]>>> = {
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

interface Tip {
  at: readonly [number, number];
  title: string;
  text: string;
}

/**
 * Each practical's drawing, rendered on the server and passed in. The pendulum's is a whole
 * `<svg>` (the assembled stand); the others are the contents of a 300 × 228 drawing.
 */
export type BenchStages = Record<PracticalId, ReactNode>;

/**
 * The hero's bench (Landing.dc.html): one tab per practical, each showing its real set-up on its
 * topic's ground, with its readings from the lab's models (`cardsData`) and its aim. The tabs
 * move on by themselves while the bench is on screen, until the visitor picks one, pauses the
 * tour, or points at the bench; never in Lite mode or with reduced motion.
 */
export function HeroBench({ data, stages }: { data: CardsData; stages: BenchStages }) {
  const { index, practical, choose } = useChosenPractical();
  const root = useRef<HTMLDivElement>(null);
  const [tick, setTick] = useState(0);
  const [touring, setTouring] = useState(true);
  const [held, setHeld] = useState(false);
  // Lite mode and reduced motion are read once, in the browser: the server renders a touring bench.
  const still = useSyncExternalStore(noSubscription, stillPage, () => false);
  const [tip, setTip] = useState<Tip | null>(null);

  // The readings move on only while the bench is on screen.
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

  // The tour: the next practical every 7 s, unless paused, held by the pointer or focus, or still.
  useEffect(() => {
    if (!touring || held || still) return;
    const timer = setTimeout(() => {
      choose((index + 1) % HERO_PRACTICALS.length);
      setTip(null);
    }, TOUR_MS);
    return () => clearTimeout(timer);
  }, [touring, held, still, index, choose]);

  const pick = (i: number) => {
    choose(i);
    setTouring(false);
    setTip(null);
  };

  const id = practical.id;
  const anchors = ANCHORS[id];
  const stageEvents = anchors
    ? {
        onPointerOver: (e: React.PointerEvent) => {
          const key = (e.target as Element).closest("[data-tip]")?.getAttribute("data-tip");
          if (!key || !anchors[key]) return setTip(null);
          setTip({
            at: anchors[key],
            title: t(`landing.cards.${id}.tip.${key}` as MessageKey, {
              R: data.circuit.resistor.toFixed(2),
              f: data.lens.focalLengthCm.toFixed(1),
              kg: data.mixtures.calorimeterKg.toFixed(3),
            }),
            text: t(`landing.cards.${id}.tip.${key}.note` as MessageKey),
          });
        },
        onPointerLeave: () => setTip(null),
      }
    : {};

  const rows: FeedRow[] = data[id].rows;
  const shown = [0, 1, 2].map(
    (k) => rows[(((tick - k) % rows.length) + rows.length) % rows.length]!,
  );
  const badge =
    id === "mixtures"
      ? data.mixtures.badges[tick % data.mixtures.badges.length]!
      : id === "pendulum"
        ? `T = ${data.pendulum.bars[3]!.T.toFixed(3)} s, l = ${data.pendulum.bars[3]!.l.toFixed(3)} m`
        : data[id].badge;

  const focus =
    "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--pa-accent)]";

  return (
    <div
      ref={root}
      data-playing="false"
      data-practical={id}
      onPointerEnter={() => setHeld(true)}
      onPointerLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={() => setHeld(false)}
      className="flex min-w-0 flex-col border border-[var(--pa-ink-800)] bg-[var(--pa-ink-900)] shadow-[0_30px_60px_-30px_color-mix(in_srgb,var(--pa-ink-1000)_90%,transparent)]"
    >
      <div
        role="tablist"
        aria-label={t("landing.bench.label")}
        className="grid grid-cols-3 border-b border-[var(--pa-ink-800)]"
      >
        {HERO_PRACTICALS.map((p, i) => {
          const on = i === index;
          return (
            <button
              key={p.id}
              type="button"
              role="tab"
              id={`bench-tab-${p.id}`}
              aria-selected={on}
              aria-controls="bench-panel"
              tabIndex={on ? 0 : -1}
              onClick={() => pick(i)}
              onKeyDown={(e) => {
                const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
                if (!step) return;
                e.preventDefault();
                const next = (i + step + HERO_PRACTICALS.length) % HERO_PRACTICALS.length;
                pick(next);
                document.getElementById(`bench-tab-${HERO_PRACTICALS[next]!.id}`)?.focus();
              }}
              className={`flex items-center gap-2 border-b border-r border-[var(--pa-ink-800)] px-3.5 py-3 text-left text-sm ${focus} ${
                on
                  ? "font-semibold text-[var(--pa-on-paper)]"
                  : "font-medium text-[var(--pa-text-soft)] hover:text-[var(--pa-text)]"
              }`}
              style={
                on
                  ? {
                      background: tint(p.topic, 14),
                      boxShadow: `inset 0 -3px 0 ${topicHue[p.topic]}`,
                    }
                  : undefined
              }
            >
              <span className="size-2 flex-none" style={{ background: topicHue[p.topic] }} />
              {t(`landing.bench.${p.id}.tab` as MessageKey)}
            </button>
          );
        })}
      </div>

      <div
        id="bench-panel"
        role="tabpanel"
        aria-labelledby={`bench-tab-${id}`}
        className="relative flex min-h-[340px] flex-col justify-center transition-[background] duration-500 motion-reduce:transition-none"
        style={{ background: tint(practical.topic, 14) }}
      >
        <div className="absolute left-3.5 top-3 z-[2] flex flex-col text-[var(--pa-on-paper)]">
          <span className="text-xs text-[var(--pa-on-paper-muted)]">
            {t("landing.bench.fig", { n: index + 1 })}
          </span>
          <span className="text-sm font-semibold">
            {t(`landing.cards.${id}.title` as MessageKey)}
          </span>
        </div>
        <span className="absolute right-3.5 top-3 z-[2] border border-[var(--pa-paper-line)] bg-white px-2 py-1 font-mono text-xs font-medium text-[var(--pa-on-paper)]">
          {badge}
        </span>
        <div key={id} className="pa-stage-in px-6 pb-4 pt-12">
          <div className="relative mx-auto w-full max-w-[520px]" {...stageEvents}>
            {id === "pendulum" ? (
              stages.pendulum
            ) : (
              <svg
                viewBox="0 0 300 228"
                width={300}
                height={228}
                className="block h-auto w-full overflow-visible"
                role="img"
                aria-label={t(`landing.cards.${id}.figure` as MessageKey)}
              >
                {stages[id]}
              </svg>
            )}
            {tip && (
              <div
                role="tooltip"
                className="pointer-events-none absolute z-[5] flex w-max max-w-[220px] -translate-x-1/2 -translate-y-[calc(100%+10px)] flex-col gap-0.5 bg-[var(--pa-on-paper)] px-2.5 py-2 text-xs leading-[1.35] text-[var(--pa-paper)]"
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
      </div>

      <div className="grid grid-cols-1 border-t border-[var(--pa-ink-800)] sm:grid-cols-[1.1fr_1fr]">
        <div className="flex flex-col gap-1.5 border-[var(--pa-ink-800)] px-[18px] py-4 sm:border-r">
          <span className="flex items-center gap-2 text-xs text-[var(--pa-text-muted)]">
            <span className="pa-pulse size-[7px] rounded-full bg-[var(--pa-accent)]" />
            {t("landing.cards.live")}
          </span>
          {shown.map((r, k) => (
            <div
              key={`${id}-${tick}-${k}`}
              data-feed-row={k}
              className={`grid grid-cols-3 gap-2 whitespace-nowrap font-mono text-xs ${
                [
                  "text-[var(--pa-text)] pa-row-in",
                  "text-[var(--pa-text-muted)]",
                  "text-[var(--pa-text-faint)]",
                ][k]
              }`}
            >
              <span>{r[0]}</span>
              <span>{r[1]}</span>
              <span>{r[2]}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-col justify-between gap-3 px-[18px] py-4">
          <p className="m-0 text-sm leading-[1.45] text-[var(--pa-text-soft)]">
            {t(`landing.cards.${id}.about` as MessageKey, { positions: data.circuit.positions })}
          </p>
          <div className="flex items-center justify-between gap-2.5">
            <Link
              prefetch={false}
              href={practical.href}
              className="text-[15px] font-semibold text-[var(--pa-text)] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[var(--pa-accent)]"
            >
              {t("landing.bench.openThis")}
              <span className="sr-only">: {practicalShort(id)}</span>
            </Link>
            {!still && (
              <button
                type="button"
                aria-pressed={touring}
                aria-label={touring ? t("landing.bench.pause") : t("landing.bench.play")}
                onClick={() => setTouring((v) => !v)}
                className="flex size-8 items-center justify-center border border-[var(--pa-dash-quiet)] text-[var(--pa-text-soft)] focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[var(--pa-accent)]"
              >
                {touring ? (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <rect x="6" y="5" width="4" height="14" />
                    <rect x="14" y="5" width="4" height="14" />
                  </svg>
                ) : (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M7 5v14l12-7z" />
                  </svg>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** The hero's main button: it names the practical the bench shows. */
export function OpenChosen({ className }: { className: string }) {
  const { practical } = useChosenPractical();
  return (
    <Link prefetch={false} href={practical.href} className={className}>
      {t("landing.hero.open", { name: practicalShort(practical.id) })}
    </Link>
  );
}
