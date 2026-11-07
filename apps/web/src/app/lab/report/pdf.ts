import fontkit from "@pdf-lib/fontkit";
import { t } from "@pa/i18n";
import { colour, logo } from "@pa/ui";
import { PDFDocument, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";

import type { ReportContent, ReportSection } from "./content";

/**
 * The report as a PDF with real text, made in the browser (master plan, "Lab report": export
 * works offline). Text is set in Noto Sans, embedded, so units such as s⁻² and symbols such as π
 * print as written and the text can be searched and read aloud.
 */

export const PAPER = {
  a4: { width: 595.28, height: 841.89 },
  letter: { width: 612, height: 792 },
} as const;
export type Paper = keyof typeof PAPER;

export interface ReportImages {
  /** The set-up and the graph, drawn at print resolution, with their size in CSS px. */
  bench: { png: Uint8Array; width: number; height: number } | undefined;
  graph: { png: Uint8Array; width: number; height: number } | undefined;
}

export interface ReportOptions {
  paper: Paper;
  captions: boolean;
  mark: boolean;
  notes: boolean;
}

export interface Fonts {
  regular: Uint8Array;
  bold: Uint8Array;
}

const M = 56;
const BODY = 10.5;
const LEAD = 15;
const hex = (h: string) => {
  const n = Number.parseInt(h.slice(1), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};
const INK = hex(colour.onPaper);
const MUTED = hex(colour.onPaperMuted);
const RULE = hex(colour.paperLine);

/** Characters the embedded font lacks, written as it has them. A student may type anything. */
const FALLBACK: Record<string, string> = { "√": "sqrt", "≈": "~", "→": "->", "\t": "  " };

function writable(text: string, font: PDFFont): string {
  const has = new Set(font.getCharacterSet());
  return [...text].map((c) => (has.has(c.codePointAt(0)!) ? c : (FALLBACK[c] ?? "?"))).join("");
}

/** Split text into lines that fit a width at a size. */
export function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (line && font.widthOfTextAtSize(next, size) > width) {
        out.push(line);
        line = word;
      } else line = next;
    }
    out.push(line);
  }
  return out;
}

class Writer {
  pages: PDFPage[] = [];
  page!: PDFPage;
  y = 0;
  constructor(
    readonly doc: PDFDocument,
    readonly size: { width: number; height: number },
    readonly regular: PDFFont,
    readonly bold: PDFFont,
  ) {
    this.newPage();
  }
  get width() {
    return this.size.width - 2 * M;
  }
  newPage() {
    this.page = this.doc.addPage([this.size.width, this.size.height]);
    this.pages.push(this.page);
    this.y = this.size.height - M;
  }
  /** Room for `h` points, or a new page. */
  need(h: number) {
    if (this.y - h < M + 20) this.newPage();
  }
  text(
    s: string,
    opts: {
      size?: number;
      bold?: boolean;
      color?: ReturnType<typeof rgb>;
      x?: number;
      width?: number;
    } = {},
  ) {
    const size = opts.size ?? BODY;
    const font = opts.bold ? this.bold : this.regular;
    const x = opts.x ?? M;
    const lead = size * (LEAD / BODY);
    for (const line of wrap(writable(s, font), font, size, opts.width ?? this.width - (x - M))) {
      this.need(lead);
      this.page.drawText(line, { x, y: this.y - size, size, font, color: opts.color ?? INK });
      this.y -= lead;
    }
  }
  /** A section's text: a dash starts a list item. */
  body(s: string) {
    for (const raw of s.split("\n")) {
      const item = /^\s*[-•]\s+/.exec(raw);
      if (item) {
        const indent = M + 12;
        this.need(LEAD);
        this.page.drawText("•", {
          x: M + 2,
          y: this.y - BODY,
          size: BODY,
          font: this.regular,
          color: INK,
        });
        this.text(raw.slice(item[0].length), { x: indent });
      } else if (raw.trim() === "") this.y -= LEAD / 2;
      else this.text(raw);
    }
  }
  image(img: PDFImage, w: number, h: number, maxWidth: number) {
    const scale = Math.min(1, maxWidth / w);
    const dw = w * scale;
    const dh = h * scale;
    this.need(dh + 6);
    this.page.drawImage(img, {
      x: M + (this.width - dw) / 2,
      y: this.y - dh,
      width: dw,
      height: dh,
    });
    this.y -= dh + 6;
  }
  table(headings: string[], rows: string[][]) {
    if (!headings.length) return;
    const size = 9.5;
    const rowH = 18;
    const colW = this.width / headings.length;
    const drawRow = (cells: string[], bold: boolean) => {
      this.need(rowH);
      const top = this.y;
      cells.forEach((c, i) => {
        const font = bold ? this.bold : this.regular;
        const fit = wrap(writable(c, font), font, size, colW - 8)[0] ?? "";
        this.page.drawText(fit, { x: M + i * colW + 4, y: top - 12.5, size, font, color: INK });
      });
      this.page.drawLine({
        start: { x: M, y: top - rowH },
        end: { x: M + this.width, y: top - rowH },
        thickness: bold ? 0.9 : 0.4,
        color: bold ? INK : RULE,
      });
      this.y -= rowH;
    };
    this.page.drawLine({
      start: { x: M, y: this.y },
      end: { x: M + this.width, y: this.y },
      thickness: 0.9,
      color: INK,
    });
    drawRow(headings, true);
    for (const r of rows) drawRow(r, false);
    this.y -= 6;
  }
}

