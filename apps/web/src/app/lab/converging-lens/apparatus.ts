import { t } from "@pa/i18n";
import "@pa/i18n/converging-lens";
import { convergingLens } from "@pa/experiments";

const R = "experiments.converging-lens.report";
const E = convergingLens;
const cm = (m: number) => (m * 100).toFixed(1);

/**
 * The apparatus list, from the experiment's own constants: the report's Apparatus section and the
 * experiment's page (/experiments/converging-lens) both use it, so they never disagree.
 */
export function lensApparatus(): string[] {
  return [
    t(`${R}.apparatus.rayBox`),
    t(`${R}.apparatus.lens`, { d: cm(E.lens.aperture) }),
    t(`${R}.apparatus.screen`),
    t(`${R}.apparatus.bench`, { length: cm(E.benchLength) }),
  ];
}
