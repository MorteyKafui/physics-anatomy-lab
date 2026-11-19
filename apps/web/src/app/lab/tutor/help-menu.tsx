"use client";
// The lab header's help button (design/mockups/AI.dc.html): a hint from the coach first, which
// works offline, then the tutor when AI is on for this person, or one line saying why it is not.
import type { AiStatus } from "@pa/api-client";
import { t } from "@pa/i18n";
import { Popover, PopoverContent, PopoverTrigger } from "@pa/ui/components/popover";
import { CircleHelpIcon } from "@pa/ui/icons";
import { useState } from "react";

import { canUse, whyNot } from "./use-ai-status";

export function HelpMenu({
  status,
  onHint,
  onAsk,
  coachOn,
  place,
}: {
  status: AiStatus | undefined;
  onHint: () => void;
  onAsk: () => void;
  /** Exam mode turns the coach off, and the tutor with it. */
  coachOn: boolean;
  /** The rail on a wide screen, the header on a phone: one Help button shows at a time. */
  place: "rail" | "header";
}) {
  const [open, setOpen] = useState(false);
  if (!coachOn) return null;
  const tutor = canUse(status, "tutor");
  const why = whyNot(status, "tutor");
  const pick = (action: () => void) => () => {
    setOpen(false);
    action();
  };
  const item = "flex flex-col gap-0.5 px-3.5 py-3 text-left";
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={t("lab.help.label")}
        className={
          place === "rail"
            ? "flex size-11 items-center justify-center text-muted-foreground hover:bg-raised hover:text-foreground"
            : "flex size-11 items-center justify-center border border-border bg-surface md:hidden"
        }
      >
        <CircleHelpIcon className="size-5" aria-hidden />
      </PopoverTrigger>
      <PopoverContent
        align="end"
        {...(place === "rail" ? { side: "right" as const } : {})}
        className="w-72 gap-0 p-0"
      >
        <button type="button" className={`${item} hover:bg-muted`} onClick={pick(onHint)}>
          <span className="font-semibold">{t("lab.help.hint")}</span>
          <span className="text-xs text-muted-foreground">{t("lab.help.hintNote")}</span>
        </button>
        {tutor ? (
          <button
            type="button"
            className={`${item} border-t border-border hover:bg-muted`}
            onClick={pick(onAsk)}
          >
            <span className="font-semibold">{t("lab.help.ask")}</span>
            <span className="text-xs text-muted-foreground">{t("lab.help.askNote")}</span>
          </button>
        ) : (
          why && (
            <div aria-disabled="true" className={`${item} border-t border-border`}>
              <span className="font-semibold text-muted-foreground">{t("lab.help.ask")}</span>
              <span className="text-xs text-muted-foreground">{why}</span>
            </div>
          )
        )}
      </PopoverContent>
    </Popover>
  );
}
