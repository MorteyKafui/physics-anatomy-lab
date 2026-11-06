import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { contrast, roleVariable, THEMES, themes, type ThemeRoles } from "../src/themes";

/**
 * WCAG 2.2: text needs 4.5:1 (AA). The projector theme aims for 7:1 (AAA), because projected
 * images lose contrast in a bright room. Focus rings and control borders need 3:1 (1.4.11).
 */
const TEXT_MIN = { lab: 4.5, bench: 4.5, site: 4.5, projector: 7 } as const;
const NON_TEXT_MIN = 3;

const TEXT_ROLES: (keyof ThemeRoles)[] = [
  "fg",
  "fgSoft",
  "fgMuted",
  "accentText",
  "ok",
  "warn",
  "danger",
];
const BACKGROUNDS: (keyof ThemeRoles)[] = ["bg", "surface", "raised", "accentWash", "warnWash"];

describe.each(THEMES)("%s theme", (name) => {
  const t = themes[name];
  const min = TEXT_MIN[name];

  for (const text of TEXT_ROLES) {
    for (const back of BACKGROUNDS) {
      test(`${text} on ${back} is at least ${min}:1`, () => {
        expect(contrast(t[text], t[back])).toBeGreaterThanOrEqual(min);
      });
    }
  }

  test(`text on the accent fill is at least ${min}:1`, () => {
    expect(contrast(t.onAccent, t.accent)).toBeGreaterThanOrEqual(min);
  });

  for (const part of ["ring", "control"] as const) {
    test(`${part} stands out from the background (${NON_TEXT_MIN}:1)`, () => {
      expect(contrast(t[part], t.bg)).toBeGreaterThanOrEqual(NON_TEXT_MIN);
    });
  }
});

describe("contrast", () => {
  test("matches the WCAG reference values", () => {
    expect(contrast("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
    expect(contrast("#FFFFFF", "#FFFFFF")).toBeCloseTo(1, 5);
    // #767676 on white is the well-known 4.54:1 grey.
    expect(contrast("#767676", "#FFFFFF")).toBeCloseTo(4.54, 2);
  });
});

describe("themes.css", () => {
  const css = readFileSync(join(import.meta.dir, "../src/themes.css"), "utf8");

  /** The declarations inside the block that starts with `selector {`. */
  function block(selector: string): Record<string, string> {
    const start = css.indexOf(`${selector} {`);
    if (start < 0) throw new Error(`themes.css has no "${selector}" block`);
    const body = css.slice(start, css.indexOf("}", start));
    return Object.fromEntries(
      [...body.matchAll(/(--pa-[a-z-]+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => [
        m[1]!,
        m[2]!.toUpperCase(),
      ]),
    );
  }

  test.each(THEMES)("the %s block matches themes.ts", (name) => {
    const declared = block(`[data-theme="${name}"]`);
    for (const [role, variable] of Object.entries(roleVariable)) {
      expect(declared[variable]).toBe(themes[name][role as keyof ThemeRoles]);
    }
  });

  test("the lab theme is also the default on :root", () => {
    const declared = block(":root");
    for (const [role, variable] of Object.entries(roleVariable)) {
      expect(declared[variable]).toBe(themes.lab[role as keyof ThemeRoles]);
    }
  });
});
