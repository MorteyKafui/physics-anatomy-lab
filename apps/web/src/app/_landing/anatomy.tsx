"use client";

import { simplePendulum } from "@pa/experiments";
import { t, type MessageKey } from "@pa/i18n";
import "@pa/i18n/landing";
import { ANTICIPATED_EVENT } from "@pa/instruments";
import { colour, figureTone, figureTonePaper } from "@pa/ui";
import { useId, useState, type ReactNode } from "react";

type PartId = "base" | "rod" | "clamp" | "cork" | "thread" | "bob" | "watch";

interface Part {
  id: PartId;
  /** How far the part moves when the stand is fully apart, in the drawing's units. */
  apart: readonly [number, number];
  /** Where its note points, in the drawing's units (viewBox 90 -10 400 350). */
  anchor: readonly [number, number];
  drawing: ReactNode;
}

/** The drawing on paper takes the print figure tones (packages/ui), as the report's figures do. */
const P = figureTonePaper;
const D = figureTone;
const INK = P.ink;

/**
 * The exploded pendulum stand (Main.dc.html, "Every part has a job"): the board's isometric
 * drawing, part by part, with how far each part moves apart and where its note points.
 */
const PARTS: readonly Part[] = [
  {
    id: "base",
    apart: [0, 24],
    anchor: [260, 254],
    drawing: (
      <>
        <polygon points="166.5,253.0 279.1,318.0 279.1,308.0 166.5,243.0" fill={P.baseSide} />
        <polygon points="353.5,275.0 279.1,318.0 279.1,308.0 353.5,265.0" fill={P.baseSideDark} />
        <polygon points="240.9,200.0 353.5,265.0 279.1,308.0 166.5,243.0" fill={P.baseTop} />
      </>
    ),
  },
  {
    id: "rod",
    apart: [0, 0],
    anchor: [227.1, 123],
    drawing: (
      <>
        <polygon points="221.0,233.5 227.1,237.0 227.1,47.0 221.0,43.5" fill={P.rodLight} />
        <polygon points="233.2,233.5 227.1,237.0 227.1,47.0 233.2,43.5" fill={P.rod} />
        <polygon points="227.1,40.0 233.2,43.5 227.1,47.0 221.0,43.5" fill={P.dial} />
      </>
    ),
  },
  {
    id: "clamp",
    apart: [30, -26],
    anchor: [257.4, 88.5],
    drawing: (
      <>
        <polygon points="212.4,83.5 227.1,92.0 227.1,76.0 212.4,67.5" fill={P.rod} />
        <polygon points="241.8,83.5 227.1,92.0 227.1,76.0 241.8,67.5" fill={P.clampEdge} />
        <polygon points="227.1,59.0 241.8,67.5 227.1,76.0 212.4,67.5" fill={P.clamp} />
        <polygon points="232.3,84.0 292.9,119.0 292.9,113.0 232.3,78.0" fill={P.clamp} />
        <polygon points="297.2,116.5 292.9,119.0 292.9,113.0 297.2,110.5" fill={P.rod} />
        <polygon points="236.6,75.5 297.2,110.5 292.9,113.0 232.3,78.0" fill={P.rodLight} />
      </>
    ),
  },
  {
    id: "cork",
    apart: [56, -44],
    anchor: [296.4, 111],
    drawing: (
      <>
        <polygon points="286.8,131.5 295.5,136.5 295.5,118.5 286.8,113.5" fill={D.cork} />
        <polygon points="305.9,130.5 295.5,136.5 295.5,118.5 305.9,112.5" fill={P.corkEdge} />
        <polygon points="297.2,107.5 305.9,112.5 295.5,118.5 286.8,113.5" fill={P.cork} />
      </>
    ),
  },
  {
    id: "thread",
    apart: [72, -20],
    anchor: [296.4, 178],
    drawing: (
      <>
        <polyline points="296.4,131.0 296.4,221.0" fill="none" stroke={INK} strokeWidth="1.6" />
        <polyline
          points="296.4,131.0 296.4,221.0"
          fill="none"
          stroke={INK}
          strokeOpacity="0"
          strokeWidth="14"
        />
      </>
    ),
  },
  {
    id: "bob",
    apart: [90, 6],
    anchor: [296.4, 219],
    drawing: (
      <>
        <circle cx="296.4" cy="233.0" r="13" fill={colour.accent} stroke={INK} strokeWidth="1.2" />
        <circle cx="292.4" cy="229.0" r="4" fill={P.bobLight} />
        <line
          x1="278.4"
          y1="233.0"
          x2="314.4"
          y2="233.0"
          stroke={INK}
          strokeWidth="1"
          strokeDasharray="2 2"
        />
      </>
    ),
  },
  {
    id: "watch",
    apart: [-36, 14],
    anchor: [163, 265],
    drawing: (
      <>
        <path
          d="M133.0 285.0 L133.0 295.0 A30 15 0 0 0 193.0 295.0 L193.0 285.0 Z"
          fill={D.baseSide}
        />
        <ellipse cx="163.0" cy="285.0" rx="30" ry="15" fill={P.dial} strokeWidth="1.2" />
        <ellipse cx="163.0" cy="285.0" rx="23" ry="11.5" fill={P.baseTop} strokeWidth="0.8" />
        <line x1="163.0" y1="285.0" x2="175.0" y2="280.0" stroke={colour.accent} strokeWidth="2" />
        <line x1="163.0" y1="285.0" x2="157.0" y2="278.0" stroke={INK} strokeWidth="1.6" />
        <rect x="159.0" y="264.0" width="8" height="8" fill={INK} />
      </>
    ),
  },
];

