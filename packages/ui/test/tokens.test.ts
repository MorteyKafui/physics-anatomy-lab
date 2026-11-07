import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { colour, figureTone, figureTonePaper, graphPalette, topicHue } from "../src/tokens";

const file = readFileSync(join(import.meta.dir, "../src/tokens.css"), "utf8");
const block = (selector: string) => {
  const start = file.indexOf(`${selector} {`);
  return file.slice(start, file.indexOf("}", start));
};
const read = (css: string) =>
  Object.fromEntries(
    [...css.matchAll(/(--pa-[a-z0-9-]+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => [
      m[1]!,
      m[2]!.toUpperCase(),
    ]),
  );
const declared = read(block(":root"));
const paper = read(block('[data-figure="paper"]'));

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

  test.each(Object.entries(graphPalette.mono))("graph, black and white, %s", (part, hex) => {
    expect(declared[kebab(`graphMono${part[0]!.toUpperCase()}${part.slice(1)}`)]).toBe(hex);
  });
});

describe("figure tones in tokens.css match tokens.ts", () => {
  test.each(Object.entries(figureTone))("%s", (name, hex) => {
    const variable = `--pa-figure-${name.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase()}`;
    expect(declared[variable]).toBe(hex);
  });
});

describe("figure tones on paper in tokens.css match tokens.ts", () => {
  test.each(Object.entries(figureTonePaper))("%s", (name, hex) => {
    const variable = `--pa-figure-${name.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase()}`;
    expect(paper[variable]).toBe(hex);
  });
});
