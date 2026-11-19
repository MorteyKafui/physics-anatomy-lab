/**
 * The logo set (Phase 5, item 1; brief in docs/content/logo-set-brief.md, board
 * design/mockups/LogoSet.dc.html). Every file is drawn from src/logo-paths.ts, never edited by
 * hand: `bun run brand` writes them, and test/brand.test.ts fails if a committed file differs.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { Resvg } from "@resvg/resvg-js";
import opentype from "opentype.js";

import { logo } from "../src/logo-paths";
import { colour } from "../src/tokens";

const ROOT = join(import.meta.dir, "../../..");
const FONT = join(import.meta.dir, "../brand/fonts/BricolageGrotesque-ExtraBold.ttf");

const NAME = "Physics Anatomy";
const WHITE = "#FFFFFF";

/** Letter and thread colour, and bob colour, for each version of the mark. */
const VERSIONS = {
  "": { ink: colour.onPaper, bob: logo.bobColour, ground: null },
  "-on-dark": { ink: colour.text, bob: logo.bobColour, ground: colour.ink950 },
  "-black": { ink: colour.onPaper, bob: colour.onPaper, ground: null },
  "-white": { ink: WHITE, bob: WHITE, ground: null },
} as const;

/** The mark's parts at its own 160-unit scale, in the given colours. */
function markParts(ink: string, bob: string) {
  const t = logo.thread;
  return [
    `<path d="${logo.letter}" fill="none" stroke="${ink}" stroke-width="18"/>`,
    `<line x1="${t.x1}" y1="${t.y1}" x2="${t.x2}" y2="${t.y2}" stroke="${ink}" stroke-width="5"/>`,
    `<circle cx="${logo.bob.cx}" cy="${logo.bob.cy}" r="${logo.bob.r}" fill="${bob}"/>`,
  ].join("");
}

const svg = (width: number, height: number, body: string, viewBox = `0 0 ${width} ${height}`) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${viewBox}" role="img" aria-label="${NAME}"><title>${NAME}</title>${body}</svg>\n`;

/** SVG path data with two decimals (opentype.js's own toPathData writes NaN for some values). */
function pathData(path: opentype.Path) {
  const n = (v: number) => {
    if (!Number.isFinite(v)) throw new Error(`Bad outline coordinate: ${v}`);
    return String(Math.round(v * 100) / 100);
  };
  return path.commands
    .map((c) => {
      if (c.type === "M" || c.type === "L") return `${c.type}${n(c.x)} ${n(c.y)}`;
      if (c.type === "Q") return `Q${n(c.x1)} ${n(c.y1)} ${n(c.x)} ${n(c.y)}`;
      if (c.type === "C") return `C${n(c.x1)} ${n(c.y1)} ${n(c.x2)} ${n(c.y2)} ${n(c.x)} ${n(c.y)}`;
      return "Z";
    })
    .join("");
}

/** The mark alone, 160 × 160. */
function mark(version: keyof typeof VERSIONS) {
  const { ink, bob, ground } = VERSIONS[version];
  const bg = ground ? `<rect width="160" height="160" fill="${ground}"/>` : "";
  return svg(160, 160, bg + markParts(ink, bob));
}

/**
 * The mark and the name side by side, as on the board: a 48-unit mark, a 14-unit gap and the
 * name at 32 units in Bricolage Grotesque ExtraBold, drawn as outlines so it needs no font. The
 * name's capitals are centred on the mark.
 */
