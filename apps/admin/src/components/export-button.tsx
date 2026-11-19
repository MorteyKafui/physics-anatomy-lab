"use client";

// Downloads a table as CSV through the admin API, which records the export in the audit log.
import { Download } from "@pa/ui/icons";
import { useState } from "react";

import { exportCsv } from "@/app/actions";

import { useToast } from "./toast";

export function ExportButton({
  report,
  range,
  experimentId,
  label = "Export",
  primary = true,
}: {
  report: "mistakes" | "stages" | "classes";
  range: "24h" | "7d" | "30d";
  experimentId?: string;
  label?: string;
  primary?: boolean;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <button
      className={primary ? "ad-f ad-primary" : "ad-f ad-btn ad-button"}
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const r = await exportCsv(report, range, experimentId);
        setBusy(false);
        if (!r.ok) {
          toast({ text: r.detail, failed: true });
          return;
        }
        const url = URL.createObjectURL(new Blob([r.data], { type: "text/csv;charset=utf-8" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = `physics-anatomy-${report}-${range}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast({ text: "Exported. The export is recorded in the audit log." });
      }}
    >
      {primary && <Download size={14} strokeWidth={2.2} aria-hidden="true" />}
      {busy ? "Exporting…" : label}
    </button>
  );
}