/** Draw the pendulum P mark at a point, `s` points tall. */
function drawMark(page: PDFPage, x: number, y: number, s: number) {
  const k = s / 160;
  page.drawSvgPath(logo.letter, { x, y: y + s, scale: k, borderColor: INK, borderWidth: 18 * k });
  page.drawCircle({
    x: x + logo.bob.cx * k,
    y: y + s - logo.bob.cy * k,
    size: logo.bob.r * k,
    color: hex(logo.bobColour),
  });
}

/** The report as PDF bytes, and how many pages it has. */
export async function reportPdf(
  content: ReportContent,
  images: ReportImages,
  fonts: Fonts,
  options: ReportOptions,
): Promise<{ bytes: Uint8Array; pages: number }> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const regular = await doc.embedFont(fonts.regular, { subset: true });
  const bold = await doc.embedFont(fonts.bold, { subset: true });
  doc.setTitle(content.title);
  doc.setCreator("Physics Anatomy");
  doc.setProducer("Physics Anatomy");
  doc.setLanguage("en-GB");
  const w = new Writer(doc, PAPER[options.paper], regular, bold);
  const embed = async (i: ReportImages["bench"]) =>
    i ? { img: await doc.embedPng(i.png), ...i } : undefined;
  const bench = await embed(images.bench);
  const graph = await embed(images.graph);

  // Header: title and date, and the mark.
  w.text(content.title, { size: 15, bold: true, width: w.width - 120 });
  w.text(content.date, { size: 9.5, color: MUTED });
  if (options.mark) {
    const top = w.size.height - M;
    drawMark(w.page, w.size.width - M - 92, top - 14, 13);
    w.page.drawText("Physics Anatomy", {
      x: w.size.width - M - 75,
      y: top - 11.5,
      size: 9.5,
      font: bold,
      color: INK,
    });
  }
  w.y -= 8;

  const section = (s: ReportSection) => {
    w.need(LEAD * 3);
    w.text(s.title, { size: 11.5, bold: true });
    const showText = !s.figure || options.captions;
    if (s.figure === "bench" && bench)
      w.image(bench.img, bench.width * 0.75, bench.height * 0.75, w.width * 0.6);
    if (s.figure === "graph" && graph)
      w.image(graph.img, graph.width * 0.75, graph.height * 0.75, w.width * 0.75);
    if (s.figure === "table") {
      if (showText && s.text) w.text(s.text, { size: 9.5, color: MUTED });
      w.table(content.table.headings, content.table.rows);
    } else if (s.text.trim() === "") w.text(t("report.toDo"), { color: MUTED });
    else if (showText) w.body(s.text);
    w.y -= 8;
  };
  for (const s of content.sections) {
    // The table section of the university format sits in Observations, under its text.
    if (s.figure === "table" && s.id === "observations") {
      w.need(LEAD * 3);
      w.text(s.title, { size: 11.5, bold: true });
      if (s.text.trim()) w.body(s.text);
      w.y -= 4;
      w.table(content.table.headings, content.table.rows);
      w.y -= 8;
    } else section(s);
  }
  if (options.notes && content.notes.length) {
    w.text(t("report.notes"), { size: 11.5, bold: true });
    for (const n of content.notes) w.text(n);
  }

  // Page numbers.
  const total = w.pages.length;
  w.pages.forEach((p, i) => {
    const label = writable(t("report.page", { n: i + 1, total }), regular);
    const lw = regular.widthOfTextAtSize(label, 8.5);
    p.drawText(label, {
      x: (w.size.width - lw) / 2,
      y: M / 2,
      size: 8.5,
      font: regular,
      color: MUTED,
    });
  });
  // Plain objects rather than object streams: older readers and printers open them too.
  return { bytes: await doc.save({ useObjectStreams: false }), pages: total };
}

/** The two fonts, from the app's own files (cached with the app for offline use). */
export async function loadFonts(): Promise<Fonts> {
  const get = async (name: string) =>
    new Uint8Array(await (await fetch(`/fonts/noto-sans/${name}`)).arrayBuffer());
  const [regular, bold] = await Promise.all([
    get("NotoSans-Regular.ttf"),
    get("NotoSans-Bold.ttf"),
  ]);
  return { regular, bold };
}
