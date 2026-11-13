"use client";

import { simplePendulum } from "@pa/experiments";
import { t } from "@pa/i18n";

import { sheetContent } from "./content";
import { SHEET_BENCH, SHEET_GRAPH, SHEET_STEPS, SheetBench, SheetGraph } from "./figures";
import { SheetsScreen, type SheetFigures } from "./screen";

// Made once: the sheets are worked out for the room's g, and the screen redraws only on a change.
const content = sheetContent();
const figures: SheetFigures = {
  main: { size: SHEET_BENCH, Figure: ({ ref }) => <SheetBench pins ref={ref} /> },
  steps: SHEET_STEPS.map((s) =>
    s.id === "plot"
      ? { size: SHEET_GRAPH, Figure: ({ ref }) => <SheetGraph sheet={content.model} ref={ref} /> }
      : {
          size: SHEET_BENCH,
          Figure: ({ ref }) => (
            <SheetBench assembly={s.assembly} focus={s.focus} angle={s.angle} ref={ref} />
          ),
        },
  ),
};

/** The simple pendulum's print sheets. */
export function PendulumSheetsScreen() {
  return (
    <SheetsScreen
      experiment={{
        id: simplePendulum.id,
        title: t("experiments.simple-pendulum.title"),
        check: true,
      }}
      content={content}
      figures={figures}
    />
  );
}
