"use client";

import { t } from "@pa/i18n";
import { cn } from "@pa/ui";

/** The "Uncertainties" switch, beside the help level (the uncertainty board). */
export function UncertaintySwitch({
  on,
  onChange,
}: {
  on: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-label={t("lab.uncertainties")}
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={cn(
        "inline-flex h-9 items-center gap-2 border px-1.5 min-[1320px]:pr-3 text-[13px] font-medium focus-visible:outline-2 focus-visible:outline-ring",
        on ? "border-accent-fill bg-accent-wash" : "border-input",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "relative h-4 w-7 border-[1.5px]",
          on ? "border-accent-fill" : "border-input",
        )}
      >
        <span
          className={cn(
            "absolute top-0 h-full w-1/2",
            on ? "right-0 bg-accent-fill" : "left-0 bg-input",
          )}
        />
      </span>
      {/* On narrower screens the word gives way, as the help level's does, so the header stays on
        one row; the switch keeps its name. */}
      <span className="sr-only min-[1320px]:not-sr-only">{t("lab.uncertainties")}</span>
    </button>
  );
}
