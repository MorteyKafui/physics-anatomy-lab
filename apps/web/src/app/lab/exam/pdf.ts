import fontkit from "@pdf-lib/fontkit";
import type { MarkedSection } from "@pa/experiments";
import { t, type MessageKey } from "@pa/i18n";
import { colour } from "@pa/ui";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";

import { PAPER, wrap, type Fonts, type Paper } from "../report/pdf";

/** The marked script as a PDF: the mark, each section's criteria, and the follow-up questions. */

const hex = (h: string) => {
  const n = Number.parseInt(h.slice(1), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};
const INK = hex(colour.onPaper);
const MUTED = hex(colour.onPaperMuted);
const M = 56;

export interface ScriptPdf {
  title: string;
  date: string;
  got: number;
  of: number;
  timeUsed: string;
  sections: MarkedSection[];
  /** Each criterion's words, and why marks were lost, already in the student's language. */
  itemText: (id: string) => string;
  lostText: (m: MarkedSection["items"][number]) => string | undefined;
  followUps: { q: string; a: string }[];
}

export async function scriptPdf(s: ScriptPdf, fonts: Fonts, paper: Paper) {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const regular = await doc.embedFont(fonts.regular, { subset: true });
  const bold = await doc.embedFont(fonts.bold, { subset: true });
  doc.setTitle(s.title);
  doc.setCreator("Physics Anatomy");
  doc.setProducer("Physics Anatomy");
  doc.setLanguage("en-GB");
  const { width: W, height: H } = PAPER[paper];
  let page: PDFPage = doc.addPage([W, H]);
  let y = M;
  const need = (h: number) => {
    if (y + h > H - M - 20) {
      page = doc.addPage([W, H]);
      y = M;
    }
  };
  const text = (
    str: string,
    o: {
      size?: number;
      font?: PDFFont;
      color?: ReturnType<typeof rgb>;
      x?: number;
      width?: number;
      right?: boolean;
    } = {},
  ) => {
    const size = o.size ?? 10;
    const font = o.font ?? regular;
    const x = o.x ?? M;
    const lines = wrap(str, font, size, o.width ?? W - M - x);
    for (const line of lines) {
      need(size * 1.4);
      const dx = o.right ? -font.widthOfTextAtSize(line, size) : 0;
      page.drawText(line, { x: x + dx, y: H - y - size, size, font, color: o.color ?? INK });
      y += size * 1.4;
    }
  };

  text(s.title, { size: 16, font: bold });
  text(s.date, { size: 9, color: MUTED });
  y += 6;
  text(`${t("exam.mark")}: ${s.got} / ${s.of}`, { size: 20, font: bold });
  text(`${t("exam.timeUsed")}: ${s.timeUsed}`, { size: 9.5, color: MUTED });
  text(t("exam.markedBy"), { size: 9, color: MUTED });
  y += 10;

  for (const sec of s.sections) {
    need(40);
    const top = y;
    text(t(`exam.section.${sec.id}` as MessageKey), { size: 12, font: bold });
    const score = `${sec.got} / ${sec.of}`;
    page.drawText(score, {
      x: W - M - bold.widthOfTextAtSize(score, 12),
      y: H - top - 12,
      size: 12,
      font: bold,
      color: INK,
    });
    page.drawLine({
      start: { x: M, y: H - y },
      end: { x: W - M, y: H - y },
      thickness: 0.5,
      color: INK,
    });
    y += 6;
    for (const item of sec.items) {
      // Marks as numbers: the embedded font has no tick or cross, and numbers photocopy well.
      const markText = `${item.got}/${item.of}`;
      const rowTop = y;
      text(s.itemText(item.id), { width: W - 2 * M - 40 });
      page.drawText(markText, {
        x: W - M - regular.widthOfTextAtSize(markText, 10),
        y: H - rowTop - 10,
        size: 10,
        font: regular,
        color: INK,
      });
      const lost = s.lostText(item);
      if (lost) text(lost, { size: 9, color: MUTED, x: M + 16, width: W - 2 * M - 56 });
    }
    y += 10;
  }

  need(40);
  text(t("exam.followUps"), { size: 12, font: bold });
  y += 4;
  for (const f of s.followUps) {
    text(f.q, { font: bold, size: 10 });
    text(f.a, { size: 9.5, color: MUTED });
    y += 6;
  }

  const total = doc.getPageCount();
  doc.getPages().forEach((p, i) => {
    const label = t("report.page", { n: i + 1, total });
    p.drawText(label, {
      x: (W - regular.widthOfTextAtSize(label, 8.5)) / 2,
      y: M / 2,
      size: 8.5,
      font: regular,
      color: MUTED,
    });
  });
  return { bytes: await doc.save({ useObjectStreams: false }), pages: total };
}