/**
 * The same stand, put together, with the thread and bob swinging (Landing.dc.html, the hero's
 * bench). The swing is a CSS animation that reduced motion and Lite mode stop.
 */
export function StandFigure() {
  const part = (id: PartId) => (
    <g key={id} data-part={id} stroke={INK} strokeWidth="1" strokeLinejoin="round">
      {PARTS.find((p) => p.id === id)!.drawing}
    </g>
  );
  return (
    <svg
      viewBox="90 -10 400 350"
      width={400}
      height={350}
      className="mx-auto block h-auto w-[86%]"
      role="img"
      aria-label={t("landing.bench.pendulum.figure")}
    >
      {(["base", "rod", "clamp", "cork"] as const).map(part)}
      <g className="pa-swing">{(["thread", "bob"] as const).map(part)}</g>
      {part("watch")}
    </svg>
  );
}

const name = (id: PartId) => t(`landing.anatomy.${id}` as MessageKey);
/** Each part's note; the stopwatch's numbers come from the lab's stopwatch and timing model. */
const note = (id: PartId) =>
  t(`landing.anatomy.${id}.note` as MessageKey, {
    leastCount: simplePendulum.stopwatch.resolution,
    reaction: ANTICIPATED_EVENT.meanDelay,
    swings: simplePendulum.swings,
  });

/**
 * "Every part has a job" (Main.dc.html): the stand pulled apart by a slider, and a note on every
 * part. Pointing at a part, or focusing its row, lights it and shows its note. Its motion is a
 * CSS transition, which reduced motion turns off.
 */
export function Anatomy() {
  const [apart, setApart] = useState(55);
  const [on, setOn] = useState<PartId | null>(null);
  const slider = useId();
  const e = apart / 100;
  const tip = on ? PARTS.find((p) => p.id === on)! : null;

  return (
    <div className="flex flex-wrap items-stretch gap-8">
      <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-4 border border-[var(--pa-paper-line)] bg-white p-6">
        <div className="relative">
          <svg
            viewBox="90 -10 400 350"
            width={400}
            height={350}
            className="block h-auto w-full"
            role="img"
            aria-label={t("landing.anatomy.figure")}
          >
            <defs>
              <pattern id="pa-anatomy-grid" width="24" height="24" patternUnits="userSpaceOnUse">
                <path d="M24 0H0V24" fill="none" stroke={P.floorLine} strokeWidth="1" />
              </pattern>
            </defs>
            <rect x="90" y="-10" width="400" height="350" fill="url(#pa-anatomy-grid)" />
            {PARTS.map((p) => (
              <g
                key={p.id}
                data-part={p.id}
                onPointerEnter={() => setOn(p.id)}
                onPointerLeave={() => setOn(null)}
                stroke={INK}
                strokeWidth="1"
                strokeLinejoin="round"
                className="cursor-pointer transition-[transform,opacity] duration-[350ms] ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none"
                style={{
                  opacity: on && on !== p.id ? 0.22 : 1,
                  transform: `translate(${(p.apart[0] * e).toFixed(1)}px, ${(p.apart[1] * e).toFixed(1)}px)`,
                }}
              >
                {p.drawing}
              </g>
            ))}
          </svg>
          {tip && (
            <div
              role="tooltip"
              className="pointer-events-none absolute z-[5] flex w-max max-w-[240px] -translate-x-1/2 -translate-y-[calc(100%+12px)] flex-col gap-[3px] bg-[var(--pa-on-paper)] px-[11px] py-[9px] text-[13px] leading-[1.4] text-[var(--pa-paper)]"
              style={{
                left: `${(((tip.anchor[0] + tip.apart[0] * e - 90) / 400) * 100).toFixed(2)}%`,
                top: `${(((tip.anchor[1] + tip.apart[1] * e + 10) / 350) * 100).toFixed(2)}%`,
              }}
            >
              <b className="font-semibold">{name(tip.id)}</b>
              <span className="text-[var(--pa-text-soft)]">{note(tip.id)}</span>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <label htmlFor={slider} className="font-semibold">
            {t("landing.anatomy.assembled")}
          </label>
          <input
            id={slider}
            type="range"
            min={0}
            max={100}
            value={apart}
            aria-valuetext={t("landing.anatomy.valueText", { percent: apart })}
            onChange={(ev) => setApart(Number(ev.target.value))}
            className="flex-[1_1_200px] accent-[var(--pa-accent)] focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[var(--pa-accent)]"
          />
          <span className="font-semibold" aria-hidden="true">
            {t("landing.anatomy.apart")}
          </span>
        </div>
      </div>
      <ul className="m-0 flex min-w-0 flex-[1_1_340px] list-none flex-col gap-2 p-0">
        {PARTS.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              aria-pressed={on === p.id}
              onPointerEnter={() => setOn(p.id)}
              onPointerLeave={() => setOn(null)}
              onFocus={() => setOn(p.id)}
              onBlur={() => setOn(null)}
              className={`flex w-full flex-col gap-0.5 border px-4 py-3 text-left focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[var(--pa-accent)] ${
                on === p.id
                  ? "border-[var(--pa-accent)] bg-white"
                  : "border-[var(--pa-paper-line)] bg-transparent"
              }`}
            >
              <span className="text-[17px] font-semibold">{name(p.id)}</span>
              <span className="text-[15px] text-[var(--pa-on-paper-muted)]">{note(p.id)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
