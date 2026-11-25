import { t } from "@pa/i18n";
import "@pa/i18n/method-of-mixtures";
import { methodOfMixtures, MIXTURES_THERMOMETER } from "@pa/experiments";
import { MEASURING_CYLINDER } from "@pa/instruments";

const R = "experiments.method-of-mixtures.report";
const E = methodOfMixtures;

/**
 * The apparatus list, from the experiment's own constants: the report's Apparatus section and the
 * experiment's page (/experiments/method-of-mixtures) both use it, so they never disagree.
 */
export function mixturesApparatus(): string[] {
  return [
    t(`${R}.apparatus.calorimeter`, { g: (E.calorimeter.mass * 1000).toFixed(0) }),
    t(`${R}.apparatus.thermometer`, { celsius: MIXTURES_THERMOMETER.resolution }),
    t(`${R}.apparatus.cylinder`, {
      capacity: E.cylinderCapacity,
      cm3: MEASURING_CYLINDER.resolution,
    }),
    t(`${R}.apparatus.beaker`),
  ];
}
