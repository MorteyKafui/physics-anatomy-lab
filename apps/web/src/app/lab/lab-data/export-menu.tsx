"use client";

import { t } from "@pa/i18n";
import { Button } from "@pa/ui/components/button";
import { useState, type RefObject } from "react";

import { pngBytes, save, svgText } from "../snapshot-export";

/**
 * The export menu (data templates brief, decision 7; the model check board): the readings as CSV,
 * XLSX or JSON, and the graph as PNG, SVG or PDF, in the colours the graph is shown in. Everything
 * is made in the browser, offline.
 */

export interface ExportReadings {
  /** The file name without its extension: "simple-pendulum-lab-data". */
  stem: string;
  csv: () => string;
  xlsx: () => Uint8Array;
  json: () => string;
}

export interface ExportGraph {
  stem: string;
  /** The graph sheet's svg, as drawn. */
  svg: RefObject<SVGSVGElement | null>;
  width: number;
  height: number;
  /** The PDF's title. */
  title: string;
  /** The graph is drawn in black and white. */
  mono: boolean;
}

const READINGS = ["csv", "xlsx", "json"] as const;
const GRAPH = ["png", "svg", "pdf"] as const;
type Format = (typeof READINGS)[number] | (typeof GRAPH)[number];

const TYPES: Record<Format, string> = {
  csv: "text/csv",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  json: "application/json",
  png: "image/png",
  svg: "image/svg+xml",
  pdf: "application/pdf",
};

export function ExportMenu({ readings, graph }: { readings: ExportReadings; graph: ExportGraph }) {
  const [busy, setBusy] = useState<Format | undefined>();

  const exportReadings = (f: (typeof READINGS)[number]) => {
    const data = f === "csv" ? readings.csv() : f === "xlsx" ? readings.xlsx() : readings.json();
    save(data, `${readings.stem}.${f}`, TYPES[f]);
  };

  const exportGraph = async (f: (typeof GRAPH)[number]) => {
    const el = graph.svg.current;
    if (!el) return;
    setBusy(f);
    try {
      const svg = svgText(el);
      if (f === "svg") return save(svg, `${graph.stem}.svg`, TYPES.svg);
      const png = await pngBytes(svg, graph.width, graph.height);
      if (f === "png") return save(png, `${graph.stem}.png`, TYPES.png);
      const { pdfBytes } = await import("../snapshot-pdf");
      save(
        await pdfBytes(png, graph.width, graph.height, graph.title),
        `${graph.stem}.pdf`,
        TYPES.pdf,
      );
    } finally {
      setBusy(undefined);
    }
  };

  return (
    <section
      aria-labelledby="export-heading"
      className="flex flex-col gap-3 border border-border bg-surface p-4"
    >
      <h2 id="export-heading" className="m-0 text-[15px] font-semibold">
        {t("labData.export.title")}
      </h2>
      <div
        role="group"
        aria-labelledby="export-readings"
        className="flex flex-wrap items-center gap-2"
      >
        <span id="export-readings" className="w-[70px] text-[13px] text-muted-foreground">
          {t("labData.export.readings")}
        </span>
        {READINGS.map((f) => (
          <Button key={f} variant="outline" onClick={() => exportReadings(f)}>
            {f.toUpperCase()}
          </Button>
        ))}
      </div>
      <div
        role="group"
        aria-labelledby="export-graph"
        className="flex flex-wrap items-center gap-2"
      >
        <span id="export-graph" className="w-[70px] text-[13px] text-muted-foreground">
          {t("labData.export.graph")}
        </span>
        {GRAPH.map((f) => (
          <Button
            key={f}
            variant="outline"
            disabled={busy !== undefined}
            aria-busy={busy === f}
            onClick={() => void exportGraph(f)}
          >
            {f.toUpperCase()}
          </Button>
        ))}
        <span className="text-xs text-muted-foreground">
          {t(graph.mono ? "labData.export.mono" : "labData.export.colour")}
        </span>
      </div>
    </section>
  );
}
