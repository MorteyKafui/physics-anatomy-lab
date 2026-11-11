import fontkit from "@pdf-lib/fontkit";
import { t } from "@pa/i18n";
import { colour } from "@pa/ui";
import { PDFDocument, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";

import { PAPER, wrap, type Fonts, type Paper } from "../report/pdf";
import type { SheetContent, SheetKind } from "./content";

/**
 * The print sheets as PDFs, laid out as the Anatomy print pipeline lays them out (D7): the poster
 * (one page: the name set large, the question, big numbers, the pinned figure, every part with a
 * line), the explained drawing (one page: parts list, specification and a strip of steps with the
 * parts at work lit) and the explainer (two pages: the overview, then how it works step by step).
 * Real text in the embedded Noto Sans; hairline rules and black pins print well in black and white.
 */

export interface Picture {
  png: Uint8Array;
  width: number;
  height: number;
}

export interface SheetImages {
  /** The bench with numbered pins. */
  main: Picture;
  /** One still per step, the plot last. */
  steps: Picture[];
}

const hex = (h: string) => {
  const n = Number.parseInt(h.slice(1), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};
const INK = hex(colour.onPaper);
const MUTED = hex(colour.onPaperMuted);
const RULE = hex(colour.paperLine);
const M = 48;

interface Ctx {
  page: PDFPage;
  W: number;
  H: number;
  regular: PDFFont;
  bold: PDFFont;
}

/** Text from the top: `y` is the distance from the top of the page to the first line's top. */
function text(
  c: Ctx,
  s: string,
  x: number,
  y: number,
  o: {
    size?: number;
    bold?: boolean;
    color?: ReturnType<typeof rgb>;
    width?: number;
    lead?: number;
    align?: "left" | "right" | "center";
  } = {},
) {
  const size = o.size ?? 9;
  const font = o.bold ? c.bold : c.regular;
  const lead = o.lead ?? size * 1.32;
  const lines = o.width ? wrap(s, font, size, o.width) : [s];
  lines.forEach((line, i) => {
    const w = font.widthOfTextAtSize(line, size);
    const dx = o.align === "right" ? -w : o.align === "center" ? -w / 2 : 0;
    c.page.drawText(line, {
      x: x + dx,
      y: c.H - y - size - i * lead,
      size,
      font,
      color: o.color ?? INK,
    });
  });
  return y + lines.length * lead;
}

const rule = (c: Ctx, y: number, x0 = M, x1 = c.W - M, thick = 0.5, color = INK) =>
  c.page.drawLine({
    start: { x: x0, y: c.H - y },
    end: { x: x1, y: c.H - y },
    thickness: thick,
    color,
  });

/** Draw a picture inside a box, as large as fits, centred. */
function picture(c: Ctx, img: PDFImage, p: Picture, x: number, y: number, w: number, h: number) {
  const k = Math.min(w / p.width, h / p.height);
  const dw = p.width * k;
  const dh = p.height * k;
  c.page.drawImage(img, { x: x + (w - dw) / 2, y: c.H - y - (h + dh) / 2, width: dw, height: dh });
}

function footer(c: Ctx, middle: string, right: string) {
  const y = c.H - M + 14;
  text(c, "Physics Anatomy", M, y, { size: 7, color: MUTED });
  text(c, middle, c.W / 2, y, { size: 7, color: MUTED, align: "center" });
  text(c, right, c.W - M, y, { size: 7, color: MUTED, align: "right" });
}

/** Page one of the poster and the explainer: the name, the question, numbers, figure, parts. */
function overview(c: Ctx, s: SheetContent, main: PDFImage, mainPic: Picture, label: string) {
  text(c, s.name, M, M - 6, { size: 40, bold: true });
  let my = M;
  for (const line of [s.number, label, s.style])
    my = text(c, line, c.W - M, my, { size: 7.5, color: MUTED, align: "right" });

  // Left column: the question, the lead and the big numbers.
  const colW = 160;
  let y = text(c, s.question, M, M + 66, { size: 13, bold: true, width: colW, lead: 16 }) + 6;
  y = text(c, s.lead, M, y, { size: 8.5, color: MUTED, width: colW, lead: 12 }) + 14;
  for (const n of s.numbers) {
    rule(c, y, M, M + colW, 0.5, RULE);
    const vw = c.bold.widthOfTextAtSize(n.value, 21);
    text(c, n.value, M, y + 8, { size: 21, bold: true });
    if (n.unit) text(c, n.unit, M + vw + 3, y + 17, { size: 8.5 });
    y = text(c, n.label, M, y + 34, { size: 7, color: MUTED, width: colW }) + 8;
  }

  // The figure, pinned.
  const fx = M + colW + 24;
  picture(c, main, mainPic, fx, M + 60, c.W - M - fx, c.H * 0.58);

  // Every part, with one line.
  const top = M + 60 + c.H * 0.58 + 16;
  rule(c, top, M, c.W - M, 0.8);
  const cols = 3;
  const cw = (c.W - 2 * M - (cols - 1) * 16) / cols;
  const per = Math.ceil(s.parts.length / cols);
  s.parts.forEach((p, i) => {
    const col = Math.floor(i / per);
    const x = M + col * (cw + 16);
    const row = i % per;
    const y0 = top + 12 + row * 46;
    text(c, p.n, x, y0 + 1, { size: 7, color: MUTED });
    const after = text(c, p.name, x + 16, y0, { size: 8.5, bold: true, width: cw - 16 });
    text(c, p.say, x + 16, after, { size: 7.3, color: MUTED, width: cw - 16, lead: 9.4 });
  });
}

/** The specification as a two-column table of rows. */
function spec(c: Ctx, s: SheetContent, x: number, y: number, w: number) {
  let yy = text(c, t("sheet.spec"), x, y, { size: 7.5, color: MUTED }) + 8;
  for (const [label, value] of s.spec) {
    text(c, label, x, yy, { size: 8.2, color: MUTED });
    yy = Math.max(yy + 14, text(c, value, x + 72, yy, { size: 8.2, width: w - 72 }) + 4);
  }
  return yy;
}

export async function sheetPdf(
  kind: SheetKind,
  s: SheetContent,
  images: SheetImages,
  fonts: Fonts,
  paper: Paper,
): Promise<{ bytes: Uint8Array; pages: number }> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const regular = await doc.embedFont(fonts.regular, { subset: true });
  const bold = await doc.embedFont(fonts.bold, { subset: true });
  const name = t(`sheets.format.${kind}` as "sheets.format.poster");
  doc.setTitle(`${s.name}: ${name}`);
  doc.setCreator("Physics Anatomy");
  doc.setProducer("Physics Anatomy");
  doc.setLanguage("en-GB");
  const { width: W, height: H } = PAPER[paper];
  const paperName = t(`report.paper.${paper}` as "report.paper.a4");
  const newPage = (): Ctx => ({ page: doc.addPage([W, H]), W, H, regular, bold });
  const main = await doc.embedPng(images.main.png);
  const steps = await Promise.all(images.steps.map((p) => doc.embedPng(p.png)));

  if (kind === "poster") {
    const c = newPage();
    overview(c, s, main, images.main, s.kicker);
    footer(c, s.motto, paperName);
  }

  if (kind === "drawing") {
    const c = newPage();
    text(c, t("sheet.drawingKicker"), M, M - 8, { size: 7, color: MUTED });
    text(c, t("sheet.drawingLabel"), W - M, M - 8, { size: 7, color: MUTED, align: "right" });
    text(c, s.drawingTitle, M, M + 6, { size: 17, bold: true, width: W - 2 * M - 90 });
    text(c, s.number, W - M, M + 6, { size: 17, bold: true, align: "right" });
    rule(c, M + 40, M, W - M, 0.9);
    const figW = (W - 2 * M) * 0.58;
    picture(c, main, images.main, M, M + 56, figW, H * 0.5);
    const rx = M + figW + 24;
    let y = text(c, t("sheet.parts"), rx, M + 64, { size: 7.5, color: MUTED }) + 8;
    for (const p of s.parts) {
      text(c, p.n, rx, y + 1, { size: 7, color: MUTED });
      y = text(c, p.name, rx + 18, y, { size: 8.5, width: W - M - rx - 18 }) + 5;
    }
    spec(c, s, rx, y + 18, W - M - rx);
    // The strip of steps, the parts at work lit.
    const top = M + 56 + H * 0.5 + 20;
    rule(c, top, M, W - M, 0.9);
    const gap = 10;
    const cw = (W - 2 * M - (steps.length - 1) * gap) / steps.length;
    steps.forEach((img, i) => {
      const x = M + i * (cw + gap);
      picture(c, img, images.steps[i]!, x, top + 12, cw, cw * 1.05);
      text(c, String(i + 1).padStart(2, "0"), x, top + 20 + cw * 1.05, { size: 7, color: MUTED });
      text(c, s.steps[i]!.title, x, top + 31 + cw * 1.05, { size: 8, width: cw });
    });
    footer(c, t("sheet.notToScale"), t("sheet.pageOf", { paper: paperName, n: 1, total: 1 }));
  }

  if (kind === "explainer") {
    const one = newPage();
    overview(one, s, main, images.main, t("sheet.explainerLabel"));
    footer(one, s.motto, t("sheet.pageOf", { paper: paperName, n: 1, total: 2 }));

    const c = newPage();
    text(c, t("sheet.howItWorks"), M, M - 6, { size: 24, bold: true });
    rule(c, M + 30, M, W - M, 0.9);
    const gap = 18;
    const cw = (W - 2 * M - gap) / 2;
    const imgH = 128;
    const cellH = (H - 2 * M - 40 - 150) / 3;
    steps.forEach((img, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = M + col * (cw + gap);
      const y0 = M + 44 + row * cellH;
      picture(c, img, images.steps[i]!, x, y0, cw, imgH);
      text(c, String(i + 1).padStart(2, "0"), x, y0 + imgH + 8, { size: 7, color: MUTED });
      const after = text(c, s.steps[i]!.title, x + 16, y0 + imgH + 6, {
        size: 9.5,
        bold: true,
        width: cw - 16,
      });
      text(c, s.steps[i]!.text, x + 16, after + 2, {
        size: 8,
        color: MUTED,
        width: cw - 16,
        lead: 10.4,
      });
    });
    // The why takes the last slot.
    const wx = M + cw + gap;
    const wy = M + 44 + 2 * cellH;
    const after = text(c, s.why.title, wx, wy + 8, { size: 11, bold: true, width: cw });
    text(c, s.why.text, wx, after + 4, { size: 8.5, width: cw, lead: 11.5 });
    const sy = H - M - 140;
    rule(c, sy, M, W - M, 0.9);
    spec(c, s, M, sy + 12, (W - 2 * M) / 2);
    footer(c, s.motto, t("sheet.pageOf", { paper: paperName, n: 2, total: 2 }));
  }

  return { bytes: await doc.save({ useObjectStreams: false }), pages: doc.getPageCount() };
}
