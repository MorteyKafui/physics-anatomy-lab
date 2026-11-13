"use client";

import {
  lensPins,
  PINS_CHECK_COLUMNS,
  PINS_DATA_TEMPLATE,
  pinsCheck,
  pinsExample,
  type PinsResult,
} from "@pa/experiments";
import { t, type MessageKey } from "@pa/i18n";
import "@pa/i18n/converging-lens";

import { CheckScreen, type CheckExperiment } from "./screen";

const M = "experiments.converging-lens-pins.check";
const signed = (v: number, places: number) =>
  (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v).toFixed(places);

/** Decimal places in the table: lengths to 0.1 cm, as the rule reads; xy to the nearest cm². */
const PLACES: Record<string, number> = { x: 1, y1: 1, y2: 1, y: 2, xy: 0, xPlusY: 1 };

const T = PINS_DATA_TEMPLATE;
const experiment: CheckExperiment = {
  id: lensPins.id,
  title: t("experiments.converging-lens-pins.title"),
  template: {
    ...T,
    title: t(T.title as MessageKey),
    note: t(T.note as MessageKey),
    values: T.values.map((v) => ({ ...v, label: t(v.label as MessageKey) })),
  },
  columns: PINS_CHECK_COLUMNS.map((c) => ({ ...c, places: PLACES[c.id] ?? 1 })),
  check: (rows, values) => pinsCheck(rows, values),
  example: pinsExample(),
  axes: { x: "(x + y)/cm", y: "xy/cm²" },
  copy: {
    templateBody: t(`${M}.template.body`),
    tableNote: t(`${M}.table.note`),
    graphTitle: t(`${M}.graph.title`),
    graphLabel: (n) => t(`${M}.graph.label`, { n }),
    legendModel: t(`${M}.legend.model`),
    parts: (c) => [
      {
        part: "shift",
        found: c.shift.found,
        text: c.shift.found ? t(`${M}.shift.found`) : t(`${M}.shift.on`),
        figure: t(`${M}.shift.figure`, {
          value: signed(c.shift.value, 0),
          errors: Math.abs(c.shift.errors).toFixed(1),
        }),
      },
      {
        part: "tilt",
        found: c.tilt?.found ?? false,
        neutral: !c.tilt,
        text: !c.tilt
          ? t(`${M}.tilt.unmarked`)
          : c.tilt.found
            ? t(`${M}.tilt.found.${c.tilt.value > c.tilt.model ? "longer" : "shorter"}`)
            : t(`${M}.tilt.on`),
        figure: c.fit ? t(`${M}.tilt.figure`, { f: c.fit.slope.toFixed(1) }) : "",
      },
      {
        part: "spread",
        found: c.spread.found,
        text: c.spread.found
          ? t(`${M}.spread.found`, { times: c.spread.ratio.toFixed(1) })
          : t(`${M}.spread.on`),
        figure: t(`${M}.spread.figure`, {
          value: c.spread.value.toFixed(1),
          ratio: c.spread.ratio.toFixed(1),
        }),
      },
    ],
    result: (lab) => {
      const r = (lab as { result?: PinsResult }).result;
      return r ? t(`${M}.result`, { f: r.f.toFixed(1) }) : "";
    },
    finding: (key, params) => t(key as MessageKey, params),
  },
};

/** The lens with two pins' model check: the shared screen, with this experiment's content. */
export function ConvergingLensPinsCheckScreen() {
  return <CheckScreen experiment={experiment} />;
}
