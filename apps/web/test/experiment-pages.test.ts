import { describe, expect, test } from "bun:test";

import {
  ASSEMBLY_RULES,
  benchPeriod,
  convergingLens,
  correctMixturesBench,
  correctSolidBench,
  lensWorld,
  methodOfMixtures,
  mixturesPeak,
  ohmsLawWorld,
  solidPeak,
  solidWorld,
  LENS_PROCEDURE_RULES,
  MIXTURES_PROCEDURE_RULES,
  PINS_PROCEDURE_RULES,
  PROCEDURE_RULES,
  SOLID_PROCEDURE_RULES,
  TIMING_RULES,
} from "@pa/experiments";

import { imageDistance } from "@pa/physics";

import { CARD_SEED } from "../src/app/_landing/cards-data";
import { CATALOGUE, entry } from "../src/app/experiments/catalogue";
import { citation, learningResource } from "../src/app/experiments/seo";
import { absolute } from "../src/app/site";

// docs/content/experiment-pages-brief.md.
const RULES: Record<string, readonly { id: string }[]> = {
  "simple-pendulum": [...TIMING_RULES, ...ASSEMBLY_RULES],
  "ohms-law": PROCEDURE_RULES,
  "converging-lens": LENS_PROCEDURE_RULES,
  "converging-lens-pins": PINS_PROCEDURE_RULES,
  "method-of-mixtures": MIXTURES_PROCEDURE_RULES,
  "method-of-mixtures-solid": SOLID_PROCEDURE_RULES,
};

describe("the experiment pages", () => {
  test("there is a page for every lab, and only for labs that exist", () => {
    expect(CATALOGUE.map((e) => e.id).sort()).toEqual(Object.keys(RULES).sort());
  });

  test.each(CATALOGUE.map((e) => [e.id, e] as const))(
    "%s names every check its coach runs, in words",
    (id, e) => {
      expect(e.rules).toEqual(RULES[id]!.map((r) => r.id));
      for (const phrase of e.catches) expect(phrase).not.toMatch(/^catalogue\.rule\./);
    },
  );

  test.each(CATALOGUE.map((e) => [e.id, e] as const))(
    "%s has every part of its page filled, with no blank placeholder",
    (_, e) => {
      const text = [e.title, e.aim, e.theory, e.teaches, ...e.apparatus, ...Object.values(e.model)];
      for (const s of text) {
        expect(s.length).toBeGreaterThan(2);
        expect(s).not.toMatch(/\{\w+\}|^(catalogue|experiments|report)\./);
      }
      expect(e.apparatus.length).toBeGreaterThan(2);
    },
  );

  test("each page's LearningResource has every field the brief lists (decision 5)", () => {
    for (const e of CATALOGUE) {
      const ld = learningResource(e);
      expect(ld).toMatchObject({
        "@type": "LearningResource",
        name: e.title,
        description: e.aim,
        learningResourceType: "Virtual laboratory",
        inLanguage: "en-GB",
        isAccessibleForFree: true,
        version: String(e.version),
        teaches: e.teaches,
      });
      expect(ld.url).toEndWith(`/experiments/${e.id}`);
      expect(ld.image).toEndWith(`/experiments/${e.id}/opengraph-image`);
    }
  });

  test("the citation names the experiment, its version and its address (decision 4)", () => {
    const e = CATALOGUE[0]!;
    expect(citation(e, 2026)).toBe(
      `Physics Anatomy (2026). ${e.title}, version ${e.version}. ${absolute(`/experiments/${e.id}`)}`,
    );
  });

  test("each practical's badge is the reading its lab's model gives (Practicals.dc.html)", () => {
    const value = (id: string) => Number(entry(id)!.card.badge.split(" ")[2]);
    const f = lensWorld(CARD_SEED).focalLength;
    expect(value("simple-pendulum")).toBeCloseTo(benchPeriod(9.81), 3);
    expect(value("ohms-law")).toBeCloseTo(ohmsLawWorld(CARD_SEED).emf, 2);
    expect(value("converging-lens")).toBeCloseTo(
      imageDistance(convergingLens.objectDistances[0]!, f) * 100,
      1,
    );
    expect(value("converging-lens-pins")).toBeCloseTo(f * 100, 1);
    expect(value("method-of-mixtures")).toBeCloseTo(
      mixturesPeak(correctMixturesBench(methodOfMixtures.volumes[0]!)).temperature,
      1,
    );
    expect(value("method-of-mixtures-solid")).toBeCloseTo(
      solidPeak(correctSolidBench(solidWorld(CARD_SEED))).temperature,
      1,
    );
    for (const e of CATALOGUE) expect(e.card.badge).not.toMatch(/\{|practicals\./);
  });
});
