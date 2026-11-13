"use client";

import {
  methodOfMixtures,
  MIXTURES_CHECK_COLUMNS,
  MIXTURES_DATA_TEMPLATE,
  mixturesCheck,
  mixturesExample,
  type MixturesResult,
} from "@pa/experiments";
import { t, type MessageKey } from "@pa/i18n";
import "@pa/i18n/method-of-mixtures";

import { CheckScreen, type CheckExperiment } from "./screen";

const M = "experiments.method-of-mixtures.check";

/** Decimal places in the table, as the lab's table writes them. */
const PLACES: Record<string, number> = { V: 0, theta1: 1, theta2: 1, T: 1, invT: 4 };

const T = MIXTURES_DATA_TEMPLATE;
// The example is the book's bench: 50 cm³ of hot water at 65 °C.
const BOOK = {
  hotVolume: methodOfMixtures.hot.volume,
  hotTemperature: methodOfMixtures.hot.temperature,
};

const experiment: CheckExperiment = {
  id: methodOfMixtures.id,
  title: t("experiments.method-of-mixtures.title"),
  template: {
    ...T,
    title: t(T.title as MessageKey),
    note: t(T.note as MessageKey),
    values: T.values.map((v) => ({ ...v, label: t(v.label as MessageKey) })),
  },
  columns: MIXTURES_CHECK_COLUMNS.map((c) => ({ ...c, places: PLACES[c.id] ?? 2 })),
  check: (rows, values) => mixturesCheck(rows, values),
  example: mixturesExample(),
  exampleValues: BOOK,
  axes: { x: "T⁻¹/°C⁻¹", y: "V/cm³" },
  copy: {
    templateBody: t(`${M}.template.body`),
    tableNote: t(`${M}.table.note`),
    graphTitle: t(`${M}.graph.title`),
    graphLabel: (n) => t(`${M}.graph.label`, { n }),
    legendModel: t(`${M}.legend.model`),
    parts: (c) => {
      const given = c.shift.error > 0;
      return [
        {
          part: "shift",
          found: c.shift.found,
          neutral: !given,
          text: !given
            ? t(`${M}.shift.unmarked`)
            : c.shift.found
              ? t(`${M}.shift.found`)
              : t(`${M}.shift.on`),
          figure: "",
        },
        ...(c.tilt
          ? [
              {
                part: "tilt" as const,
                found: c.tilt.found,
                text: c.tilt.found
                  ? t(`${M}.tilt.found.${c.tilt.value < c.tilt.model ? "lower" : "higher"}`)
                  : t(`${M}.tilt.on`),
                figure: t(`${M}.tilt.figure`, {
                  value: c.tilt.value.toFixed(0),
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
            value: c.spread.value.toFixed(2),
            ratio: c.spread.ratio.toFixed(1),
          }),
        },
      ];
    },
    result: (lab) => {
      const r = (lab as { result?: MixturesResult }).result;
      return r
        ? t(`${M}.result`, {
            slope: r.slope.toFixed(0),
            intercept: r.intercept.toFixed(1).replace("-", "−"),
            W: r.W.toFixed(1),
          })
        : "";
    },
    finding: (key, params) => t(key as MessageKey, params),
  },
};

/** The method of mixtures' model check: the shared screen, with this experiment's content. */
export function MethodOfMixturesCheckScreen() {
  return <CheckScreen experiment={experiment} />;
}
