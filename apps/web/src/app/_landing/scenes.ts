import { slitsIntensity, whichSlitIntensity, type Slits } from "@pa/physics";
import type { MessageKey } from "@pa/i18n";
import type { Topic } from "@pa/ui";

/**
 * The hero's four scenes (landing page brief, decision 1): real slits lit at 500 nm, seen from
 * sin θ = −0.2 to 0.2 across the page. The stripes come from packages/physics, never from a
 * fitted curve. The same geometries are checked against SciPy in validation/fixtures/diffraction.json.
 */
const NM = 1e-9;
const UM = 1e-6;
const WAVELENGTH = 500 * NM;
const TWO: Slits = { count: 2, width: 2 * UM, spacing: 11.25 * UM, wavelength: WAVELENGTH };

/** The widest angle drawn, at the page's edges. */
export const SIN_THETA_EDGE = 0.2;

export interface Scene {
  id: "twoSlits" | "detector" | "oneSlit" | "fourSlits";
  /** The topic colour its particles land in. */
  topic: Topic;
  intensity: (sinTheta: number) => number;
}

export const SCENES: readonly Scene[] = [
  { id: "twoSlits", topic: "modern", intensity: (s) => slitsIntensity(TWO, s) },
  { id: "detector", topic: "mechanics", intensity: (s) => whichSlitIntensity(TWO, s) },
  {
    id: "oneSlit",
    topic: "waves",
    intensity: (s) =>
      slitsIntensity({ count: 1, width: 6.5 * UM, spacing: 6.5 * UM, wavelength: WAVELENGTH }, s),
  },
  {
    id: "fourSlits",
    topic: "light",
    intensity: (s) =>
      slitsIntensity({ count: 4, width: 2 * UM, spacing: 5.625 * UM, wavelength: WAVELENGTH }, s),
  },
];

export const sceneAria = (s: Scene) => `landing.scene.${s.id}.aria` as MessageKey;

/**
 * Where the next particle lands, from −1 (left edge) to 1 (right edge): drawn from the pattern by
 * rejection, so each place is hit in proportion to its intensity.
 */
export function landing(scene: Scene, random: () => number = Math.random): number {
  for (;;) {
    const u = random() * 2 - 1;
    if (random() <= scene.intensity(u * SIN_THETA_EDGE)) return u;
  }
}
