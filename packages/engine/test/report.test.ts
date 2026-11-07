import { describe, expect, test } from "bun:test";
import fc from "fast-check";

import {
  decideReport,
  EMPTY_REPORT,
  MAX_SECTION,
  replay,
  reportProjection,
  type Attempt,
  type LabEvent,
  type NewEvent,
  type ReportCommand,
  type ReportState,
} from "../src";

const attempt: Attempt = {
  id: "a",
  experimentId: "simple-pendulum",
  mode: "guided",
  seed: 1,
  createdAt: 0,
  updatedAt: 0,
  formatVersion: 1,
};
const asEvents = (news: NewEvent[]): LabEvent[] =>
  news.map((e, i) => ({ ...e, id: `e${i}`, attemptId: "a", seq: i + 1, device: "d", at: i }));

function run(commands: ReportCommand[]): ReportState {
  const news: NewEvent[] = [];
  let state = EMPTY_REPORT;
  for (const c of commands) {
    const d = decideReport(state, c);
    if (!d.ok) continue;
    news.push(...d.events);
    state = replay(reportProjection, attempt, asEvents(news));
  }
  return replay(reportProjection, attempt, asEvents(news));
}

describe("the report", () => {
  test("starts in the WASSCE format with every section following the attempt", () => {
    expect(replay(reportProjection, attempt, [])).toEqual({ format: "wassce", texts: {} });
  });

  test("keeps the format chosen and each section the student rewrote; reset gives it back", () => {
    const state = run([
      { type: "format", format: "university" },
      { type: "edit", section: "aim", text: "To find g." },
      { type: "edit", section: "discussion", text: "The line is straight." },
      { type: "reset", section: "aim" },
    ]);
    expect(state).toEqual({ format: "university", texts: { discussion: "The line is straight." } });
  });

  test("refuses what does not fit", () => {
    expect(decideReport(EMPTY_REPORT, { type: "format", format: "thesis" as never }).ok).toBe(
      false,
    );
    expect(decideReport(EMPTY_REPORT, { type: "format", format: "wassce" }).ok).toBe(false);
    expect(decideReport(EMPTY_REPORT, { type: "edit", section: "Aim!", text: "x" }).ok).toBe(false);
    expect(
      decideReport(EMPTY_REPORT, {
        type: "edit",
        section: "aim",
        text: "x".repeat(MAX_SECTION + 1),
      }).ok,
    ).toBe(false);
    expect(decideReport(EMPTY_REPORT, { type: "reset", section: "aim" }).ok).toBe(false);
  });

  test("a damaged event list never leaves the report outside its rules", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            kind: fc.constantFrom("report.format", "report.edit", "report.reset", "other"),
            data: fc.record({
              format: fc.oneof(fc.constantFrom("wassce", "university"), fc.string()),
              section: fc.oneof(fc.constantFrom("aim", "method"), fc.string()),
              text: fc.oneof(fc.string(), fc.string({ minLength: MAX_SECTION + 1 })),
            }),
          }),
        ),
        (raw) => {
          const state = replay(reportProjection, attempt, asEvents(raw as NewEvent[]));
          expect(["wassce", "university"]).toContain(state.format);
          for (const [section, text] of Object.entries(state.texts)) {
            expect(section).toMatch(/^[a-z][a-z-]{0,23}$/);
            expect(text.length).toBeLessThanOrEqual(MAX_SECTION);
          }
        },
      ),
      { numRuns: 200 },
    );
  });
});
