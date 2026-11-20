import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { brandFiles } from "../scripts/brand";
import { logo } from "../src/logo-paths";

const ROOT = join(import.meta.dir, "../../..");
const files = brandFiles();
const svgs = Object.entries(files).filter(([path]) => path.endsWith(".svg")) as [string, string][];
const fills = (svg: string) =>
  [...svg.matchAll(/(?:fill|stroke)="(#[0-9A-F]{6})"/gi)].map((m) => m[1]);

describe("the logo set (logo set brief)", () => {
  test.each(Object.keys(files))("%s matches what `bun run brand` draws", (path) => {
    const committed = readFileSync(join(ROOT, path));
    const drawn = files[path]!;
    const expected = typeof drawn === "string" ? Buffer.from(drawn) : Buffer.from(drawn);
    expect(committed.equals(expected), `${path} differs: run bun run brand`).toBe(true);
  });

  test("in the colour versions the bob is the only red-orange part (D27)", () => {
    for (const name of ["mark", "mark-on-dark", "lockup", "lockup-on-dark"]) {
      const svg = files[`packages/ui/brand/${name}.svg`] as string;
      const bob = svg.match(/<circle[^>]*fill="(#[0-9A-F]{6})"/i)?.[1];
      expect(bob).toBe(logo.bobColour);
      expect(fills(svg).filter((c) => c === logo.bobColour)).toHaveLength(1);
    }
  });

  test("the black and white versions use one colour only", () => {
    for (const name of ["mark-black", "mark-white", "lockup-black"]) {
      expect(new Set(fills(files[`packages/ui/brand/${name}.svg`] as string)).size).toBe(1);
    }
  });

  test("the tab icons have no thread or bob, which blur at 16 px (decision 3)", () => {
    for (const app of ["web", "admin"]) {
      const svg = files[`apps/${app}/src/app/icon.svg`] as string;
      expect(svg).not.toContain("<circle");
      expect(svg).not.toContain("<line");
    }
  });

  test("the site's tab icon is red-orange and the admin portal's is ink", () => {
    expect(fills(files["apps/web/src/app/icon.svg"] as string)[0]).toBe(logo.bobColour);
    expect(fills(files["apps/admin/src/app/icon.svg"] as string)[0]).not.toBe(logo.bobColour);
  });

  test("the lockups' name is outlines, so it needs no font", () => {
    for (const [path, svg] of svgs) {
      expect(svg, path).not.toContain("<text");
      expect(svg, path).not.toContain("NaN");
      expect(svg, path).toContain("<title>Physics Anatomy</title>");
    }
  });

  test("favicon.ico holds the tab icon at 16, 32 and 48 px", () => {
    for (const app of ["web", "admin"]) {
      const ico = Buffer.from(files[`apps/${app}/src/app/favicon.ico`] as Uint8Array);
      expect(ico.readUInt16LE(2)).toBe(1);
      const count = ico.readUInt16LE(4);
      const sizes = Array.from({ length: count }, (_, i) => ico.readUInt8(6 + 16 * i));
      expect(sizes).toEqual([16, 32, 48]);
    }
  });
});