function lockup(version: keyof typeof VERSIONS) {
  const { ink, bob, ground } = VERSIONS[version];
  const data = readFileSync(FONT);
  const font = opentype.parse(
    data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength),
  );
  const size = 32;
  const scale = size / font.unitsPerEm;
  const capHeight = (font.tables.os2 as unknown as { sCapHeight: number }).sCapHeight * scale;
  const markSize = 48;
  const gap = 14;
  const pad = ground ? 18 : 0;
  const x = pad + markSize + gap;
  const baseline = pad + markSize / 2 + capHeight / 2;
  // Laid out glyph by glyph: kerning from the font, tracking -0.015 em as on the board.
  const glyphs = [...NAME].map((char) => font.charToGlyph(char));
  const text = new opentype.Path();
  let pen = x;
  glyphs.forEach((glyph, i) => {
    const char = NAME[i];
    if (char !== " ") text.extend(glyph.getPath(pen, baseline, size));
    const next = glyphs[i + 1];
    const kern = next ? font.getKerningValue(glyph, next) || 0 : 0;
    pen += ((glyph.advanceWidth || 0) + kern) * scale - 0.015 * size;
  });
  const box = text.getBoundingBox();
  const width = Math.ceil(box.x2 + pad);
  const height = markSize + 2 * pad;
  const bg = ground ? `<rect width="${width}" height="${height}" fill="${ground}"/>` : "";
  const m = `<g transform="translate(${pad} ${pad}) scale(${markSize / 160})">${markParts(ink, bob)}</g>`;
  const name = `<path d="${pathData(text)}" fill="${ink}"/>`;
  return svg(width, height, bg + m + name);
}

/**
 * The tab icon (decision 3): the P alone, thicker, on a square, as the approved logo board draws
 * it. The thread and bob are left out because they blur at 16 px. The P fills 22/32 of the
 * square, centred on the 160-unit box as on the board.
 */
export function tabIcon(ground: string, ink: string) {
  const s = 22 / 32;
  const offset = 80 * (1 - s);
  return svg(
    32,
    32,
    `<rect width="160" height="160" fill="${ground}"/>` +
      `<g transform="translate(${offset} ${offset}) scale(${s})"><path d="${logo.letter}" fill="none" stroke="${ink}" stroke-width="24"/></g>`,
    "0 0 160 160",
  );
}

/** A Windows icon file holding PNGs of the tab icon at 16, 32 and 48 px. */
function ico(source: string) {
  const sizes = [16, 32, 48];
  const pngs = sizes.map((px) =>
    new Resvg(source, { fitTo: { mode: "width", value: px } }).render().asPng(),
  );
  const header = Buffer.alloc(6 + 16 * sizes.length);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(sizes.length, 4);
  let offset = header.length;
  sizes.forEach((px, i) => {
    const at = 6 + 16 * i;
    header.writeUInt8(px, at);
    header.writeUInt8(px, at + 1);
    header.writeUInt16LE(1, at + 4);
    header.writeUInt16LE(32, at + 6);
    header.writeUInt32LE(pngs[i]!.length, at + 8);
    header.writeUInt32LE(offset, at + 12);
    offset += pngs[i]!.length;
  });
  return new Uint8Array(Buffer.concat([header, ...pngs]));
}

/** Every generated file, by its path from the repository root. */
export function brandFiles(): Record<string, string | Uint8Array> {
  const site = tabIcon(logo.bobColour, colour.onPaper);
  const admin = tabIcon(colour.ink950, colour.text);
  return {
    "packages/ui/brand/mark.svg": mark(""),
    "packages/ui/brand/mark-on-dark.svg": mark("-on-dark"),
    "packages/ui/brand/mark-black.svg": mark("-black"),
    "packages/ui/brand/mark-white.svg": mark("-white"),
    "packages/ui/brand/lockup.svg": lockup(""),
    "packages/ui/brand/lockup-on-dark.svg": lockup("-on-dark"),
    "packages/ui/brand/lockup-black.svg": lockup("-black"),
    "apps/web/src/app/icon.svg": site,
    "apps/web/src/app/favicon.ico": ico(site),
    "apps/admin/src/app/icon.svg": admin,
    "apps/admin/src/app/favicon.ico": ico(admin),
  };
}

if (import.meta.main) {
  for (const [path, content] of Object.entries(brandFiles())) {
    writeFileSync(join(ROOT, path), content);
    process.stdout.write(`wrote ${path}
`);
  }
}
