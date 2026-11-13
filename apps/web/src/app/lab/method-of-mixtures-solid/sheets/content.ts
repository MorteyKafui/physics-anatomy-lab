import { SOLID_SHEET_NUMBER, solidSheet, type SolidSheet } from "@pa/experiments";
import { t, type MessageKey } from "@pa/i18n";
import "@pa/i18n/method-of-mixtures";

import type { SheetContent } from "../../sheets/content";
import { SOLID_STEPS } from "./figures";

/**
 * The words and numbers on the hot-solid print sheets. The words are the lab's own (packages/i18n);
 * every number comes from solidSheet, worked out by the heat model.
 */

export interface SolidSheetContent extends SheetContent {
  model: SolidSheet;
}

const S = "experiments.method-of-mixtures-solid.sheet";
const msg = (key: string, params?: Record<string, string | number>) => t(key as MessageKey, params);

export function solidSheetContent(): SolidSheetContent {
  const m = solidSheet();
  const copper = m.metals[0]!;
  const aluminium = m.metals.find((x) => x.metal.id === "aluminium")!;
  const params = {
    solid: m.solid,
    calorimeter: m.calorimeter,
    water: m.water,
    boiling: m.boiling,
    room: m.room.toFixed(1),
    cc: m.given.calorimeter,
    cw: m.given.water,
    balance: m.balance,
    thermometer: m.thermometer,
    air: m.airPerMinute.toFixed(0),
    sharing: m.sharing,
    T: Math.max(...copper.minutes).toFixed(1),
    c: copper.c.toFixed(0),
    cTrue: copper.metal.c,
    at: copper.peak.at.toFixed(0),
    alT: Math.max(...aluminium.minutes).toFixed(1),
    alC: aluminium.c.toFixed(0),
    list: m.metals
      .map((x) => t(`experiments.method-of-mixtures-solid.metal.${x.metal.id}` as MessageKey))
      .join(", "),
  };
  return {
    name: t("experiments.method-of-mixtures-solid.title"),
    drawingTitle: msg(`${S}.drawingTitle`),
    number: SOLID_SHEET_NUMBER,
    kicker: t("sheet.kicker"),
    style: msg(`${S}.style`),
    question: msg(`${S}.question`),
    lead: msg(`${S}.lead`),
    numbers: [
      { value: params.c, unit: "J kg⁻¹ K⁻¹", label: msg(`${S}.n.c`, params) },
      { value: params.T, unit: "°C", label: msg(`${S}.n.T`, params) },
      { value: params.at, unit: "s", label: msg(`${S}.n.at`) },
      { value: params.alC, unit: "J kg⁻¹ K⁻¹", label: msg(`${S}.n.al`, params) },
      { value: String(m.metals.length), unit: "", label: msg(`${S}.n.count`, params) },
    ],
    parts: (["B", "S", "C", "T"] as const).map((letter) => ({
      n: msg(`experiments.method-of-mixtures-solid.report.letter.${letter}`),
      name: msg(`experiments.method-of-mixtures-solid.report.legend.${letter}`),
      say: msg(`${S}.part.${letter}`, params),
    })),
    spec: (["solid", "masses", "scales", "model", "result"] as const).map((k): [string, string] => [
      msg(`${S}.spec.${k}`),
      msg(`${S}.spec.${k}Value`, params),
    ]),
    steps: SOLID_STEPS.map((s) => ({
      title: msg(`${S}.step.${s.id}.title`, params),
      text: msg(`${S}.step.${s.id}.text`, params),
    })),
    why: { title: msg(`${S}.why.title`), text: msg(`${S}.why.text`, params) },
    motto: msg(`${S}.motto`),
    model: m,
  };
}
