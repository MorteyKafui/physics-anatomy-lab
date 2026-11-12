import { PINS_SHEET_NUMBER, pinsSheet, type PinsSheet } from "@pa/experiments";
import { t, type MessageKey } from "@pa/i18n";
import "@pa/i18n/converging-lens";

import type { SheetContent } from "../../sheets/content";
import { PINS_STEPS } from "./figures";

/**
 * The words and numbers on the two-pin print sheets. The words are the lab's own
 * (packages/i18n); every number comes from pinsSheet, worked out by the exact lens model.
 */

export interface PinsSheetContent extends SheetContent {
  model: PinsSheet;
}

const S = "experiments.converging-lens-pins.sheet";
const msg = (key: string, params?: Record<string, string | number>) => t(key as MessageKey, params);
const cm = (m: number, digits = 1) => (m * 100).toFixed(digits);

export function pinsSheetContent(): PinsSheetContent {
  const m = pinsSheet();
  const first = m.points[0]!;
  const params = {
    f: cm(m.focalLength),
    slope: cm(m.slope, 2),
    n: m.index.toFixed(2),
    d: cm(m.aperture),
    rule: cm(m.ruleResolution),
    eye: cm(m.eyeBehind, 0),
    head: cm(m.head),
    x: cm(first.x),
    y: cm(first.y),
    thin: cm(first.thin),
    xy: (first.x * first.y * 1e4).toFixed(0),
    sum: cm(first.x + first.y),
    stretch: (m.stretch * 1000).toFixed(0),
    list: m.points.map((p) => cm(p.x)).join(", "),
    count: m.points.length,
  };
  return {
    name: t("experiments.converging-lens-pins.title"),
    drawingTitle: t(`${S}.drawingTitle`),
    number: PINS_SHEET_NUMBER,
    kicker: t("sheet.kicker"),
    style: t(`${S}.style`),
    question: t(`${S}.question`),
    lead: t(`${S}.lead`),
    numbers: [
      { value: params.slope, unit: "cm", label: t(`${S}.n.f`) },
      { value: params.y, unit: "cm", label: t(`${S}.n.y`, params) },
      { value: params.xy, unit: "cm²", label: t(`${S}.n.xy`, params) },
      { value: params.stretch, unit: "mm", label: t(`${S}.n.stretch`, params) },
      { value: String(m.points.length), unit: "", label: t(`${S}.n.count`) },
    ],
    parts: (["P1", "L", "P2"] as const).map((letter) => ({
      n: t(`experiments.converging-lens-pins.report.letter.${letter}`),
      name: t(`experiments.converging-lens-pins.report.legend.${letter}`),
      say: msg(`${S}.part.${letter}`, params),
    })),
    spec: (["lens", "distances", "rule", "look", "result"] as const).map((k): [string, string] => [
      msg(`${S}.spec.${k}`),
      msg(`${S}.spec.${k}Value`, params),
    ]),
    steps: PINS_STEPS.map((s) => ({
      title: msg(`${S}.step.${s.id}.title`, params),
      text: msg(`${S}.step.${s.id}.text`, params),
    })),
    why: { title: t(`${S}.why.title`), text: msg(`${S}.why.text`, params) },
    motto: t(`${S}.motto`),
    model: m,
  };
}
