"use client";

import { zipSync } from "fflate";
import { PDFDocument } from "pdf-lib";

/**
 * Labelled exports of a snapshot's figure: SVG (sharp at any size), PNG (for a document or a
 * chat) and PDF (to print), and all of them in one ZIP. Everything is made in the browser, so it
 * works with no connection (AGENTS.md rule 5).
 */

const VAR = /var\((--[\w-]+)\s*(?:,\s*((?:[^()]|\([^()]*\))*))?\)/g;

/** Replace var(--x) with the value it has on an element, or its fallback. */
function resolveVars(value: string, style: CSSStyleDeclaration): string {
  let out = value;
  // Fallbacks may hold var() themselves; a few passes resolve them.
  for (let i = 0; i < 3 && out.includes("var("); i++)
    out = out.replace(VAR, (_, name: string, fallback?: string) => {
      const found = style.getPropertyValue(name).trim();
      return found || (fallback ?? "").trim();
    });
  return out;
}

/**
 * The figure as a standalone SVG file: every colour and font that came from a theme variable is
 * written in, since a file opened on its own has no style sheet.
 */
export function svgText(svg: SVGSVGElement): string {
  const copy = svg.cloneNode(true) as SVGSVGElement;
  const originals = [svg, ...svg.querySelectorAll("*")];
  const copies = [copy, ...copy.querySelectorAll("*")];
  originals.forEach((el, i) => {
    const target = copies[i]!;
    const style = getComputedStyle(el);
    for (const attr of [...target.attributes]) {
      if (attr.value.includes("var("))
        target.setAttribute(attr.name, resolveVars(attr.value, style));
    }
    target.removeAttribute("class");
  });
  copy.removeAttribute("data-theme");
  copy.removeAttribute("aria-hidden");
  copy.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  return `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(copy)}`;
}

/** The figure drawn at a scale (2× by default, sharp on a phone and in print), as PNG bytes. */
export async function pngBytes(svg: string, width: number, height: number, scale = 2) {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const image = new Image();
    image.width = width;
    image.height = height;
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("The figure could not be drawn."));
      image.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("This browser cannot draw images.");
    ctx.scale(scale, scale);
    ctx.drawImage(image, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("The figure could not be saved as PNG.");
    return new Uint8Array(await blob.arrayBuffer());
  } finally {
    URL.revokeObjectURL(url);
  }
}

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

const text = (s: string) => new TextEncoder().encode(s);

/** Files into one ZIP. Text is stored as UTF-8. */
export function zipBytes(files: Record<string, Uint8Array | string>): Uint8Array {
  return zipSync(
    Object.fromEntries(
      Object.entries(files).map(([name, data]) => [
        name,
        typeof data === "string" ? text(data) : data,
      ]),
    ),
  );
}

/** Hand the viewer a file to save. */
export function save(data: Uint8Array | string, name: string, type: string) {
  const blob = new Blob([typeof data === "string" ? data : new Uint8Array(data)], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** A table as CSV: headings in the first row, quoted where a cell needs it. */
export function csvText(headings: readonly string[], rows: readonly (readonly string[])[]) {
  const cell = (v: string) => (/[",\n]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v);
  // The byte order mark lets a spreadsheet read T² and the other symbols as UTF-8.
  return "﻿" + [headings, ...rows].map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
}

/** A file name from a figure: "fig-3-simple-pendulum-bench". */
export const fileStem = (fig: number, experiment: string, kind: string) =>
  `fig-${fig}-${experiment}-${kind}`;
