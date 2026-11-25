import { t } from "@pa/i18n";
import "@pa/i18n/converging-lens";
import { convergingLens } from "@pa/experiments";

const R = "experiments.converging-lens-pins.report";
const cm = (m: number) => (m * 100).toFixed(1);

/**
 * The apparatus list, from the experiment's own constants: the report's Apparatus section and the
 * experiment's page (/experiments/converging-lens-pins) both use it, so they never disagree.
 */
export function pinsApparatus(): string[] {
  return [
    t(`${R}.apparatus.pins`),
    t(`${R}.apparatus.lens`, { d: cm(convergingLens.lens.aperture) }),
    t(`${R}.apparatus.bench`, { length: cm(convergingLens.benchLength) }),
  ];
}
