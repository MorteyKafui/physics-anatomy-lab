/**
 * What-if scenarios for the simple pendulum (docs/content/ai-tutor-brief.md, decision 6).
 *
 * A scenario changes only what the pendulum's model supports, within the limits below, and the
 * prediction comes from packages/physics: the exact period, as the bench itself uses. Anything
 * else (a string that stretches, air resistance, a swing that is not in one plane) is not a
 * scenario: the model treats the string as light and inextensible and the bob as a point.
 *
 * These limits are physics content, approved by the physics reviewer.
 */
import type { LabEvent, NewEvent, Projection } from "@pa/engine";
import { periodExact, periodSmallAngle, placeById, type PlaceId } from "@pa/physics";

import limits from "./pendulum-scenario-limits.json" with { type: "json" };
import { CORRECT_ASSEMBLY, PENDULUM_PARTS } from "./pendulum-assembly";
import { simplePendulum } from "./simple-pendulum";

// The limits are in a JSON file so the API checks an AI-drafted scenario against the same ones
// (apps/api/app/ai/scenarios.py, whose test compares them). Why each limit is where it is:
// length, a short thread to the tallest stand; amplitude, beyond 60° a thread may go slack in
// practice; mass, any bob the lab has (it has no effect on the period, which is the point).
export const PENDULUM_LIMITS = {
  length: limits.length,
  amplitudeDeg: limits.amplitudeDeg,
  massG: limits.massG,
} as const;

/** Below this the small-angle formula is within 0.2 % of the exact period (the WASSCE limit). */
export const SMALL_ANGLE_DEG = 10;

export const PENDULUM_PLACES = limits.places as readonly PlaceId[];

export interface PendulumScenario {
  readonly length: number;
  readonly place: PlaceId;
  readonly amplitudeDeg: number;
  readonly massG: number;
}

/** The experiment as set: the bench's length and swing, on the Earth, with the lab's bob. */
export function asSet(length: number = simplePendulum.length): PendulumScenario {
  return { length, place: "earth", amplitudeDeg: simplePendulum.amplitudeDeg, massG: 50 };
}

const within = (x: unknown, { min, max }: { min: number; max: number }) =>
  typeof x === "number" && Number.isFinite(x) && x >= min && x <= max;

/** The scenario, if every change is one the model supports and inside its limits. */
export function checkScenario(value: unknown): PendulumScenario | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const v = value as Record<string, unknown>;
  if (Object.keys(v).some((k) => !["length", "place", "amplitudeDeg", "massG"].includes(k))) {
    return undefined;
  }
  if (!within(v.length, PENDULUM_LIMITS.length)) return undefined;
  if (!within(v.amplitudeDeg, PENDULUM_LIMITS.amplitudeDeg)) return undefined;
  if (!within(v.massG, PENDULUM_LIMITS.massG)) return undefined;
  if (typeof v.place !== "string" || !PENDULUM_PLACES.includes(v.place as PlaceId)) {
    return undefined;
  }
  return {
    length: v.length as number,
    place: v.place as PlaceId,
    amplitudeDeg: v.amplitudeDeg as number,
    massG: v.massG as number,
  };
}

/** The event a what-if attempt starts with: its scenario, which the bench then runs. */
export function scenarioEvent(s: PendulumScenario): NewEvent {
  return { kind: "scenario.set", data: { ...s } };
}

/** A what-if attempt's scenario, rebuilt from its events; undefined in any other attempt. */
export const scenarioProjection: Projection<PendulumScenario | undefined> = {
  initial: () => undefined,
  apply: (scenario, e: LabEvent) =>
    scenario ?? (e.kind === "scenario.set" ? checkScenario(e.data) : undefined),
};

/**
 * The events a what-if attempt opens with (docs/content/ai-tutor-brief.md, "Opening a what-if
 * scenario on the bench"): its scenario, the bench built the right way, and the steps before
 * Measure done, so the student starts by timing the scenario's pendulum.
 */
export function whatIfStart(s: PendulumScenario): NewEvent[] {
  const events: NewEvent[] = [
    scenarioEvent(s),
    ...PENDULUM_PARTS.map((part) => ({
      kind: "part.place",
      data: { part, slot: CORRECT_ASSEMBLY[part]! },
    })),
  ];
  for (const step of ["question", "predict", "build", "check"] as const) {
    if (step !== "question") events.push({ kind: "step.go-to", data: { step } });
    events.push({ kind: "step.complete", data: { step } });
  }
  events.push({ kind: "step.go-to", data: { step: "measure" } });
  return events;
}

export interface PendulumPrediction {
  /** The period the model predicts, s: the exact period. */
  readonly period: number;
  /** How much longer than 2π√(l/g) the exact period is, as a fraction. */
  readonly beyondSmallAngle: number;
  /** Whether the small-angle formula still holds (amplitude at or below 10°). */
  readonly smallAngle: boolean;
  readonly g: number;
}

export function predictPendulum(s: PendulumScenario): PendulumPrediction {
  const { g } = placeById(s.place);
  const p = { length: s.length, g, amplitude: (s.amplitudeDeg * Math.PI) / 180 };
  const period = periodExact(p);
  return {
    period,
    beyondSmallAngle: period / periodSmallAngle(p) - 1,
    smallAngle: s.amplitudeDeg <= SMALL_ANGLE_DEG,
    g,
  };
}
