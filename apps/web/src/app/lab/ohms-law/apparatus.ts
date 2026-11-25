import { t } from "@pa/i18n";
import "@pa/i18n/ohms-law";
import { ohmsLaw, type OhmsLawWorld } from "@pa/experiments";

const R = "experiments.ohms-law.report";
const E = ohmsLaw;

/**
 * The apparatus list, from the experiment's own constants: the report's Apparatus section and the
 * experiment's page (/experiments/ohms-law) both use it, so they never disagree.
 */
export function ohmsLawApparatus(
  world: Pick<OhmsLawWorld, "ammeter" | "voltmeter" | "wireLength">,
): string[] {
  return [
    t(`${R}.apparatus.cells`, { emf: (E.cell.emf / 2).toFixed(1) }),
    t(`${R}.apparatus.resistor`, { r: E.resistor.toFixed(1) }),
    t(`${R}.apparatus.ammeter`, { max: world.ammeter.scale?.[1] ?? 1 }),
    t(`${R}.apparatus.voltmeter`, { max: world.voltmeter.scale?.[1] ?? 3 }),
    t(`${R}.apparatus.wire`, { length: world.wireLength.toFixed(3) }),
    t(`${R}.apparatus.jockey`),
    t(`${R}.apparatus.key`),
    t(`${R}.apparatus.leads`),
  ];
}
