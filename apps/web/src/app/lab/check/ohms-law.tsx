"use client";

import {
  OHMS_LAW_CHECK_COLUMNS,
  OHMS_LAW_DATA_TEMPLATE,
  ohmsLaw,
  ohmsLawCheck,
  ohmsLawExample,
  type OhmsLawResult,
} from "@pa/experiments";
import { t, type MessageKey } from "@pa/i18n";
import "@pa/i18n/ohms-law";

import { CheckScreen, type CheckExperiment } from "./screen";

const M = "experiments.ohms-law.check";

/** Decimal places in the table, as the lab's table writes them: PJ to 0.1 cm, meters to 0.01. */
const PLACES: Record<string, number> = { PJ: 1, I1: 2, I2: 2, I: 3, V1: 2, V2: 2, V: 3 };

const T = OHMS_LAW_DATA_TEMPLATE;
const experiment: CheckExperiment = {
  id: ohmsLaw.id,
  title: t("experiments.ohms-law.title"),
  template: {
    ...T,
    title: t(T.title as MessageKey),
    note: t(T.note as MessageKey),
    values: T.values.map((v) => ({ ...v, label: t(v.label as MessageKey) })),
  },
  columns: OHMS_LAW_CHECK_COLUMNS.map((c) => ({ ...c, places: PLACES[c.id] ?? 2 })),
  check: (rows, values) => ohmsLawCheck(rows, values),
  example: ohmsLawExample(),
  axes: { x: "V/V", y: "I/A" },
  copy: {
    templateBody: t(`${M}.template.body`),
    tableNote: t(`${M}.table.note`),
    graphTitle: t(`${M}.graph.title`),
    graphLabel: (n) => t(`${M}.graph.label`, { n }),
    agrees: t(`${M}.agrees`),
    parts: (c) => {
      const E = c.fit && c.fit.slope < 0 ? -c.fit.intercept / c.fit.slope : undefined;
      const marked = E !== undefined && c.shift.error > 0 ? E - c.shift.value : undefined;
      return [
        {
          part: "shift",
          found: c.shift.found,
          neutral: marked === undefined,
          text:
            marked === undefined
              ? t(`${M}.shift.unmarked`)
              : c.shift.found
                ? t(`${M}.shift.found.${c.shift.value < 0 ? "below" : "above"}`)
                : t(`${M}.shift.on`),
          figure:
            E === undefined
              ? ""
              : marked === undefined
                ? t(`${M}.shift.figure.unmarked`, { E: E.toFixed(2) })
                : t(`${M}.shift.figure`, {
                    E: E.toFixed(2),
                    marked: marked.toFixed(1),
                    errors: Math.abs(c.shift.errors).toFixed(1),
                  }),
        },
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
      ];
    },
    result: (lab) => {
      const r = (lab as { result?: OhmsLawResult }).result;
      return r
        ? t(`${M}.result`, { E: r.E.value.toFixed(2), r: r.r.toFixed(2) })
        : t(`${M}.result.none`);
    },
    finding: (key, params) => t(key as MessageKey, params),
  },
};

/** Ohm's law's model check: the shared screen, with this experiment's content. */
export function OhmsLawCheckScreen() {
  return <CheckScreen experiment={experiment} />;
}
