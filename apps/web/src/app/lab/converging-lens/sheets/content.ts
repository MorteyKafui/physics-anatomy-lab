import { LENS_SHEET_NUMBER, lensSheet, type LensSheet } from "@pa/experiments";
import { t, type MessageKey } from "@pa/i18n";
import "@pa/i18n/converging-lens";

import type { SheetContent } from "../../sheets/content";
import { LENS_STEPS } from "./figures";

/**
 * The words and numbers on the converging lens print sheets. The words are the lab's own
 * (packages/i18n); every number comes from lensSheet, worked out by the exact lens model.
 */

export interface LensSheetContent extends SheetContent {
  model: LensSheet;
}

const S = "experiments.converging-lens.sheet";
const msg = (key: string, params?: Record<string, string | number>) => t(key as MessageKey, params);
const cm = (m: number, digits = 1) => (m * 100).toFixed(digits);

export function lensSheetContent(): LensSheetContent {
  const m = lensSheet();
  const first = m.points[0]!;
  const params = {
    f: cm(m.focalLength),
    fGraph: cm(m.f, 2),
    // The intercepts in cm⁻¹, as the graph is headed.
    m1: (m.m1 / 100).toFixed(4),
    m2: (m.m2 / 100).toFixed(4),
    n: m.index.toFixed(2),
    d: cm(m.aperture),
    rule: cm(m.ruleResolution),
    u: cm(first.u),
    v: cm(first.v),
    thin: cm(first.thin),
    shift: cm(first.thin - first.v),
    range: cm(m.sharpRange),
    list: m.points.map((p) => cm(p.u)).join(", "),
    count: m.points.length,
    short: (100 * (1 - m.f / m.focalLength)).toFixed(1),
  };
  return {
    name: t("experiments.converging-lens.title"),
    drawingTitle: t(`${S}.drawingTitle`),
    number: LENS_SHEET_NUMBER,
    kicker: t("sheet.kicker"),
    style: t(`${S}.style`),
    question: t(`${S}.question`),
    lead: t(`${S}.lead`),
    numbers: [
      { value: params.fGraph, unit: "cm", label: t(`${S}.n.f`) },
      { value: params.m1, unit: "cm⁻¹", label: t(`${S}.n.m1`) },
      { value: params.m2, unit: "cm⁻¹", label: t(`${S}.n.m2`) },
      { value: params.v, unit: "cm", label: t(`${S}.n.v`, params) },
      { value: params.shift, unit: "cm", label: t(`${S}.n.shift`, params) },
    ],
    parts: (["R", "L", "S"] as const).map((letter) => ({
      n: letter,
      name: t(`experiments.converging-lens.report.legend.${letter}`),
      say: msg(`${S}.part.${letter}`, params),
    })),
    spec: (["lens", "distances", "rule", "sharp", "result"] as const).map((k): [string, string] => [
      msg(`${S}.spec.${k}`),
      msg(`${S}.spec.${k}Value`, params),
    ]),
    steps: LENS_STEPS.map((s) => ({
      title: msg(`${S}.step.${s.id}.title`, params),
      text: msg(`${S}.step.${s.id}.text`, params),
    })),
    why: { title: t(`${S}.why.title`), text: msg(`${S}.why.text`, params) },
    motto: t(`${S}.motto`),
    model: m,
  };
}
