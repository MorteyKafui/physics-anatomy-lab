"use client";

import { methodOfMixtures } from "@pa/experiments";
import { t } from "@pa/i18n";
import "@pa/i18n/method-of-mixtures";

import { SHEET_GRAPH } from "../../sheets/figures";
import { SheetsScreen, type SheetFigures } from "../../sheets/screen";
import { mixturesSheetContent } from "./content";
import { MIXTURES_STEPS, SHEET_CALORIMETER, SheetCalorimeter, SheetMixturesGraph } from "./figures";

// Made once: the sheets do not change with the run, and the screen redraws only on a change.
const content = mixturesSheetContent();
const figures: SheetFigures = {
  main: {
    size: SHEET_CALORIMETER,
    Figure: ({ ref }) => <SheetCalorimeter sheet={content.model} ref={ref} />,
  },
  steps: MIXTURES_STEPS.map((s) =>
    s.id === "plot"
      ? {
          size: SHEET_GRAPH,
          Figure: ({ ref }) => <SheetMixturesGraph sheet={content.model} ref={ref} />,
        }
      : {
          size: SHEET_CALORIMETER,
          Figure: ({ ref }) => <SheetCalorimeter sheet={content.model} step={s} ref={ref} />,
        },
  ),
};

/** The mixtures print sheets: the shared sheets screen, with this experiment's content. */
export function MethodOfMixturesSheetsScreen() {
  return (
    <SheetsScreen
      experiment={{
        id: methodOfMixtures.id,
        title: t("experiments.method-of-mixtures.title"),
        check: true,
      }}
      content={content}
      figures={figures}
    />
  );
}
