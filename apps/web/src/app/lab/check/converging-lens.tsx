"use client";

import {
  convergingLens,
  LENS_CHECK_COLUMNS,
  LENS_DATA_TEMPLATE,
  lensCheck,
  lensExample,
  type LensResult,
} from "@pa/experiments";
import { t, type MessageKey } from "@pa/i18n";
import "@pa/i18n/converging-lens";

import { CheckScreen, type CheckExperiment } from "./screen";

const M = "experiments.converging-lens.check";

/** Decimal places in the table, as the lab's table writes them: lengths to 0.1 cm, reciprocals to 4. */
const PLACES: Record<string, number> = { u: 1, v1: 1, v2: 1, v: 2, invU: 4, invV: 4 };

const T = LENS_DATA_TEMPLATE;
const experiment: CheckExperiment = {
  id: convergingLens.id,
  title: t("experiments.converging-lens.title"),
  template: {
    ...T,
    title: t(T.title as MessageKey),
    note: t(T.note as MessageKey),
    values: T.values.map((v) => ({ ...v, label: t(v.label as MessageKey) })),
  },
  columns: LENS_CHECK_COLUMNS.map((c) => ({ ...c, places: PLACES[c.id] ?? 3 })),
  check: (rows, values) => lensCheck(rows, values),
  example: lensExample(),
  axes: { x: "u⁻¹/cm⁻¹", y: "v⁻¹/cm⁻¹" },
  copy: {
    templateBody: t(`${M}.template.body`),
    tableNote: t(`${M}.table.note`),
    graphTitle: t(`${M}.graph.title`),
    graphLabel: (n) => t(`${M}.graph.label`, { n }),
    legendModel: t(`${M}.legend.model`),
    parts: (c) => {
      const f =
        c.fit && c.fit.slope < 0
          ? 2 / (c.fit.intercept - c.fit.intercept / c.fit.slope)
          : undefined;
      const marked = c.shift.error > 0;
      return [
        {
          part: "shift",
          found: c.shift.found,
          neutral: !marked,
          text: !marked
            ? t(`${M}.shift.unmarked`)
            : c.shift.found
              ? t(`${M}.shift.found.${c.shift.value < 0 ? "longer" : "shorter"}`)
              : t(`${M}.shift.on`),
          figure: f === undefined ? "" : t(`${M}.shift.figure.unmarked`, { f: f.toFixed(1) }),
        },
        ...(c.tilt
          ? [
              {
                part: "tilt" as const,
                found: c.tilt.found,
                text: c.tilt.found
                  ? t(
                      `${M}.tilt.found.${Math.abs(c.tilt.value) < Math.abs(c.tilt.model) ? "shallower" : "steeper"}`,
                    )
                  : t(`${M}.tilt.on`),
                figure: t(`${M}.tilt.figure`, {
                  value: c.tilt.value.toFixed(3).replace("-", "−"),
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
            value: c.spread.value.toFixed(5),
            ratio: c.spread.ratio.toFixed(1),
          }),
        },
      ];
    },
    result: (lab) => {
      const r = (lab as { result?: LensResult }).result;
      return r
        ? t(`${M}.result`, { m1: r.m1.toFixed(4), m2: r.m2.toFixed(4), f: r.f.toFixed(1) })
        : t(`${M}.result.none`);
    },
    finding: (key, params) => t(key as MessageKey, params),
  },
};

/** The converging lens's model check: the shared screen, with this experiment's content. */
export function ConvergingLensCheckScreen() {
  return <CheckScreen experiment={experiment} />;
}
