"use client";

import { emphasis, t } from "@pa/i18n";
import "@pa/i18n/landing";
import { graphPalette, Logo } from "@pa/ui";
import { useEffect, useRef, useState } from "react";

import type { BentoData } from "./cards-data";
import { stillPage } from "./use-lite";

/** The voice tile's level meter: a drawing of a voice, not data. */
const LEVELS = [
  0.4, 0.7, 0.5, 0.9, 0.6, 1, 0.8, 0.5, 0.7, 0.4, 0.6, 0.9, 1, 0.7, 0.5, 0.8, 0.6, 0.4, 0.7, 0.9,
  0.5, 0.6, 0.8, 0.4, 0.7, 0.5, 0.3, 0.6,
];

const tile = "flex flex-col gap-3.5 border border-[var(--pa-line)] bg-[var(--pa-ink-850)] p-7";
const h3 = "m-0 text-2xl font-semibold";
const body = "m-0 text-[var(--pa-text-soft)]";

/**
 * "Everything a real lab gives you" (Main.dc.html, the feature bento). Each tile names something
 * the lab does today; its numbers are the physics' (the graph, from the pendulum's period) or the
 * lab's own settings (the exam's time).
 */
export function Bento({ data }: { data: BentoData }) {
  const root = useRef<HTMLDivElement>(null);
  const [colour, setColour] = useState(true);
  const [left, setLeft] = useState(data.examMinutes * 60);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    let timer: ReturnType<typeof setInterval> | undefined;
    let seen: IntersectionObserver | undefined;
    if (stillPage()) el.dataset.still = "true";
    else {
      seen = new IntersectionObserver(([entry]) => {
        const on = entry?.isIntersecting ?? false;
        el.dataset.playing = String(on);
        clearInterval(timer);
        if (on)
          timer = setInterval(() => setLeft((s) => (s > 0 ? s - 1 : data.examMinutes * 60)), 1000);
      });
      seen.observe(el);
    }
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
      seen?.disconnect();
      clearInterval(timer);
    };
  }, [data.examMinutes]);

  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  const pal = colour ? graphPalette.colour : graphPalette.mono;
  const { points, slope, intercept, g } = data.graph;
  const X = (l: number) => 24 + ((l - 0.4) / 0.65) * 190;
  const Y = (v: number) => 116 - ((v - 1.5) / 2.8) * 108;
  const line = (l: number) => slope * l + intercept;
  const a = [X(0.55), Y(line(0.55))] as const;
  const b = [X(0.95), Y(line(0.95))] as const;
  let grid = "";
  for (let x = 24; x <= 214; x += 9.5) grid += `M${x.toFixed(1)} 8V116`;
  for (let y = 8; y <= 116; y += 9) grid += `M24 ${y.toFixed(1)}H214`;
  const segment = (on: boolean) =>
    `px-3 py-1.5 text-sm font-medium ${on ? "bg-[var(--pa-text)] text-[var(--pa-ink-950)]" : "bg-transparent text-[var(--pa-text-soft)]"} focus-visible:outline-2 focus-visible:outline-offset-[2px] focus-visible:outline-[var(--pa-accent)]`;

  return (
    <div ref={root} data-playing="false" className="grid grid-cols-1 gap-4 min-[901px]:grid-cols-3">
      <div className={`${tile} min-[901px]:col-span-2 flex-row flex-wrap items-center gap-6`}>
        <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-2.5">
          <h3 className={h3}>{t("landing.bento.voice")}</h3>
          <p className={body}>{t("landing.bento.voice.about")}</p>
        </div>
        <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-3.5 border border-[var(--pa-line)] bg-[var(--pa-ink-950)] p-[18px]">
          <div className="flex h-12 items-end gap-1" aria-hidden="true">
            {LEVELS.map((v, i) => (
              <span
                key={i}
                className="pa-bar flex-1"
                style={{
                  height: Math.round(v * 48),
                  background: i < 16 ? "var(--pa-accent)" : "var(--pa-line-strong)",
                  animationDelay: `${(i * 0.07).toFixed(2)}s`,
                }}
              />
            ))}
          </div>
          <span className="text-[15px]">
            “
            {emphasis(t("experiments.simple-pendulum.measure.start")).map((part, i) =>
              part.strong ? <b key={i}>{part.text}</b> : <span key={i}>{part.text}</span>,
            )}
            ”
          </span>
        </div>
      </div>

      <div className={tile}>
        <h3 className={h3}>{t("landing.bento.offline")}</h3>
        <p className={body}>{t("landing.bento.offline.about")}</p>
        <p
          role="status"
          data-online={online}
          className="m-0 flex items-center gap-2.5 self-start border border-[var(--pa-line-strong)] px-3 py-2 text-sm"
        >
          <span
            className="size-2 rounded-full"
            style={{ background: online ? "var(--pa-topic-measurement)" : "var(--pa-warn)" }}
          />
          {t(online ? "landing.bento.online" : "landing.bento.offlineNow")}
        </p>
      </div>

      <div className={tile}>
        <h3 className={h3}>{t("landing.bento.snapshots")}</h3>
        <p className={body}>{t("landing.bento.snapshots.about")}</p>
        <div className="relative h-[120px]" aria-hidden="true">
          <div className="absolute left-[30px] top-[18px] h-24 w-[150px] -rotate-[8deg] bg-[var(--pa-text-soft)]" />
          <div className="absolute left-[60px] top-2 h-24 w-[150px] rotate-[4deg] bg-[var(--pa-text)]" />
          <div className="absolute left-[90px] top-1 box-border flex h-[104px] w-40 flex-col justify-between bg-white px-2.5 py-2 text-[11px] text-[var(--pa-on-paper)]">
            <span className="flex justify-between">
              <b>{t("landing.bento.snapshots.fig")}</b>
              <span>{t("landing.bento.snapshots.caption")}</span>
            </span>
            <svg width="60" height="40" viewBox="0 0 60 40">
              <line x1="10" y1="2" x2="10" y2="38" stroke="currentColor" strokeWidth="2" />
              <line x1="10" y1="6" x2="38" y2="6" stroke="currentColor" strokeWidth="2" />
              <line x1="38" y1="6" x2="44" y2="30" stroke="currentColor" />
              <circle cx="45" cy="32" r="4" fill="var(--pa-accent)" />
            </svg>
            <span className="flex items-center gap-1 text-[var(--pa-on-paper-muted)]">
              <Logo size={10} />
              Physics Anatomy
            </span>
          </div>
        </div>
      </div>

      <div className={tile}>
        <h3 className={h3}>{t("landing.bento.exam")}</h3>
        <p className={body}>{t("landing.bento.exam.about")}</p>
        <span className="font-mono text-[44px] leading-none" aria-hidden="true">
          {mm}:{ss}
        </span>
        <span className="text-[13px] text-[var(--pa-text-muted)]">
          {t("landing.bento.exam.time", { minutes: data.examMinutes })}
        </span>
      </div>

      <div id="research" className={tile}>
        <h3 className={h3}>{t("landing.bento.results")}</h3>
        <p className={body}>{t("landing.bento.results.about")}</p>
        <div className="bg-white p-2.5">
          <svg
            viewBox="0 0 220 132"
            width={220}
            height={132}
            className="block h-auto w-full"
            role="img"
            aria-label={t("landing.bento.results.graph", {
              colour: t(colour ? "landing.bento.colour" : "landing.bento.mono"),
              slope: slope.toFixed(2),
              g: g.toFixed(2),
            })}
          >
            <path d={grid} stroke={pal.gridMinor} strokeWidth="0.6" fill="none" />
            <path d="M24 8 V116 H214" stroke={pal.frame} strokeWidth="1" fill="none" />
            <polyline
              points={`${a[0]},${a[1]} ${b[0]},${a[1]} ${b[0]},${b[1]} ${a[0]},${a[1]}`}
              fill={colour ? "color-mix(in srgb, var(--pa-topic-light) 14%, transparent)" : "none"}
              stroke={pal.triangle}
              strokeWidth="1"
              strokeDasharray="3 2"
            />
            <line
              x1={X(0.45)}
              y1={Y(line(0.45))}
              x2={X(1.03)}
              y2={Y(line(1.03))}
              stroke={pal.fit}
              strokeWidth="1.6"
            />
            {points.map((p) => (
              <circle
                key={p.x}
                cx={X(p.x)}
                cy={Y(p.y)}
                r="3"
                fill={colour ? pal.point : graphPalette.mono.paper}
                stroke={pal.point}
                strokeWidth="0.8"
              />
            ))}
            <text
              x="119"
              y="129"
              textAnchor="middle"
              fontFamily="var(--font-geist-mono), monospace"
              fontSize="8"
              fill={pal.label}
            >
              l / m
            </text>
            <text
              x="8"
              y="62"
              textAnchor="middle"
              fontFamily="var(--font-geist-mono), monospace"
              fontSize="8"
              fill={pal.label}
              transform="rotate(-90 8 62)"
            >
              T² / s²
            </text>
          </svg>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div
            role="group"
            aria-label={t("landing.bento.colours")}
            className="inline-flex border border-[var(--pa-line-strong)]"
          >
            <button
              type="button"
              aria-pressed={colour}
              onClick={() => setColour(true)}
              className={segment(colour)}
            >
              {t("landing.bento.colour")}
            </button>
            <button
              type="button"
              aria-pressed={!colour}
              onClick={() => setColour(false)}
              className={segment(!colour)}
            >
              {t("landing.bento.mono")}
            </button>
          </div>
          <span className="font-mono text-xs text-[var(--pa-text-muted)]">
            PNG · SVG · PDF · CSV · XLSX
          </span>
        </div>
      </div>
    </div>
  );
}
