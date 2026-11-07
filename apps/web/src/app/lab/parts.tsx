"use client";

import { STEPS, type Step } from "@pa/engine";
import { emphasis, t, type MessageKey } from "@pa/i18n";
import { cn, Logo } from "@pa/ui";
import { Tooltip, TooltipContent, TooltipTrigger } from "@pa/ui/components/tooltip";
import {
  BookIcon,
  BookOpenIcon,
  CheckIcon,
  CircleHelpIcon,
  FlaskConicalIcon,
  HouseIcon,
  ListChecksIcon,
  LockIcon,
  SettingsIcon,
  type LucideIcon,
} from "@pa/ui/icons";
import Link from "next/link";
import type { ReactNode } from "react";

/** A message with **emphasis** rendered as <b>. */
export function Rich({ text }: { text: string }) {
  return (
    <>
      {emphasis(text).map((part, i) =>
        part.strong ? <b key={i}>{part.text}</b> : <span key={i}>{part.text}</span>,
      )}
    </>
  );
}

const railItem = "flex size-11 items-center justify-center text-muted-foreground";

function NotBuilt({ icon: Icon, name }: { icon: LucideIcon; name: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-disabled="true"
            aria-label={name}
            className={cn(railItem, "cursor-not-allowed opacity-60")}
          />
        }
      >
        <Icon className="size-5" aria-hidden />
      </TooltipTrigger>
      <TooltipContent side="right">{t("lab.rail.notBuilt", { name })}</TooltipContent>
    </Tooltip>
  );
}

/** The app rail (desktop): logo, sections, help and settings. Sections not built yet say so. */
export function Rail({ current }: { current: "lab" | "notebook" }) {
  const here = (on: boolean) =>
    cn(railItem, on && "border-l-2 border-primary bg-raised text-foreground");
  return (
    <nav
      aria-label={t("lab.rail.label")}
      className="hidden w-16 shrink-0 flex-col items-center gap-1.5 border-r border-border bg-[var(--pa-ink-900)] py-3.5 md:flex"
    >
      <Logo size={30} className="mb-3.5 text-foreground" />
      <Link href="/" aria-label={t("lab.rail.home")} className={railItem}>
        <HouseIcon className="size-5" aria-hidden />
      </Link>
      <Link
        href="/lab/simple-pendulum"
        aria-current={current === "lab" ? "page" : undefined}
        aria-label={t("lab.rail.experiments")}
        className={here(current === "lab")}
      >
        <FlaskConicalIcon className="size-5" aria-hidden />
      </Link>
      <Link
        href="/lab/simple-pendulum/notebook"
        aria-current={current === "notebook" ? "page" : undefined}
        aria-label={t("lab.rail.notebook")}
        className={here(current === "notebook")}
      >
        <BookOpenIcon className="size-5" aria-hidden />
      </Link>
      <NotBuilt icon={BookIcon} name={t("lab.rail.reference")} />
      <span className="flex-1" />
      <NotBuilt icon={CircleHelpIcon} name={t("lab.rail.help")} />
      <NotBuilt icon={SettingsIcon} name={t("lab.rail.settings")} />
    </nav>
  );
}

/** The ten-step strip along the bottom: done, current, open or not yet open. */
export function StepStrip({
  current,
  completed,
  open,
  onGo,
  review,
}: {
  current: Step;
  completed: readonly Step[];
  open: (step: Step) => boolean;
  onGo: (step: Step) => void;
  /** The review after the ten steps: where it is, and whether it has opened (after Analyse). */
  review?: { href: string; open: boolean };
}) {
  return (
    <nav
      aria-label={t("lab.steps.label")}
      className="relative flex gap-2 overflow-x-auto border-t border-border bg-[var(--pa-ink-900)] px-5 py-2.5"
    >
      {STEPS.map((step, i) => {
        const done = completed.includes(step);
        const isCurrent = step === current;
        const reachable = open(step);
        return (
          <button
            key={step}
            type="button"
            onClick={() => reachable && !isCurrent && onGo(step)}
            aria-current={isCurrent ? "step" : undefined}
            aria-disabled={!reachable || undefined}
            className={cn(
              "flex shrink-0 items-center gap-2.5 border px-3.5 py-2 text-left pointer-coarse:min-h-11",
              isCurrent
                ? "border-primary bg-raised text-foreground"
                : "border-border text-muted-foreground",
              done && !isCurrent && "text-soft",
              !reachable && "cursor-not-allowed",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "flex size-5 items-center justify-center border-[1.5px] text-xs",
                done
                  ? "border-ok text-ok"
                  : isCurrent
                    ? "border-primary text-accent-text"
                    : "border-input",
              )}
            >
              {done ? (
                <CheckIcon className="size-3" strokeWidth={3} />
              ) : isCurrent ? (
                <span className="size-2 rounded-full bg-primary" />
              ) : null}
            </span>
            <span className="flex flex-col">
              <span className="font-mono text-[11px] text-muted-foreground">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span>{t(`lab.steps.${step}` as MessageKey)}</span>
              <span className="sr-only">{done ? t("lab.coach.done") : ""}</span>
            </span>
          </button>
        );
      })}
      {review &&
        (review.open ? (
          <Link
            href={review.href}
            className="flex shrink-0 items-center gap-2.5 border border-border px-3.5 py-2 text-muted-foreground hover:text-foreground pointer-coarse:min-h-11"
          >
            <ListChecksIcon className="size-5" aria-hidden />
            <span>{t("lab.steps.review")}</span>
          </Link>
        ) : (
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  aria-disabled="true"
                  aria-label={`${t("lab.steps.review")}. ${t("lab.steps.reviewLocked")}`}
                  className="flex shrink-0 cursor-not-allowed items-center gap-2.5 border border-border px-3.5 py-2 text-muted-foreground pointer-coarse:min-h-11"
                />
              }
            >
              <LockIcon className="size-4" aria-hidden />
              <span>{t("lab.steps.review")}</span>
            </TooltipTrigger>
            <TooltipContent side="top">{t("lab.steps.reviewLocked")}</TooltipContent>
          </Tooltip>
        ))}
    </nav>
  );
}

/** One line of the step's checklist: done, the one in hand, or still to come. */
export function CheckItem({
  n,
  state,
  children,
}: {
  n: number;
  state: "done" | "current" | "todo";
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 px-2.5 py-2",
        state === "done" && "text-muted-foreground",
        state === "current" && "border border-primary bg-accent-wash text-foreground",
        state === "todo" && "text-muted-foreground",
      )}
    >
      <span
        className={cn(
          "flex size-[22px] shrink-0 items-center justify-center border-[1.5px] font-mono text-xs",
          state === "done"
            ? "border-ok text-ok"
            : state === "current"
              ? "border-primary"
              : "border-input",
        )}
      >
        {state === "done" ? (
          <CheckIcon className="size-3.5" strokeWidth={3} aria-label={t("lab.coach.done")} />
        ) : (
          n
        )}
      </span>
      <span>{children}</span>
    </div>
  );
}
