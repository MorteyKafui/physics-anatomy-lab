import { describe, expect, test } from "bun:test";

import { emphasis, enGB, hasMessage, t } from "../src";

describe("t", () => {
  test("fills placeholders", () => {
    expect(t("lab.header.stepOf", { n: 5, total: 10, step: "Measure" })).toBe(
      "Step 5 of 10 · Measure",
    );
  });

  test("leaves a missing placeholder visible so the gap shows in testing", () => {
    expect(t("lab.header.stepOf", { n: 5 })).toBe("Step 5 of {total} · {step}");
  });

  test("knows which keys exist", () => {
    expect(hasMessage("lab.coach.showMe")).toBe(true);
    expect(hasMessage("lab.nothing.here")).toBe(false);
  });
});

describe("emphasis", () => {
  test("splits **strong** runs from plain ones", () => {
    expect(emphasis(t("experiments.simple-pendulum.measure.start"))).toEqual([
      { text: "Start the stopwatch as the bob passes the mark. Say ", strong: false },
      { text: "zero", strong: true },
      { text: ".", strong: false },
    ]);
  });
});

describe("the en-GB messages", () => {
  const entries = Object.entries(enGB);

  test("are all non-empty and trimmed", () => {
    for (const [key, text] of entries)
      expect({ key, ok: text.length > 0 && text === text.trim() }).toEqual({ key, ok: true });
  });

  test("use sentence case, not capitalised words or all-caps labels (AGENTS.md rule 6)", () => {
    for (const [key, text] of entries) {
      const shouting = /\b[A-Z]{4,}\b/.test(text);
      expect({ key, shouting }).toEqual({ key, shouting: false });
    }
  });

  test("use British spelling where the common words differ", () => {
    const american = /\b(color|center|toward|analyze|behavior|meter)\b/i;
    for (const [key, text] of entries)
      expect({ key, american: american.test(text) }).toEqual({ key, american: false });
  });
});

describe("every finding the rules can raise", () => {
  test("has a title and a detail to show", async () => {
    const { Glob } = await import("bun");
    const keys = new Set<string>();
    for (const dir of ["../analysis/src", "../experiments/src"]) {
      for await (const file of new Glob("**/*.ts").scan({ cwd: dir, absolute: true })) {
        const text = await Bun.file(file).text();
        for (const m of text.matchAll(/key: "((?:table|graph|findings)\.[\w.]+)"/g))
          keys.add(m[1]!);
      }
    }
    expect(keys.size).toBeGreaterThan(10);
    const missing = [...keys].flatMap((k) =>
      [`${k}.title`, `${k}.detail`].filter((m) => !hasMessage(m)),
    );
    expect(missing).toEqual([]);
  });
});
