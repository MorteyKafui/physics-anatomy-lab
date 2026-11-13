"use client";

import {
  PENDULUM_CHECK_COLUMNS,
  PENDULUM_DATA_TEMPLATE,
  pendulumCheck,
  pendulumExample,
  simplePendulum,
} from "@pa/experiments";
import { DEFAULT_ENVIRONMENT } from "@pa/instruments";
import { t, type MessageKey } from "@pa/i18n";

import { CheckScreen, type CheckExperiment } from "./screen";

const M = "experiments.simple-pendulum.check";
const swings = simplePendulum.swings;
const g = DEFAULT_ENVIRONMENT.g;
const signed = (v: number, places: number) =>
  (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v).toFixed(places);

/** Decimal places in the table, as the lab's table writes them: l to 3, times to 2, T to 3. */
const PLACES: Record<string, number> = { l: 2, t1: 2, t2: 2, t: 2, T: 3, T2: 3 };

// Made once: the experiment's template and words do not change while the page is open.
const experiment: CheckExperiment = {
  id: simplePendulum.id,
  title: t("experiments.simple-pendulum.title"),
  template: {
    ...PENDULUM_DATA_TEMPLATE,
    title: t(PENDULUM_DATA_TEMPLATE.title as MessageKey),
    note: t(PENDULUM_DATA_TEMPLATE.note as MessageKey, { swings }),
  },
  columns: PENDULUM_CHECK_COLUMNS.map((c) => ({ ...c, places: PLACES[c.id] ?? 3 })),
  check: (rows) => pendulumCheck(rows, g),
  example: pendulumExample(g),
  axes: { x: "l/m", y: "T²/s²" },
  copy: {
    templateBody: t(`${M}.template.body`, { swings }),
    tableNote: t(`${M}.table.note`, { swings }),
    graphTitle: t(`${M}.graph.title`),
    graphLabel: (n) => t(`${M}.graph.label`, { n }),
    legendModel: t(`${M}.legend.model`, { g: g.toFixed(2) }),
    parts: (c) => [
      {
        part: "shift",
        found: c.shift.found,
        text: c.shift.found
          ? t(`${M}.shift.found.${c.shift.value > 0 ? "above" : "below"}`)
          : t(`${M}.shift.on`),
        figure: t(`${M}.shift.figure`, {
          value: signed(c.shift.value, 3),
          errors: Math.abs(c.shift.errors).toFixed(1),
        }),
      },
      ...(c.tilt
        ? [
            {
              part: "tilt" as const,
              found: c.tilt.found,
              text: c.tilt.found
                ? t(`${M}.tilt.found.${c.tilt.value > c.tilt.model ? "steeper" : "shallower"}`)
                : t(`${M}.tilt.on`),
              figure: t(`${M}.tilt.figure`, {
                value: c.tilt.value.toFixed(2),
                errors: Math.abs(c.tilt.errors).toFixed(1),
              }),
            },
          ]
        : []),
      {
        part: "spread",
        found: c.spread.found,
        text: c.spread.found
          ? t(`${M}.spread.found`, { times: c.spread.ratio.toFixed(1) })
          : t(`${M}.spread.on`),
        figure: t(`${M}.spread.figure`, {
          value: c.spread.value.toFixed(3),
          ratio: c.spread.ratio.toFixed(1),
        }),
      },
    ],
    result: (r) =>
      t(`${M}.g`, { g: r.check?.fit ? ((4 * Math.PI ** 2) / r.check.fit.slope).toFixed(2) : "–" }),
    finding: (key, params) => t(key as MessageKey, params),
  },
};

/** The simple pendulum's model check: the shared screen, with this experiment's content. */
export function PendulumCheckScreen() {
  return <CheckScreen experiment={experiment} />;
}
