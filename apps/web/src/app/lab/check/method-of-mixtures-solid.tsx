"use client";

import {
  hotSolid,
  methodOfMixtures,
  SOLID_CHECK_COLUMNS,
  SOLID_DATA_TEMPLATE,
  solidCheck,
  solidExample,
  type SolidResult,
} from "@pa/experiments";
import { t, type MessageKey } from "@pa/i18n";
import "@pa/i18n/method-of-mixtures";

import { CheckScreen, type CheckExperiment } from "./screen";

const M = "experiments.method-of-mixtures-solid.check";
const signed = (v: number, places: number) =>
  (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v).toFixed(places);

const PLACES: Record<string, number> = { t: 0, theta: 1 };

const T = SOLID_DATA_TEMPLATE;
// The example is the book's bench; it does not say which metal the solid is.
const BOOK = {
  solid: hotSolid.solidMass,
  empty: methodOfMixtures.calorimeter.mass * 1000,
  filled: methodOfMixtures.calorimeter.mass * 1000 + hotSolid.water,
  boiling: hotSolid.boiling,
};

const experiment: CheckExperiment = {
  id: hotSolid.id,
  title: t("experiments.method-of-mixtures-solid.title"),
  template: {
    ...T,
    title: t(T.title as MessageKey),
    note: t(T.note as MessageKey),
    values: T.values.map((v) => ({ ...v, label: t(v.label as MessageKey) })),
  },
  columns: SOLID_CHECK_COLUMNS.map((c) => ({ ...c, places: PLACES[c.id] ?? 1 })),
  check: (rows, values) => solidCheck(rows, values),
  example: solidExample(),
  exampleValues: BOOK,
  legendAt: "bottom-right",
  axes: { x: "t/min", y: "θ/°C" },
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
              ? t(`${M}.shift.found.${c.shift.value < 0 ? "below" : "above"}`)
              : t(`${M}.shift.on`),
          figure: given
            ? t(`${M}.shift.figure`, {
                value: signed(c.shift.value, 2),
                errors: Math.abs(c.shift.errors).toFixed(1),
              })
            : "",
        },
        ...(c.tilt
          ? [
              {
                part: "tilt" as const,
                found: c.tilt.found,
                text: c.tilt.found
                  ? t(`${M}.tilt.found.${c.tilt.value < 0 ? "falls" : "late"}`)
                  : t(`${M}.tilt.on`),
                figure: t(`${M}.tilt.figure`, {
                  value: signed(c.tilt.value, 2),
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
      const r = (lab as { result?: SolidResult }).result;
      return r ? t(`${M}.result`, { highest: r.highest.toFixed(1), c: r.c.toFixed(0) }) : "";
    },
    finding: (key, params) => t(key as MessageKey, params),
  },
};

/** The hot solid's model check: the shared screen, with this experiment's content. */
export function MethodOfMixturesSolidCheckScreen() {
  return <CheckScreen experiment={experiment} />;
}
