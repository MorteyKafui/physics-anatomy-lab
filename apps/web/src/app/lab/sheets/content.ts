import {
  PENDULUM_PARTS,
  PENDULUM_SHEET_NUMBER,
  pendulumSheet,
  simplePendulum,
  type PendulumSheet,
} from "@pa/experiments";
import { t, type MessageKey } from "@pa/i18n";
import { ANTICIPATED_EVENT, DEFAULT_ENVIRONMENT } from "@pa/instruments";

import { SHEET_STEPS } from "./figures";

/**
 * The words and numbers on the simple pendulum's print sheets. The words are the lab's own
 * (packages/i18n), and every number comes from pendulumSheet, worked out from the physics.
 */

export const SHEET_KINDS = ["poster", "drawing", "explainer"] as const;
export type SheetKind = (typeof SHEET_KINDS)[number];

export interface SheetContent {
  name: string;
  number: string;
  kicker: string;
  style: string;
  question: string;
  lead: string;
  numbers: { value: string; unit: string; label: string }[];
  parts: { n: string; name: string; say: string }[];
  spec: [string, string][];
  steps: { title: string; text: string }[];
  why: { title: string; text: string };
  motto: string;
  model: PendulumSheet;
}

const P = "experiments.simple-pendulum";
const sf3 = (v: number) => v.toPrecision(3);

export function sheetContent(g = DEFAULT_ENVIRONMENT.g): SheetContent {
  const m = pendulumSheet(g);
  const length = m.length.toFixed(3);
  const timed = m.swings - 1;
  const percent = Math.round(m.countFromOne);
  const step = (id: string, params: Record<string, string | number> = {}) => ({
    title: t(`sheet.step.${id}.title` as MessageKey, params),
    text: t(`sheet.step.${id}.text` as MessageKey, params),
  });
  return {
    name: t(`${P}.title`),
    number: PENDULUM_SHEET_NUMBER,
    kicker: t("sheet.kicker"),
    style: t("sheet.style"),
    question: t("sheet.question"),
    lead: t("sheet.lead", { swings: m.swings }),
    numbers: [
      { value: sf3(m.period), unit: "s", label: t("sheet.n.period", { length }) },
      { value: String(m.swings), unit: "", label: t("sheet.n.swings") },
      { value: String(m.amplitudeDeg), unit: "°", label: t("sheet.n.angle") },
      { value: sf3(m.slope), unit: "s² m⁻¹", label: t("sheet.n.slope") },
      { value: String(percent), unit: "%", label: t("sheet.n.countFromOne") },
    ],
    parts: PENDULUM_PARTS.map((p, i) => ({
      n: String(i + 1).padStart(2, "0"),
      name: t(`${P}.parts.${p}.name` as MessageKey),
      say: t(`${P}.parts.${p}.what` as MessageKey, {
        leastCount: simplePendulum.stopwatch.resolution,
        reaction: ANTICIPATED_EVENT.meanDelay,
        swings: m.swings,
      }),
    })),
    spec: [
      [t("sheet.spec.length"), t("sheet.spec.lengthValue", { length })],
      [t("sheet.spec.swing"), t("sheet.spec.swingValue", { angle: m.amplitudeDeg })],
      [t("sheet.spec.stopwatch"), t("sheet.spec.stopwatchValue", { s: m.stopwatch })],
      [t("sheet.spec.rule"), t("sheet.spec.ruleValue", { cm: m.rule })],
      [t("sheet.spec.timing"), t("sheet.spec.timingValue", { swings: m.swings })],
      [t("sheet.spec.period"), t("sheet.spec.periodValue", { T: sf3(m.period), length })],
      [t("sheet.spec.g"), t("sheet.spec.gValue", { g: g.toFixed(2) })],
    ],
    steps: SHEET_STEPS.map((s) =>
      step(s.id, {
        angle: m.amplitudeDeg,
        swings: m.swings,
        timed,
        percent,
        slope: sf3(m.slope),
        g: sf3(m.gFromSlope),
      }),
    ),
    why: {
      title: t("sheet.why.title", { swings: m.swings }),
      text: t("sheet.why.text", {
        leastCount: m.stopwatch,
        reaction: ANTICIPATED_EVENT.meanDelay,
        swings: m.swings,
      }),
    },
    motto: t("sheet.motto"),
    model: m,
  };
}
