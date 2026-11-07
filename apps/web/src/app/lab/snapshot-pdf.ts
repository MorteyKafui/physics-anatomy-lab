import { PDFDocument } from "pdf-lib";

/**
 * A snapshot's figure on an A4 page, as PDF bytes. Loaded only when a PDF is made, so pdf-lib is
 * never part of opening a page.
 */

/** A4 portrait, in points. */
const A4 = { width: 595.28, height: 841.89 };
const MARGIN = 42;

/** The figure on an A4 page, at the top, as wide as the margins allow. */
export async function pdfBytes(png: Uint8Array, width: number, height: number, title: string) {
  const doc = await PDFDocument.create();
  doc.setTitle(title);
  doc.setCreator("Physics Anatomy");
  doc.setProducer("Physics Anatomy");
  const page = doc.addPage([A4.width, A4.height]);
  const image = await doc.embedPng(png);
  const fit = Math.min((A4.width - 2 * MARGIN) / width, (A4.height - 2 * MARGIN) / height);
  page.drawImage(image, {
    x: MARGIN,
    y: A4.height - MARGIN - height * fit,
    width: width * fit,
    height: height * fit,
  });
  return doc.save();
}
