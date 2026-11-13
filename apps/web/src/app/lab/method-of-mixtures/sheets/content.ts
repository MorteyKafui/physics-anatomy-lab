import { MIXTURES_SHEET_NUMBER, mixturesSheet, type MixturesSheet } from "@pa/experiments";
import { t, type MessageKey } from "@pa/i18n";
import "@pa/i18n/method-of-mixtures";

import type { SheetContent } from "../../sheets/content";
import { MIXTURES_STEPS } from "./figures";

/**
 * The words and numbers on the mixtures print sheets. The words are the lab's own (packages/i18n);
 * every number comes from mixturesSheet, worked out by the heat model.
 */

export interface MixturesSheetContent extends SheetContent {
  model: MixturesSheet;
}

const S = "experiments.method-of-mixtures.sheet";
const msg = (key: string, params?: Record<string, string | number>) => t(key as MessageKey, params);

export function mixturesSheetContent(): MixturesSheetContent {
  const m = mixturesSheet();
  const first = m.points[0]!;
  const params = {
    hot: m.hotVolume,
    hotT: m.hotTemperature.toFixed(1),
    room: m.room.toFixed(1),
    g: (m.calorimeterMass * 1000).toFixed(0),
    c: m.calorimeterC.toFixed(0),
    W: m.waterEquivalent.toFixed(1),
    intercept: m.intercept.toFixed(1),
    slope: m.slope.toFixed(0),
    v: first.volume,
    rise: first.rise.toFixed(1),
    ideal: first.ideal.toFixed(1),
    lost: (first.ideal - first.rise).toFixed(1),
    at: first.at.toFixed(0),
    loss: m.lossPerMinute.toFixed(0),
    mixing: m.mixing.toFixed(0),
    lag: m.lag.toFixed(0),
    thermometer: m.thermometer,
    cylinder: m.cylinder,
    list: m.points.map((p) => p.volume).join(", "),
    count: m.points.length,
  };
  return {
    name: t("experiments.method-of-mixtures.title"),
    drawingTitle: t(`${S}.drawingTitle`),
    number: MIXTURES_SHEET_NUMBER,
    kicker: t("sheet.kicker"),
    style: t(`${S}.style`),
    question: t(`${S}.question`),
    lead: t(`${S}.lead`),
    numbers: [
      { value: params.W, unit: "cm³", label: t(`${S}.n.W`, params) },
      { value: params.intercept, unit: "cm³", label: t(`${S}.n.intercept`) },
      { value: params.rise, unit: "°C", label: t(`${S}.n.rise`, params) },
      { value: params.at, unit: "s", label: t(`${S}.n.at`) },
      { value: String(m.points.length), unit: "", label: t(`${S}.n.count`) },
    ],
    parts: (["C", "L", "T", "S"] as const).map((letter) => ({
      n: t(`experiments.method-of-mixtures.report.letter.${letter}`),
      name: t(`experiments.method-of-mixtures.report.legend.${letter}`),
      say: msg(`${S}.part.${letter}`, params),
    })),
    spec: (["calorimeter", "volumes", "scales", "model", "result"] as const).map(
      (k): [string, string] => [msg(`${S}.spec.${k}`), msg(`${S}.spec.${k}Value`, params)],
    ),
    steps: MIXTURES_STEPS.map((s) => ({
      title: msg(`${S}.step.${s.id}.title`, params),
      text: msg(`${S}.step.${s.id}.text`, params),
    })),
    why: { title: t(`${S}.why.title`), text: msg(`${S}.why.text`, params) },
    motto: t(`${S}.motto`),
    model: m,
  };
}
