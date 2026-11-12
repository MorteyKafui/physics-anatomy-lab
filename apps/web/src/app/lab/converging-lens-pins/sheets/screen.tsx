"use client";

import { lensPins } from "@pa/experiments";
import { t } from "@pa/i18n";
import "@pa/i18n/converging-lens";

import { SHEET_GRAPH } from "../../sheets/figures";
import { SheetsScreen, type SheetFigures } from "../../sheets/screen";
import { pinsSheetContent } from "./content";
import { PINS_STEPS, SHEET_PINS, SheetPins, SheetPinsGraph } from "./figures";

// Made once: the sheets do not change with the run, and the screen redraws only on a change.
const content = pinsSheetContent();
const figures: SheetFigures = {
  main: {
    size: SHEET_PINS,
    Figure: ({ ref }) => <SheetPins sheet={content.model} ref={ref} />,
  },
  steps: PINS_STEPS.map((s) =>
    s.id === "plot"
      ? {
          size: SHEET_GRAPH,
          Figure: ({ ref }) => <SheetPinsGraph sheet={content.model} ref={ref} />,
        }
      : {
          size: SHEET_PINS,
          Figure: ({ ref }) => <SheetPins sheet={content.model} step={s} ref={ref} />,
        },
  ),
};

/** The two-pin print sheets: the shared sheets screen, with this experiment's content. */
export function ConvergingLensPinsSheetsScreen() {
  return (
    <SheetsScreen
      experiment={{ id: lensPins.id, title: t("experiments.converging-lens-pins.title") }}
      content={content}
      figures={figures}
    />
  );
}
