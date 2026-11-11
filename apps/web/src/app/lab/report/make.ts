"use client";

import { pngBytes, svgText } from "../snapshot-export";
import type { ReportContent } from "./content";
import type { ReportImages, ReportOptions } from "./pdf";

/** Print resolution for the figures: 3 × CSS px, about 290 dpi at the size they print. */
const SCALE = 3;

/** The two figures, drawn from their SVGs at print resolution. */
export async function reportImages(
  bench: SVGSVGElement | undefined,
  graph: SVGSVGElement | undefined,
): Promise<ReportImages> {
  const draw = async (el: SVGSVGElement | undefined) => {
    if (!el) return undefined;
    const size = { width: el.width.baseVal.value, height: el.height.baseVal.value };
    return { png: await pngBytes(svgText(el), size.width, size.height, SCALE), ...size };
  };
  return { bench: await draw(bench), graph: await draw(graph) };
}

/** The report as a PDF, from the content and the figures on the page. */
export async function makeReportPdf(
  content: ReportContent,
  bench: SVGSVGElement | undefined,
  graph: SVGSVGElement | undefined,
  options: ReportOptions,
) {
  // pdf-lib and fontkit load only when a PDF is made, never when a page opens.
  const { loadFonts, reportPdf } = await import("./pdf");
  const [images, fonts] = await Promise.all([reportImages(bench, graph), loadFonts()]);
  return reportPdf(content, images, fonts, options);
}
