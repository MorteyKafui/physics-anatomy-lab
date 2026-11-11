import { benchPeriod, bobAngle, simplePendulum } from "@pa/experiments";
import { DEFAULT_ENVIRONMENT } from "@pa/instruments";

/**
 * The swing both prototypes draw, from the physics packages (AGENTS.md rule 1): the bench
 * pendulum's exact period in the default room, and the bob's angle at a time.
 */
export const PERIOD = benchPeriod(DEFAULT_ENVIRONMENT.g, simplePendulum.length);

/** The bob's angle from the vertical at bench time t (s), degrees. */
export const swingDegrees = (t: number) => (bobAngle(t, PERIOD) * 180) / Math.PI;

/** Degrees the bench turns per pixel dragged, and per arrow-key press. */
export const TURN_PER_PX = 0.5;
export const TURN_PER_KEY = 5;

/** Whether the reader asked for less motion; the bob then rests and only the turn moves. */
export const prefersStill = () =>
  typeof window !== "undefined" &&
  !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
