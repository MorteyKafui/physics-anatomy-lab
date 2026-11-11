"use client";

import { t } from "@pa/i18n";
import dynamic from "next/dynamic";

// The table, graph and analysis panels are needed only from step 6, so each lab loads them when
// a step needs them, not with the lab: the lab stays inside its JavaScript budget (e2e
// performance.spec.ts). The service worker keeps every chunk, so they still open offline.

const loading = () => <p className="p-4 text-sm text-muted-foreground">{t("lab.panelLoading")}</p>;

export const TableBuilder = dynamic(() => import("./table-panel").then((m) => m.TableBuilder), {
  loading,
});
export const GraphPanel = dynamic(() => import("./graph-panel").then((m) => m.GraphPanel), {
  loading,
});
export const AnalysePanel = dynamic(() => import("./analyse").then((m) => m.AnalysePanel), {
  loading,
});
export const AnswerLine = dynamic(() => import("./analyse").then((m) => m.AnswerLine));
export const Calculator = dynamic(() => import("./analyse").then((m) => m.Calculator));
