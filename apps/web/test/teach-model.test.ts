import { describe, expect, test } from "bun:test";

import type { BenchOut, LiveSnapshot } from "@pa/api-client";
import { benchPeriod, simplePendulum } from "@pa/experiments";
import { DEFAULT_ENVIRONMENT } from "@pa/instruments";

import {
  EXAMPLE_MINUTES_IN,
  exampleHint,
  exampleReadings,
  exampleSnapshot,
} from "../src/app/teach/example";
import { applyFrame, board, clock, mistakeName, shown } from "../src/app/teach/model";

const NOW = Date.UTC(2026, 10, 18, 10, 0, 0);
const ONE = {
  rule: "pendulum-count-from-one",
  key: "findings.pendulum.countFromOne",
  skill: "measurement" as const,
};

function bench(name: string, changes: Partial<BenchOut> = {}): BenchOut {
  return {
    member_id: name,
    display_name: name,
    attempt_id: "a-1",
    step: "measure",
    completed: ["question", "predict", "build", "check"],
    mistakes: [],
    readings: 0,
    joined_at: new Date(NOW - 20 * 60_000).toISOString(),
    updated_at: new Date(NOW).toISOString(),
    last_seen_at: new Date(NOW).toISOString(),
    measured_at: null,
    here: true,
    ...changes,
  };
}

function snapshot(benches: BenchOut[], minutesIn = 10): LiveSnapshot {
  return {
    session: {
      id: "s",
      class_id: "c",
      experiment_id: "simple-pendulum",
      lesson_minutes: 40,
      steps_locked: false,
      started_at: new Date(NOW - minutesIn * 60_000).toISOString(),
      ended_at: null,
    },
    members: benches.length,
    benches,
    messages: [],
    server_time: new Date(NOW).toISOString(),
  };
}

describe("the live board", () => {
  test("puts benches that need help first and counts them", () => {
    const s = snapshot([bench("Ama"), bench("Kofi", { mistakes: [ONE] }), bench("Esi")]);
    const b = board(s, NOW);
    expect(b.benches.map((c) => c.name)).toEqual(["Kofi", "Ama", "Esi"]);
    expect(b.helpCount).toBe(1);
    expect(b.benches[0]!.status).toBe("Counts from one");
    expect(b.benches[1]!.status).toBe("On track");
    expect(shown(b.benches, "help").map((c) => c.name)).toEqual(["Kofi"]);
    expect(shown(b.benches, "on-track").map((c) => c.name)).toEqual(["Ama", "Esi"]);
  });

  test("a hint pushed to a bench takes it off the help list", () => {
    const s = snapshot([bench("Kofi", { mistakes: [ONE] }), bench("Ama", { mistakes: [ONE] })]);
    const hinted = { ...s, messages: [exampleHint(1, ONE.rule, ONE.key, ["Kofi"], NOW)] };
    const b = board(hinted, NOW);
    expect(b.helpCount).toBe(1); // Ama made the mistake after the hint went out
    expect(b.benches.find((c) => c.name === "Kofi")!.status).toBe("Hint sent");
    // So the row offers the hint again, for Ama alone.
    expect(b.mistakes[0]!.sent).toBeNull();
    expect(b.mistakes[0]!.chip).toBe("1 student");

    const again = {
      ...hinted,
      messages: [...hinted.messages, exampleHint(2, ONE.rule, ONE.key, ["Ama"], NOW)],
    };
    const after = board(again, NOW);
    expect(after.helpCount).toBe(0);
    expect(after.mistakes[0]!.chip).toBe("Hint sent to 2");
    expect(after.mistakes[0]!.sent?.id).toBe(2);
  });

  test("an offline bench is not counted as here or as needing help", () => {
    const s = snapshot([bench("Kofi", { mistakes: [ONE], here: false }), bench("Ama")]);
    const b = board(s, NOW);
    expect([b.here, b.joined, b.offline, b.helpCount]).toEqual([1, 2, 1, 0]);
    expect(b.benches.find((c) => c.name === "Kofi")!.status).toBe("Offline");
    expect(b.mistakes).toEqual([]);
  });

  test("shows the lesson time left and how long it has been live", () => {
    const b = board(snapshot([bench("Ama")], 24), NOW);
    expect(b.minutesLive).toBe(24);
    expect(clock(b.secondsLeft)).toBe("16:00");
    expect(board(snapshot([bench("Ama")], 2), NOW).paceCaption).toBe("Too early to tell the pace.");
    expect(board(snapshot([bench("Ama")], 50), NOW).paceCaption).toBe("The lesson time is over.");
  });

  test("names mistakes in the teacher's words, worked out from the physics", () => {
    expect(mistakeName(ONE)).toBe("Counted the first pass as one");
    expect(mistakeName({ rule: "unknown-rule", key: "findings.pendulum.stoppedEarly" })).toBe(
      "You stopped at {count} of {target}",
    );
    // A rule and key the lab does not word are never shown as they came (finding H).
    expect(mistakeName({ rule: "call-me-on-0244", key: "made.up" })).toBe(
      "Another mistake the coach found",
    );
  });
});

