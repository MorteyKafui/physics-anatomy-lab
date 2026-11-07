import type { Projection } from "../events/replay";
import type { Json, LabEvent, NewEvent } from "../events/types";

/**
 * The lab report (master plan, "Lab report"): generated from the attempt in the WASSCE format or
 * the university's 15-section format, and the student edits every section. Only what the student
 * chose is stored: the format, and the text of each section they rewrote. A section they have
 * not touched keeps following the attempt, so its numbers stay right as the work changes.
 */

export const REPORT_FORMATS = ["wassce", "university"] as const;
export type ReportFormat = (typeof REPORT_FORMATS)[number];

/** Longest section a student can write: room for a full discussion, not a novel. */
export const MAX_SECTION = 4000;

export interface ReportState {
  format: ReportFormat;
  /** The student's own text for each section they rewrote, by section id. */
  texts: Readonly<Record<string, string>>;
}

export const EMPTY_REPORT: ReportState = { format: "wassce", texts: {} };

export type ReportCommand =
  | { type: "format"; format: ReportFormat }
  | { type: "edit"; section: string; text: string }
  | { type: "reset"; section: string };

export type ReportDecision = { ok: true; events: NewEvent[] } | { ok: false; reason: string };

const isSection = (v: unknown): v is string =>
  typeof v === "string" && /^[a-z][a-z-]{0,23}$/.test(v);

/** Turn a report action into events, or refuse it. Pure. */
export function decideReport(state: ReportState, c: ReportCommand): ReportDecision {
  switch (c.type) {
    case "format":
      if (!(REPORT_FORMATS as readonly string[]).includes(c.format))
        return { ok: false, reason: "format" };
      if (state.format === c.format) return { ok: false, reason: "unchanged" };
      return { ok: true, events: [{ kind: "report.format", data: { format: c.format } }] };
    case "edit":
      if (!isSection(c.section)) return { ok: false, reason: "section" };
      if (typeof c.text !== "string" || c.text.length > MAX_SECTION)
        return { ok: false, reason: "text" };
      if (state.texts[c.section] === c.text) return { ok: false, reason: "unchanged" };
      return {
        ok: true,
        events: [{ kind: "report.edit", data: { section: c.section, text: c.text } }],
      };
    case "reset":
      if (!isSection(c.section) || state.texts[c.section] === undefined)
        return { ok: false, reason: "reset" };
      return { ok: true, events: [{ kind: "report.reset", data: { section: c.section } }] };
  }
}

function commandOf(e: LabEvent): ReportCommand | undefined {
  const d = (e.data ?? {}) as Record<string, Json>;
  switch (e.kind) {
    case "report.format":
      return { type: "format", format: d.format as ReportFormat };
    case "report.edit":
      return typeof d.text === "string" && typeof d.section === "string"
        ? { type: "edit", section: d.section, text: d.text }
        : undefined;
    case "report.reset":
      return typeof d.section === "string" ? { type: "reset", section: d.section } : undefined;
    default:
      return undefined;
  }
}

export const reportProjection: Projection<ReportState> = {
  initial: () => EMPTY_REPORT,
  apply(state, e) {
    const c = commandOf(e);
    if (!c || !decideReport(state, c).ok) return state;
    switch (c.type) {
      case "format":
        return { ...state, format: c.format };
      case "edit":
        return { ...state, texts: { ...state.texts, [c.section]: c.text } };
      case "reset": {
        const texts = { ...state.texts };
        delete texts[c.section];
        return { ...state, texts };
      }
    }
  },
};
