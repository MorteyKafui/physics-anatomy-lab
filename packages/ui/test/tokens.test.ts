import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { colour, figureTone, graphPalette, topicHue } from "../src/tokens";

const css = readFileSync(join(import.meta.dir, "../src/tokens.css"), "utf8");
const declared = Object.fromEntries(
  [...css.matchAll(/(--pa-[a-z0-9-]+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => [
    m[1]!,
    m[2]!.toUpperCase(),
  ]),
);

/** inkWhatever → --pa-ink-whatever; textSoft → --pa-text-soft; ink950 → --pa-ink-950. */
const kebab = (name: string) =>
  `--pa-${name
    .replace(/([a-z])([A-Z0-9])/g, "$1-$2")
    .replace(/([0-9])([A-Z])/g, "$1-$2")
    .toLowerCase()}`;

describe("tokens.css matches tokens.ts", () => {
  test.each(Object.entries(colour))("%s", (name, hex) => {
    expect(declared[kebab(name)]).toBe(hex);
  });

  test.each(Object.entries(topicHue))("topic %s", (topic, hex) => {
    expect(declared[`--pa-topic-${topic}`]).toBe(hex);
  });

  test.each(Object.entries(graphPalette.colour))("graph %s", (part, hex) => {
    expect(declared[kebab(`graph${part[0]!.toUpperCase()}${part.slice(1)}`)]).toBe(hex);
  });
});

describe("figure tones in tokens.css match tokens.ts", () => {
  test.each(Object.entries(figureTone))("%s", (name, hex) => {
    const variable = `--pa-figure-${name.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase()}`;
    expect(declared[variable]).toBe(hex);
  });
});
