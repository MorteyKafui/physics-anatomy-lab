"use client";

import { t } from "@pa/i18n";
import "@pa/i18n/landing";
import { useEffect, useState } from "react";

type Status = "checking" | "ok" | "down";

const DOT: Record<Status, string> = {
  checking: "var(--pa-text-faint)",
  ok: "var(--pa-topic-measurement)",
  down: "var(--pa-warn)",
};

/**
 * The footer's status light (landing page brief, decision 7). It asks the API's health check
 * once the page has loaded, never on the way to the first paint, and is never typed in as green.
 */
export function StatusLight() {
  const [status, setStatus] = useState<Status>("checking");
  useEffect(() => {
    const stop = new AbortController();
    const ask = () => {
      fetch("/api/health", { signal: stop.signal, cache: "no-store" })
        .then((r) => setStatus(r.ok ? "ok" : "down"))
        .catch(() => {
          if (!stop.signal.aborted) setStatus("down");
        });
    };
    if (document.readyState === "complete") ask();
    else window.addEventListener("load", ask, { once: true, signal: stop.signal });
    return () => stop.abort();
  }, []);
  return (
    <p
      role="status"
      data-status={status}
      className="m-0 flex items-center gap-2 self-start border border-[var(--pa-line)] px-3 py-[7px] text-sm text-[var(--pa-text)]"
    >
      <span
        className={`size-2 shrink-0 rounded-full ${status === "ok" ? "pa-pulse" : ""}`}
        style={{ background: DOT[status] }}
      />
      {t(`landing.status.${status}`)}
    </p>
  );
}
