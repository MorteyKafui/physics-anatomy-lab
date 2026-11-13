"use client";

import { t } from "@pa/i18n";
import { useEffect, useState, type ComponentType } from "react";

// The table, graph and analysis panels are needed only from step 6, so each lab loads them when
// a step needs them, not with the lab: the lab stays inside its JavaScript budget (e2e
// performance.spec.ts). The service worker keeps every chunk, so they still open offline.

/**
 * A component whose code loads the first time it is shown, with a line saying so until then.
 * Not React.lazy (or next/dynamic, built on it): Suspense waits on a timer before it shows what
 * loaded, and a lab with a stopped clock (the e2e tests' fake clock) would never show it.
 */
function lazyPanel<P extends object>(load: () => Promise<ComponentType<P>>, placeholder = true) {
  let loaded: ComponentType<P> | undefined;
  let loading: Promise<ComponentType<P>> | undefined;
  const get = () => (loading ??= load().then((c) => (loaded = c)));
  return function LazyPanel(props: P) {
    const [Panel, setPanel] = useState(() => loaded);
    useEffect(() => {
      if (Panel) return;
      let live = true;
      void get().then((c) => live && setPanel(() => c));
      return () => {
        live = false;
      };
    }, [Panel]);
    if (Panel) return <Panel {...props} />;
    return placeholder ? (
      <p className="p-4 text-sm text-muted-foreground">{t("lab.panelLoading")}</p>
    ) : null;
  };
}

export const TableBuilder = lazyPanel(() => import("./table-panel").then((m) => m.TableBuilder));
export const GraphPanel = lazyPanel(() => import("./graph-panel").then((m) => m.GraphPanel));
export const AnalysePanel = lazyPanel(() => import("./analyse").then((m) => m.AnalysePanel));
export const AnswerLine = lazyPanel(() => import("./analyse").then((m) => m.AnswerLine), false);
export const Calculator = lazyPanel(() => import("./analyse").then((m) => m.Calculator), false);
export const QuoteLine = lazyPanel(() => import("./analyse").then((m) => m.QuoteLine), false);
