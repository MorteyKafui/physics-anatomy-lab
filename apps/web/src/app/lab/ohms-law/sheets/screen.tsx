"use client";

import { ohmsLaw } from "@pa/experiments";
import { t } from "@pa/i18n";
import "@pa/i18n/ohms-law";

import { SHEET_GRAPH } from "../../sheets/figures";
import { SheetsScreen, type SheetFigures } from "../../sheets/screen";
import { ohmsLawSheetContent } from "./content";
import { CIRCUIT_STEPS, SHEET_CIRCUIT, SheetCircuit, SheetIvGraph } from "./figures";

// Made once: the sheets do not change with the run, and the screen redraws only on a change.
const content = ohmsLawSheetContent();
const figures: SheetFigures = {
  main: {
    size: SHEET_CIRCUIT,
    Figure: ({ ref }) => <SheetCircuit sheet={content.model} ref={ref} />,
  },
  steps: CIRCUIT_STEPS.map((s) =>
    s.id === "plot"
      ? {
          size: SHEET_GRAPH,
          Figure: ({ ref }) => <SheetIvGraph sheet={content.model} ref={ref} />,
        }
      : {
          size: SHEET_CIRCUIT,
          Figure: ({ ref }) => <SheetCircuit sheet={content.model} step={s} ref={ref} />,
        },
  ),
};

/** The Ohm's law print sheets: the shared sheets screen, with this experiment's content. */
export function OhmsLawSheetsScreen() {
  return (
    <SheetsScreen
      experiment={{ id: ohmsLaw.id, title: t("experiments.ohms-law.title") }}
      content={content}
      figures={figures}
    />
  );
}
