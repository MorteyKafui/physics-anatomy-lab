"use client";

import { convergingLens } from "@pa/experiments";
import { t } from "@pa/i18n";
import "@pa/i18n/converging-lens";

import { SHEET_GRAPH } from "../../sheets/figures";
import { SheetsScreen, type SheetFigures } from "../../sheets/screen";
import { lensSheetContent } from "./content";
import { LENS_STEPS, SHEET_OPTICAL, SheetLensGraph, SheetOptical } from "./figures";

// Made once: the sheets do not change with the run, and the screen redraws only on a change.
const content = lensSheetContent();
const figures: SheetFigures = {
  main: {
    size: SHEET_OPTICAL,
    Figure: ({ ref }) => <SheetOptical sheet={content.model} ref={ref} />,
  },
  steps: LENS_STEPS.map((s) =>
    s.id === "plot"
      ? {
          size: SHEET_GRAPH,
          Figure: ({ ref }) => <SheetLensGraph sheet={content.model} ref={ref} />,
        }
      : {
          size: SHEET_OPTICAL,
          Figure: ({ ref }) => <SheetOptical sheet={content.model} step={s} ref={ref} />,
        },
  ),
};

/** The converging lens print sheets: the shared sheets screen, with this experiment's content. */
export function ConvergingLensSheetsScreen() {
  return (
    <SheetsScreen
      experiment={{ id: convergingLens.id, title: t("experiments.converging-lens.title") }}
      content={content}
      figures={figures}
    />
  );
}
