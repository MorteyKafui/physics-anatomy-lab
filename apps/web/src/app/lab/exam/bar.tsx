"use client";

import { EXAM_PARTS, examClock } from "@pa/experiments";
import { t, type MessageKey } from "@pa/i18n";
import { cn } from "@pa/ui";
import { Button } from "@pa/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@pa/ui/components/dialog";
import { useEffect, useRef, useState } from "react";

/** "41:12" from milliseconds. */
export const mmss = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/**
 * The exam clock in the lab (approved board Exam.dc.html): time left, the part of the hour the
 * guide expects now and the time left in it, the parts as a track, and Hand in. At five minutes
 * left it turns amber; at the end it hands the script in itself.
 */
export function ExamBar({
  startedAt,
  onHandIn,
}: {
  startedAt: number;
  onHandIn: (auto: boolean) => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  const [confirm, setConfirm] = useState(false);
  const [said, setSaid] = useState<string>();
  const handedIn = useRef(false);
  const warned = useRef(false);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const clock = examClock(startedAt, now);
  useEffect(() => {
    if (clock.over && !handedIn.current) {
      handedIn.current = true;
      onHandIn(true);
    } else if (clock.left <= 5 * 60_000 && !warned.current) {
      warned.current = true;
      setSaid(t("exam.fiveLeft"));
    }
  }, [clock.over, clock.left, onHandIn]);
  const ending = clock.left <= 5 * 60_000;
  const part = EXAM_PARTS[clock.part]!;

  return (
    <div className="flex shrink-0 flex-col border-b border-border">
      <div
        role="timer"
        aria-label={t("exam.clock")}
        className="flex flex-wrap items-center gap-x-5 gap-y-2.5 bg-surface px-5 py-3"
      >
        <span className="flex flex-col">
          <span className="text-xs text-muted-foreground">{t("exam.left")}</span>
          <span className={cn("font-mono text-[26px] font-medium", ending && "text-warn")}>
            {mmss(clock.left)}
          </span>
        </span>
        <span className="flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground">{t("exam.now")}</span>
          <span>
            {t(`exam.part.${part.id}` as MessageKey)}{" "}
            <span className="text-muted-foreground">
              · {t("exam.partLeft", { left: mmss(clock.partLeft) })}
            </span>
          </span>
        </span>
        <span className="flex-1" />
        <span className="border border-input px-2 py-0.5 text-xs text-soft">
          {t("exam.coachOff")}
        </span>
        <Button
          className="h-[38px] bg-foreground font-semibold text-background hover:bg-soft"
          onClick={() => setConfirm(true)}
        >
          {t("exam.handIn")}
        </Button>
      </div>
      <div aria-hidden className="flex gap-[3px] overflow-hidden bg-[var(--pa-ink-900)] px-5 py-2">
        {EXAM_PARTS.map((p, i) => (
          <span
            key={p.id}
            style={{ flex: `${p.minutes} 1 0` }}
            className={cn(
              "min-w-0 truncate border-t-[3px] px-1.5 py-1 text-[11px]",
              i < clock.part && "border-ok text-muted-foreground",
              i === clock.part && "border-primary bg-surface text-foreground",
              i > clock.part && "border-input text-muted-foreground",
            )}
          >
            {t(`exam.part.${p.id}` as MessageKey)}
          </span>
        ))}
      </div>
      <p role="status" className="sr-only">
        {said}
      </p>
      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent showCloseButton={false} className="text-sm sm:max-w-[420px]">
          <DialogTitle className="text-base font-semibold">{t("exam.handInTitle")}</DialogTitle>
          <DialogDescription className="text-soft">
            {t("exam.handInBody", { left: mmss(clock.left) })}
          </DialogDescription>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(false)}>
              {t("exam.keepWorking")}
            </Button>
            <Button
              className="font-semibold"
              onClick={() => {
                setConfirm(false);
                handedIn.current = true;
                onHandIn(false);
              }}
            >
              {t("exam.handIn")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
