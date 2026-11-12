import { describe, expect, test } from "bun:test";

import { emphasis, enGB, hasMessage, t } from "../src";
import { enGBConvergingLens } from "../src/converging-lens";
import { enGBMethodOfMixtures } from "../src/method-of-mixtures";
import { enGBOhmsLaw } from "../src/ohms-law";

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
  const entries = [
    ...Object.entries(enGB),
    ...Object.entries(enGBOhmsLaw),
    ...Object.entries(enGBConvergingLens),
    ...Object.entries(enGBMethodOfMixtures),
  ];

  test("an experiment's own file repeats no shared key", () => {
    expect(Object.keys(enGBOhmsLaw).filter((k) => k in enGB)).toEqual([]);
    expect(Object.keys(enGBConvergingLens).filter((k) => k in enGB || k in enGBOhmsLaw)).toEqual(
      [],
    );
    expect(
      Object.keys(enGBMethodOfMixtures).filter(
        (k) => k in enGB || k in enGBOhmsLaw || k in enGBConvergingLens,
      ),
    ).toEqual([]);
  });

  test("an experiment's messages are found once its file is registered", () => {
    expect(hasMessage("experiments.ohms-law.title")).toBe(true);
  });

  test("are all non-empty and trimmed", () => {
    for (const [key, text] of entries)
      expect({ key, ok: text.length > 0 && text === text.trim() }).toEqual({ key, ok: true });
  });

  test("use sentence case, not capitalised words or all-caps labels (AGENTS.md rule 6)", () => {
    for (const [key, text] of entries) {
      // Exam boards' own names are written as they write them.
      const shouting = /\b[A-Z]{4,}\b/.test(text.replace(/\b(WASSCE|WAEC)\b/g, ""));
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
        for (const m of text.matchAll(/key: "((?:table|graph|analysis|findings)\.[\w.]+)"/g))
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

describe("every symbol card", () => {
  test("has its name, meaning, typical size and origin", () => {
    const missing = ["l", "T", "t", "g", "θ"].flatMap((s) =>
      ["name", "meaning", "typical", "origin"]
        .map((part) => `symbols.${s}.${part}`)
        .filter((key) => !hasMessage(key)),
    );
    expect(missing).toEqual([]);
  });
});
