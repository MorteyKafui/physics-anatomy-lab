"use client";

import { hotSolid } from "@pa/experiments";
import { t } from "@pa/i18n";
import "@pa/i18n/method-of-mixtures";

import { SHEET_GRAPH } from "../../sheets/figures";
import { SheetsScreen, type SheetFigures } from "../../sheets/screen";
import { solidSheetContent } from "./content";
import { SHEET_HOT_SOLID, SheetHotSolid, SheetSolidGraph, SOLID_STEPS } from "./figures";

// Made once: the sheets do not change with the run, and the screen redraws only on a change.
const content = solidSheetContent();
const figures: SheetFigures = {
  main: {
    size: SHEET_HOT_SOLID,
    Figure: ({ ref }) => <SheetHotSolid sheet={content.model} ref={ref} />,
  },
  steps: SOLID_STEPS.map((s) =>
    s.id === "plot"
      ? {
          size: SHEET_GRAPH,
          Figure: ({ ref }) => <SheetSolidGraph sheet={content.model} ref={ref} />,
        }
      : {
          size: SHEET_HOT_SOLID,
          Figure: ({ ref }) => <SheetHotSolid sheet={content.model} step={s} ref={ref} />,
        },
  ),
};

/** The hot-solid print sheets: the shared sheets screen, with this experiment's content. */
export function MethodOfMixturesSolidSheetsScreen() {
  return (
    <SheetsScreen
      experiment={{
        id: hotSolid.id,
        title: t("experiments.method-of-mixtures-solid.title"),
        check: true,
      }}
      content={content}
      figures={figures}
    />
  );
}
