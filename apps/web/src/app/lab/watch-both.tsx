"use client";

import { PendulumBench } from "@pa/apparatus";
import { benchPeriod, bobAngle, CORRECT_ASSEMBLY, passTimes } from "@pa/experiments";
import { t } from "@pa/i18n";
import { DEFAULT_ENVIRONMENT } from "@pa/instruments";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@pa/ui/components/dialog";
import { useEffect, useState } from "react";

import type { RunReview } from "./run-review";

/** How long the loop runs before it starts again, in periods: start, then three passes. */
const LOOP = 3.6;

/** True when the viewer asked for less motion. */
function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const q = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(q.matches);
    update();
    q.addEventListener("change", update);
    return () => q.removeEventListener("change", update);
  }, []);
  return reduced;
}

/**
 * The replay a student sees when comparing a wrong run with a right one (master plan, "Domain
 * model"): both benches swinging together from the pass the stopwatch starts on, each saying
 * what that run counted. A run that counted from one says "1" where the right way says "0".
 */
export function WatchBoth({
  open,
  onOpenChange,
  sides,
  length,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Two runs, or a run and the right way (review undefined). */
  sides: [
    { name: string; review: RunReview | undefined },
    { name: string; review: RunReview | undefined },
  ];
  length: number;
}) {
  const period = benchPeriod(DEFAULT_ENVIRONMENT.g, length);
  const reduced = useReducedMotion();
  const [time, setTime] = useState(0);
  useEffect(() => {
    if (!open || reduced) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      setTime(((now - start) / 1000) % (LOOP * period));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [open, reduced, period]);

  // The stopwatch starts as the bob passes the mark, a quarter period in; then one pass a period.
  const passes = passTimes(period / 4, 3, period);
  const k = passes.findIndex((p) => time >= p && time < p + 0.45 * period);
  const fromOne = (r: RunReview | undefined) =>
    r !== undefined && r.readings.some((rd) => rd.countedFromOne);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="text-sm sm:max-w-[760px]">
        <DialogTitle className="text-base font-semibold">{t("compare.watchTitle")}</DialogTitle>
        <DialogDescription className="text-soft">{t("compare.watchHint")}</DialogDescription>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {sides.map(({ name, review }) => {
            const first = fromOne(review) ? 1 : 0;
            const label = k >= 0 ? String(k + first) : undefined;
            const says = reduced
              ? t("compare.saysStill", { name, count: first })
              : label !== undefined
                ? t("compare.says", { name, count: label })
                : name;
            return (
              <figure key={name} className="m-0 flex flex-col gap-2 bg-[var(--pa-ink-950)] p-2">
                <PendulumBench
                  angle={reduced ? 0 : bobAngle(time, period)}
                  stopwatchSeconds={0}
                  length={length}
                  assembly={review?.assembly ?? CORRECT_ASSEMBLY}
                  markLabel={reduced ? String(first) : label}
                  label={says}
                  className="h-auto w-full"
                />
                <figcaption className="font-mono text-[13px]" aria-live="polite">
                  {says}
                </figcaption>
              </figure>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
