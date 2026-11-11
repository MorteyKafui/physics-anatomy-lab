import { OHMS_LAW_SHEET_NUMBER, ohmsLawSheet, type OhmsLawSheet } from "@pa/experiments";
import { t, type MessageKey } from "@pa/i18n";
import "@pa/i18n/ohms-law";

import type { SheetContent } from "../../sheets/content";
import { CIRCUIT_STEPS } from "./figures";

/**
 * The words and numbers on the Ohm's law print sheets. The words are the lab's own
 * (packages/i18n); every number comes from ohmsLawSheet, worked out by the circuit solver.
 */

export interface OhmsLawSheetContent extends SheetContent {
  model: OhmsLawSheet;
}

const S = "experiments.ohms-law.sheet";
const msg = (key: string, params?: Record<string, string | number>) => t(key as MessageKey, params);
/** A number as a sheet prints it, with the minus sign. */
const num = (v: number, digits: number, how: "fixed" | "sf" = "fixed") =>
  (how === "fixed" ? v.toFixed(digits) : v.toPrecision(digits)).replace(/^-/, "−");

export function ohmsLawSheetContent(): OhmsLawSheetContent {
  const m = ohmsLawSheet();
  const cm = (pj: number) => (pj * 100).toFixed(0);
  const at = m.points.find((p) => p.pj === 0.6) ?? m.points[0]!;
  const params = {
    E: num(m.intercept, 2),
    r: num(m.r, 2),
    slope: num(m.slope, 3, "sf"),
    emf: num(m.emf, 1),
    cellEmf: num(m.emf / 2, 1),
    cellR: num(m.internalResistance, 1),
    R: num(m.resistor, 1),
    wireOhms: num(m.wireResistance, 1),
    length: num(m.wireLength, 3),
    amps: m.ammeter.resolution,
    ampsMax: m.ammeter.max,
    volts: m.voltmeter.resolution,
    voltsMax: m.voltmeter.max,
    first: cm(m.positions[0]!),
    last: cm(m.positions.at(-1)!),
    list: m.positions.map(cm).join(", "),
    count: m.positions.length,
    I0: num(m.noContact.y, 2),
    V0: num(m.noContact.x, 2),
    pj: cm(at.pj),
    I: num(at.y, 2),
    V: num(at.x, 2),
    lost: num(m.lostVolts, 2),
  };
  return {
    name: t("experiments.ohms-law.title"),
    drawingTitle: t(`${S}.drawingTitle`),
    number: OHMS_LAW_SHEET_NUMBER,
    kicker: t("sheet.kicker"),
    style: t(`${S}.style`),
    question: t(`${S}.question`),
    lead: t(`${S}.lead`),
    numbers: [
      { value: params.E, unit: "V", label: t(`${S}.n.E`) },
      { value: params.r, unit: "Ω", label: t(`${S}.n.r`) },
      { value: params.slope, unit: "A V⁻¹", label: t(`${S}.n.slope`) },
      { value: String(m.positions.length), unit: "", label: t(`${S}.n.positions`) },
      { value: params.lost, unit: "V", label: t(`${S}.n.lost`, params) },
    ],
    parts: (["E", "K", "R", "A", "V", "PQ", "J"] as const).map((letter) => ({
      n: letter,
      name: t(`experiments.ohms-law.report.legend.${letter}`),
      say: msg(`${S}.part.${letter}`, params),
    })),
    spec: (
      ["cells", "resistor", "wire", "ammeter", "voltmeter", "positions", "result"] as const
    ).map((k): [string, string] => [msg(`${S}.spec.${k}`), msg(`${S}.spec.${k}Value`, params)]),
    steps: CIRCUIT_STEPS.map((s) => ({
      title: msg(`${S}.step.${s.id}.title`, params),
      text: msg(`${S}.step.${s.id}.text`, params),
    })),
    why: { title: t(`${S}.why.title`), text: t(`${S}.why.text`) },
    motto: t(`${S}.motto`),
    model: m,
  };
}