describe("socket frames", () => {
  test("a bench replaces that student's card and keeps the list in name order", () => {
    const s = snapshot([bench("Kofi"), bench("Ama")]);
    const next = applyFrame(s, { type: "bench", bench: bench("Kofi", { step: "plot" }) });
    expect(next).not.toBe("resync");
    const benches = (next as LiveSnapshot).benches;
    expect(benches.map((b) => [b.display_name, b.step])).toEqual([
      ["Ama", "measure"],
      ["Kofi", "plot"],
    ]);
  });

  test("a message arriving twice is kept once, and undo marks it", () => {
    const hint = exampleHint(7, ONE.rule, ONE.key, ["Kofi"], NOW);
    let s = snapshot([bench("Kofi")]);
    s = applyFrame(s, { type: "message", message: hint }) as LiveSnapshot;
    s = applyFrame(s, { type: "message", message: hint }) as LiveSnapshot;
    expect(s.messages).toHaveLength(1);
    s = applyFrame(s, { type: "undone", id: 7 }, new Date(NOW)) as LiveSnapshot;
    expect(s.messages[0]!.undone_at).toBe(new Date(NOW).toISOString());
  });

  test("resync asks for the snapshot again", () => {
    expect(applyFrame(snapshot([]), { type: "resync" })).toBe("resync");
  });
});

describe("the example class", () => {
  test("is consistent: every number on the board follows from its benches", () => {
    const s = exampleSnapshot(NOW);
    const b = board(s, NOW);
    expect(b.minutesLive).toBe(EXAMPLE_MINUTES_IN);
    expect(b.joined).toBe(s.benches.length);
    expect(b.here + b.offline).toBe(b.joined);
    expect(b.helpCount).toBe(b.benches.filter((c) => c.help).length);
    expect(b.mistakes.map((m) => m.rule).sort()).toEqual([
      "pendulum-count-from-one",
      "pendulum-stopped-early",
      "pendulum-thread-on-clamp",
    ]);
  });

  test("its readings come from the physics", () => {
    const right = exampleReadings(null);
    const r = simplePendulum.stopwatch.resolution;
    for (const row of right) {
      const expected = Math.round((benchPeriod(DEFAULT_ENVIRONMENT.g, row.l) * 20) / r) * r;
      expect(row.t).toBeCloseTo(expected, 10);
      expect(row.T).toBeCloseTo(row.t / simplePendulum.swings, 10);
    }
    // Counting from one times one swing fewer, so every time is shorter.
    const one = exampleReadings("one");
    one.forEach((row, i) => expect(row.t).toBeLessThan(right[i]!.t));
    expect(exampleReadings("clamp")).toEqual([]);
  });
});
