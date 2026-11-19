// What the tutor is sent (docs/content/ai-tutor-brief.md, decision 3; ADR 0043).
//
// Built on the device from the attempt's own events. Only the kinds listed here are sent, and
// from each only numbers, switches and short slugs: free text the student typed (report
// sections, captions, table notes) never leaves the device, and nothing names a person. Quantities
// are the numbers the student can already see; the accepted value is sent only once the lab has
// revealed it.
import type { AiContext, ThreadTurn } from "@pa/api-client";
import type { HelpLevel, LabEvent, Step } from "@pa/engine";

export const MAX_EVENTS = 40;
export const MAX_DETAIL = 12;
/** Six questions on a step: five earlier exchanges are sent with the sixth. */
export const QUESTIONS_PER_STEP = 6;

const SLUG = /^[a-z][a-z0-9.-]{1,63}$/;
const KEY = /^[a-z][a-z0-9_]{0,31}$/;
const STEP_NAMES: readonly string[] = [
  "question",
  "predict",
  "build",
  "check",
  "measure",
  "tabulate",
  "plot",
  "analyse",
  "conclude",
  "report",
];

/**
 * The event kinds the tutor may see, and which fields of their data. Anything not listed, and
 * any field not listed, stays on the device.
 */
const SHOWN: Readonly<Record<string, readonly string[]>> = {
  "step.go-to": ["step"],
  "step.complete": ["step"],
  // A reading's numbers are measurements: every number in it is sent (see READING), no text.
  "reading.record": [],
  "reading.delete": [],
  "part.place": ["part", "slot"],
  "part.remove": ["part"],
  // The benches' own actions (packages/experiments): positions, heights and switches.
  "pendulum.set-length": ["length"],
  "jockey.press": ["at"],
  "jockey.slide": ["to"],
  "jockey.lift": [],
  "key.close": [],
  "key.open": [],
  "lead.connect": ["from", "to"],
  "lead.disconnect": ["from", "to"],
  "holder.move": ["part", "to"],
  "pin.tip": ["pin", "to"],
  "eye.height": ["to"],
  "gauze.height": ["to"],
  "balance.weigh": ["what"],
  "calorimeter.fill": ["to"],
  "calorimeter.empty": [],
  "cylinder.fill": ["to"],
  "hot.pour": ["after"],
  "lid.set": ["on"],
  "solid.transfer": [],
  "stirrer.set": ["on"],
  "coach.hint": ["rule", "skill", "level"],
  "coach.note": ["rule", "skill", "level"],
  "coach.set-level": ["level"],
  "table.cell": ["column", "value"],
  "answer.write": ["id", "value"],
  "feedback.read": [],
  "accepted-value.reveal": [],
};

type Detail = boolean | number | string;

/** What the student typed into a cell or an answer: sent only when it is a plain number. */
const NUMBERS_ONLY: ReadonlySet<string> = new Set(["value"]);

/** A student-typed cell or answer counts only if it is a plain number. */
function asNumber(value: unknown): number | undefined {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value !== "string" || !/^\s*-?\d+(\.\d+)?\s*$/.test(value)) return undefined;
  return Number(value);
}

/** A reading keeps its numbers one level down, under data; only the numbers go. */
function readingOf(data: unknown): Record<string, Detail> {
  const inner =
    typeof data === "object" && data !== null && "data" in data
      ? (data as { data: unknown }).data
      : undefined;
  if (typeof inner !== "object" || inner === null) return {};
  const out: Record<string, Detail> = {};
  for (const [key, value] of Object.entries(inner)) {
    if (Object.keys(out).length >= MAX_DETAIL) break;
    if (KEY.test(key) && typeof value === "number" && Number.isFinite(value)) out[key] = value;
  }
  return out;
}

function detailOf(kind: string, data: unknown): Record<string, Detail> {
  if (kind === "reading.record") return readingOf(data);
  const fields = SHOWN[kind] ?? [];
  const source = data;
  if (typeof source !== "object" || source === null) return {};
  const out: Record<string, Detail> = {};
  for (const field of fields) {
    if (!KEY.test(field) || Object.keys(out).length >= MAX_DETAIL) continue;
    const value = (source as Record<string, unknown>)[field];
    if (typeof value === "boolean" && !NUMBERS_ONLY.has(field)) out[field] = value;
    else if (typeof value === "string" && SLUG.test(value) && !NUMBERS_ONLY.has(field))
      out[field] = value;
    else {
      const n = asNumber(value);
      if (n !== undefined) out[field] = n;
    }
  }
  return out;
}

export interface TutorEvent {
  readonly kind: string;
  readonly step: Step;
  readonly detail: Record<string, Detail>;
}

/** The latest events the tutor may see, each with the step it happened in. */
export function summariseEvents(events: readonly LabEvent[]): TutorEvent[] {
  let step: Step = "question";
  const out: TutorEvent[] = [];
  for (const e of events) {
    if (e.kind === "step.go-to") {
      const to = (e.data as { step?: unknown } | null)?.step;
      if (typeof to === "string" && STEP_NAMES.includes(to)) step = to as Step;
    }
    if (!(e.kind in SHOWN) || !SLUG.test(e.kind)) continue;
    out.push({ kind: e.kind, step, detail: detailOf(e.kind, e.data) });
  }
  return out.slice(-MAX_EVENTS);
}

export interface Quantity {
  readonly symbol: string;
  readonly name: string;
  readonly value: number;
  readonly unit: string;
}

export interface TutorInput {
  readonly experimentId: string;
  readonly experimentVersion: number;
  readonly step: Step;
  readonly helpLevel: HelpLevel;
  readonly events: readonly LabEvent[];
  /** Numbers the student can see now, from packages/physics. */
  readonly quantities: readonly Quantity[];
  readonly question: string;
  readonly thread: readonly ThreadTurn[];
}

export function tutorContext(input: TutorInput): AiContext {
  return {
    experiment_id: input.experimentId,
    experiment_version: input.experimentVersion,
    step: input.step,
    help_level: input.helpLevel,
    events: summariseEvents(input.events),
    quantities: input.quantities.map((q) => ({ ...q })),
    student_text: input.question.trim(),
    thread: input.thread.map((turn) => ({ ...turn })),
  };
}

/** Whether the lab has shown the accepted value, so the tutor may be told it. */
export const acceptedValueShown = (events: readonly LabEvent[]) =>
  events.some((e) => e.kind === "accepted-value.reveal");
