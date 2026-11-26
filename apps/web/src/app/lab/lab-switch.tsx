"use client";

import type { Step } from "@pa/engine";
import { t, type MessageKey } from "@pa/i18n";
import { cn } from "@pa/ui";
import { Button } from "@pa/ui/components/button";
import { Menu, MenuContent, MenuLinkItem, MenuTrigger } from "@pa/ui/components/menu";
import { ChevronDownIcon, LinkIcon } from "@pa/ui/icons";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { percentDone, stepPlace } from "./lab-steps";

/** The six practicals, in the order the practicals page lists them, each in its topic colour. */
const PRACTICALS = [
  { id: "simple-pendulum", topic: "bg-topic-mechanics" },
  { id: "ohms-law", topic: "bg-topic-electricity" },
  { id: "converging-lens", topic: "bg-topic-light" },
  { id: "converging-lens-pins", topic: "bg-topic-light" },
  { id: "method-of-mixtures", topic: "bg-topic-heat" },
  { id: "method-of-mixtures-solid", topic: "bg-topic-heat" },
] as const;

/** The practical's full title is in its own message file; the menu's names are in the shared one. */
const title = (id: string) => t(`experiments.${id}.title` as MessageKey);
const menuName = (id: string) => t(`lab.switch.name.${id}` as MessageKey);
const stepName = (s: Step) => t(`lab.steps.${s}` as MessageKey);

/**
 * The practical in the lab's top bar (LabOpen board): its topic colour, its name as the button
 * that opens Switch practical, the step it is on and how far through it is. The menu lists all six
 * practicals; each is a client navigation to a page the service worker keeps, so switching works
 * offline, and each practical's attempt stays on this device.
 */
export function PracticalSwitch({
  current,
  step,
  completed,
}: {
  current: string;
  step: Step;
  completed: readonly Step[];
}) {
  const place = stepPlace(current, step);
  const percent = percentDone(current, completed);
  const topic = PRACTICALS.find((p) => p.id === current)?.topic;
  // The menu opens below the whole box, as on the board, not below the name alone.
  const box = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={box}
      className="flex items-center gap-3 md:border md:border-border md:bg-surface md:py-2 md:pr-2 md:pl-3.5"
    >
      <span aria-hidden className={cn("hidden size-2.5 shrink-0 md:block", topic)} />
      <div className="flex min-w-0 flex-col">
        <h1 className="font-semibold">
          <Menu>
            <MenuTrigger className="flex items-center gap-1.5 text-left focus-visible:outline-2 focus-visible:outline-ring">
              {title(current)}
              <ChevronDownIcon className="size-3.5 shrink-0" strokeWidth={2.2} aria-hidden />
            </MenuTrigger>
            <MenuContent
              anchor={box}
              alignOffset={-1}
              aria-label={t("lab.switch.label")}
              className="w-90"
            >
              {PRACTICALS.map((p) => {
                const here = p.id === current;
                return (
                  <MenuLinkItem
                    key={p.id}
                    render={<Link href={`/lab/${p.id}`} />}
                    aria-current={here ? "page" : undefined}
                    className={cn(here && "border-primary bg-raised")}
                  >
                    <span aria-hidden className={cn("size-[9px] shrink-0", p.topic)} />
                    <span className="flex-1">{menuName(p.id)}</span>
                    {here && (
                      <span className="font-mono text-xs text-muted-foreground">
                        {t("lab.switch.step", place)}
                      </span>
                    )}
                  </MenuLinkItem>
                );
              })}
              <p className="mt-1 border-t border-border px-2.5 pt-2.5 pb-1.5 text-xs text-muted-foreground">
                {t("lab.switch.device")}
              </p>
            </MenuContent>
          </Menu>
        </h1>
        <span className="font-mono text-xs text-muted-foreground">
          {t("lab.header.stepOf", { ...place, step: stepName(step) })}
        </span>
      </div>
      <div
        className="hidden h-1 w-30 shrink-0 bg-border md:block"
        role="img"
        aria-label={t("lab.header.progress", { percent })}
      >
        <div className="h-1 bg-primary" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

/**
 * Share link (LabOpen board): copies the practical's link, for a teacher to send, and says "Link
 * copied" for a moment. Where the clipboard is not available, it shows the link in a read-only
 * field, selected, to copy by hand.
 */
export function ShareLink({ experimentId }: { experimentId: string }) {
  const [state, setState] = useState<"idle" | "copied" | "manual">("idle");
  const field = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState("");

  useEffect(() => {
    if (state === "copied") {
      const id = window.setTimeout(() => setState("idle"), 2500);
      return () => window.clearTimeout(id);
    }
    if (state === "manual") field.current?.select();
  }, [state]);

  const share = async () => {
    const link = `${window.location.origin}/lab/${experimentId}`;
    setUrl(link);
    try {
      if (!navigator.clipboard) throw new Error("no clipboard");
      await navigator.clipboard.writeText(link);
      setState("copied");
    } catch {
      setState("manual");
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" className="h-9 gap-2 px-3" onClick={() => void share()}>
        <LinkIcon aria-hidden />
        <span className={cn(state !== "copied" && "sr-only md:not-sr-only")}>
          {state === "copied" ? t("lab.share.copied") : t("lab.share.label")}
        </span>
      </Button>
      {state === "manual" && (
        <input
          ref={field}
          readOnly
          value={url}
          aria-label={t("lab.share.field")}
          onFocus={(e) => e.currentTarget.select()}
          className="h-9 w-56 border border-input bg-surface px-2.5 font-mono text-xs text-foreground"
        />
      )}
      <span role="status" className="sr-only">
        {state === "copied" ? t("lab.share.copied") : ""}
      </span>
    </div>
  );
}
