"use client";

import { pngBytes, svgText } from "../snapshot-export";
import type { ReportContent } from "./content";
import { BENCH_SIZE, GRAPH_SIZE } from "./drawings";
import { loadFonts, reportPdf, type ReportImages, type ReportOptions } from "./pdf";

/** Print resolution for the figures: 3 × CSS px, about 290 dpi at the size they print. */
const SCALE = 3;

/** The two figures, drawn from their SVGs at print resolution. */
export async function reportImages(
  bench: SVGSVGElement | undefined,
  graph: SVGSVGElement | undefined,
): Promise<ReportImages> {
  const draw = async (el: SVGSVGElement | undefined, size: { width: number; height: number }) =>
    el ? { png: await pngBytes(svgText(el), size.width, size.height, SCALE), ...size } : undefined;
  return { bench: await draw(bench, BENCH_SIZE), graph: await draw(graph, GRAPH_SIZE) };
}

/** The report as a PDF, from the content and the figures on the page. */
export async function makeReportPdf(
  content: ReportContent,
  bench: SVGSVGElement | undefined,
  graph: SVGSVGElement | undefined,
  options: ReportOptions,
) {
  const [images, fonts] = await Promise.all([reportImages(bench, graph), loadFonts()]);
  return reportPdf(content, images, fonts, options);
}
