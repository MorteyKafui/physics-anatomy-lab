// The example class (D29): what the live board looks like mid-lesson, shown only under a visible
// "Example class" label. The display names are the kind students pick; the mistakes are the coach's
// real pendulum rules; every reading comes from the physics (packages/experiments, benchPeriod).
import type { BenchOut, LiveMessageOut, LiveSnapshot, Mistake, StepName } from "@pa/api-client";
import { STEPS } from "@pa/engine";
import { benchPeriod, simplePendulum } from "@pa/experiments";
import { DEFAULT_ENVIRONMENT } from "@pa/instruments";
import { recordedPeriod } from "@pa/physics";

export const EXAMPLE_CLASS = {
  id: "example",
  name: "SHS 2 Science A",
  code: "7KQ-42M",
  experimentId: simplePendulum.id,
} as const;

const MISTAKES = {
  one: {
    rule: "pendulum-count-from-one",
    key: "findings.pendulum.countFromOne",
    skill: "measurement",
  },
  clamp: {
    rule: "pendulum-thread-on-clamp",
    key: "findings.pendulum.threadOnClamp",
    skill: "apparatus",
  },
  early: {
    rule: "pendulum-stopped-early",
    key: "findings.pendulum.stoppedEarly",
    skill: "measurement",
  },
} as const satisfies Record<string, Mistake>;
type Kind = keyof typeof MISTAKES;

// Name, step, mistake, whether here, and minutes into the lesson they finished measuring.
const BENCHES: readonly [string, StepName, Kind | null, boolean, number | null][] = [
  ["Kofi_A", "measure", "one", true, null],
  ["Ama.S", "measure", "one", true, null],
  ["Yaw7", "build", "clamp", true, null],
  ["Efua", "measure", "early", true, null],
  ["K.Boateng", "measure", "one", true, null],
  ["Adwoa_M", "build", "clamp", true, null],
  ["Nana", "tabulate", null, true, 14],
  ["Esi", "plot", null, true, 11],
  ["Kwame.O", "measure", null, true, null],
  ["Akosua", "tabulate", null, true, 17],
  ["Fiifi", "measure", null, true, null],
  ["Abena22", "plot", null, true, 12],
  ["Kojo", "measure", null, false, null],
  ["Afia", "tabulate", null, true, 19],
  ["Yaa.K", "check", null, false, null],
  ["Mawuli", "analyse", null, true, 9],
];

export const EXAMPLE_MINUTES_IN = 24;
export const EXAMPLE_LESSON_MINUTES = 40;

export function exampleSnapshot(now: number): LiveSnapshot {
  const iso = (minutesAgo: number) => new Date(now - minutesAgo * 60_000).toISOString();
  const start = EXAMPLE_MINUTES_IN;
  const benches: BenchOut[] = BENCHES.map(([name, step, kind, here, measuredAt], i) => {
    const at = STEPS.indexOf(step);
    return {
      member_id: `example-${String(i + 1)}`,
      display_name: name,
      attempt_id: `example-attempt-${String(i + 1)}`,
      step,
      completed: STEPS.slice(0, at),
      mistakes: kind ? [MISTAKES[kind]] : [],
      readings: at >= STEPS.indexOf("measure") ? exampleReadings(kind).length : 0,
      joined_at: iso(start - 1),
      updated_at: iso(1),
      last_seen_at: iso(here ? 0 : 5),
      measured_at: measuredAt === null ? null : iso(start - measuredAt),
      here,
    };
  });
  return {
    session: {
      id: "example-session",
      class_id: EXAMPLE_CLASS.id,
      experiment_id: EXAMPLE_CLASS.experimentId,
      lesson_minutes: EXAMPLE_LESSON_MINUTES,
      steps_locked: false,
      started_at: iso(start),
      ended_at: null,
    },
    members: benches.length,
    benches,
    messages: [],
    server_time: new Date(now).toISOString(),
  };
}

/** The lengths the example benches chose; the times follow from the physics. */
const LENGTHS = [1.0, 0.9, 0.8] as const;

export interface ReadingRow {
  readonly l: number;
  readonly t: number;
  readonly T: number;
  /** The reading carries the bench's mistake. */
  readonly off: boolean;
}

/** An example bench's readings: what its stopwatch would show, with its mistake in it. */
export function exampleReadings(kind: Kind | null): ReadingRow[] {
  if (kind === "clamp") return [];
  const swings = simplePendulum.swings;
  const r = simplePendulum.stopwatch.resolution;
  return LENGTHS.map((l) => {
    const truePeriod = benchPeriod(DEFAULT_ENVIRONMENT.g, l);
    // Counting from one times one swing fewer; stopping early stops a few swings short.
    const T = kind === "one" ? recordedPeriod(truePeriod, swings, 1) : truePeriod;
    const timed = kind === "early" ? swings - 3 : swings;
    const t = Math.round((T * timed) / r) * r;
    return { l, t, T: t / swings, off: kind !== null };
  });
}

export function exampleKind(bench: BenchOut): Kind | null {
  const rule = bench.mistakes[0]?.rule;
  const found = Object.entries(MISTAKES).find(([, m]) => m.rule === rule);
  return found ? (found[0] as Kind) : null;
}

/** A hint the example board "sends": stored only in the page. */
export function exampleHint(
  id: number,
  rule: string,
  ruleKey: string,
  to: string[],
  now: number,
): LiveMessageOut {
  return {
    id,
    kind: "hint",
    data: { rule, key: ruleKey },
    to_member_ids: to,
    created_at: new Date(now).toISOString(),
    undone_at: null,
  };
}
