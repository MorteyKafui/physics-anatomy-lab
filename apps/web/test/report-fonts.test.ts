import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import fontkit from "@pdf-lib/fontkit";
import { enGB } from "@pa/i18n";

/**
 * The report's PDF is set in Noto Sans, embedded. Every string the report can print must have
 * its glyphs in that font, or it would print as boxes. (A student's own words are checked as
 * they are written: a character the font lacks is replaced, never dropped silently.)
 */

const font = (name: string) =>
  fontkit.create(
    readFileSync(new URL(`../public/fonts/noto-sans/${name}`, import.meta.url)),
  ) as unknown as { hasGlyphForCodePoint(c: number): boolean };

const printed = Object.entries(enGB).filter(
  ([key]) =>
    key.startsWith("report.") ||
    key.startsWith("experiments.simple-pendulum.tips.") ||
    key.startsWith("experiments.simple-pendulum.parts.") ||
    key.startsWith("lab.analyse.slope") ||
    key === "lab.analyse.gFormula" ||
    (key.startsWith("findings.") && key.endsWith(".title")),
);

describe("the report's fonts", () => {
  for (const name of ["NotoSans-Regular.ttf", "NotoSans-Bold.ttf"])
    test(`${name} has every character the report prints`, () => {
      const f = font(name);
      const missing = printed.flatMap(([key, text]) =>
        [...text.replace(/\{\w+\}/g, "")]
          .filter((c) => c !== "\n" && !f.hasGlyphForCodePoint(c.codePointAt(0)!))
          .map((c) => `${key}: ${c}`),
      );
      // Units and numbers the report fills in.
      for (const c of "0123456789.−+%²³⁻¹₁₂₃πθ°⁄·×")
        if (!f.hasGlyphForCodePoint(c.codePointAt(0)!)) missing.push(`units: ${c}`);
      expect(missing).toEqual([]);
    });
});
