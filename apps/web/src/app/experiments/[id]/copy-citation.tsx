"use client";

import { t } from "@pa/i18n";
import "@pa/i18n/catalogue";
import { useState } from "react";

/** The suggested citation, with a button that copies it (ExperimentPage.dc.html). */
export function CopyCitation({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <code data-citation className="font-mono text-sm">
        {text}
      </code>
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard?.writeText(text).then(() => setCopied(true));
        }}
        className="border border-[var(--pa-on-paper)] bg-white px-3 py-1.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pa-accent)]"
      >
        <span aria-live="polite">
          {copied ? t("catalogue.cite.copied") : t("catalogue.cite.copy")}
        </span>
      </button>
    </div>
  );
}
