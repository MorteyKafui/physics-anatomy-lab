import { t } from "@pa/i18n";
import "@pa/i18n/method-of-mixtures";
import { hotSolid, methodOfMixtures, MIXTURES_THERMOMETER } from "@pa/experiments";
import { BALANCE } from "@pa/instruments";

const R = "experiments.method-of-mixtures-solid.report";
const H = hotSolid;

/**
 * The apparatus list, from the experiment's own constants: the report's Apparatus section and the
 * experiment's page (/experiments/method-of-mixtures-solid) both use it, so they never disagree.
 */
export function hotSolidApparatus(): string[] {
  return [
    t(`${R}.apparatus.solid`, { grams: H.solidMass }),
    t(`${R}.apparatus.balance`, { grams: BALANCE.resolution }),
    t(`${R}.apparatus.calorimeter`, {
      grams: (methodOfMixtures.calorimeter.mass * 1000).toFixed(0),
    }),
    t(`${R}.apparatus.thermometer`, { celsius: MIXTURES_THERMOMETER.resolution }),
    t(`${R}.apparatus.heater`),
  ];
}
