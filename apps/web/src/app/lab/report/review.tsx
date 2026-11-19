"use client";
// Report review (docs/content/ai-tutor-brief.md, decision 7; design/mockups/AI.dc.html). Online,
// for those AI is on for. Only the sections that need judgement are sent, and each note comes
// back checked: on the student's own words, with the rule it relies on. Nothing here changes the
// report: the notes sit beside it, are not saved, and never go into an export.
import { streamAi } from "@pa/api-client";
import { t } from "@pa/i18n";
import "@pa/i18n/review";
import { Button } from "@pa/ui/components/button";
import { useRef, useState } from "react";

import { canUse, useAiStatus, notNow } from "../tutor/use-ai-status";
import type { ReportContent } from "./content";

export const REVIEWED = ["conclusion", "precautions", "sources", "discussion"] as const;

export interface ReviewNote {
  readonly section: string;
  readonly quote: string;
  readonly comment: string;
  readonly ruleText: string;
}

type Review =
  | { readonly kind: "idle" }
  | { readonly kind: "working" }
  | { readonly kind: "done"; readonly notes: readonly ReviewNote[] }
  | { readonly kind: "failed"; readonly message: string };

function notesOf(item: Readonly<Record<string, unknown>>): ReviewNote[] | undefined {
  const raw = item.comments;
  if (!Array.isArray(raw)) return undefined;
  const notes: ReviewNote[] = [];
  for (const c of raw as unknown[]) {
    if (typeof c !== "object" || c === null) continue;
    const { section, quote, comment, rule_text: ruleText } = c as Record<string, unknown>;
    if ([section, quote, comment, ruleText].every((v) => typeof v === "string")) {
      notes.push({
        section: section as string,
        quote: quote as string,
        comment: comment as string,
        ruleText: ruleText as string,
      });
    }
  }
  return notes;
}

export function useReportReview(content: ReportContent | undefined, experiment: { id: string }) {
  const status = useAiStatus();
  const [review, setReview] = useState<Review>({ kind: "idle" });
  const stop = useRef<AbortController>(undefined);
  const sections = (content?.sections ?? [])
    .filter((s) => (REVIEWED as readonly string[]).includes(s.id) && s.text.trim())
    .map((s) => ({ id: s.id, text: s.text.slice(0, 4000) }));

  const ask = async () => {
    if (!content || sections.length === 0 || review.kind === "working") return;
    stop.current?.abort();
    const controller = new AbortController();
    stop.current = controller;
    setReview({ kind: "working" });
    let next: Review = { kind: "failed", message: t("report.review.nothing") };
    for await (const event of streamAi(
      "/ai/report-review",
      { experiment_id: experiment.id, experiment_version: 1, format: content.format, sections },
      { signal: controller.signal },
    )) {
      if (event.type === "item") {
        const notes = notesOf(event.item);
        if (notes) next = { kind: "done", notes };
      } else if (event.type === "refused" || event.type === "error") {
        next = { kind: "failed", message: event.message };
      }
    }
    if (!controller.signal.aborted) setReview(next);
  };

  return {
    on: canUse(status, "report-review"),
    notNow: notNow(status, "report-review"),
    review,
    ready: sections.length > 0,
    ask: () => void ask(),
    notesFor: (section: string) =>
      review.kind === "done" ? review.notes.filter((n) => n.section === section) : [],
  };
}

export type ReportReview = ReturnType<typeof useReportReview>;

/** The button and the line under the sections list. */
export function ReviewControls({ r }: { r: ReportReview }) {
  if (!r.on) {
    // Used up for today: say so where the button was; otherwise AI is simply not offered.
    if (!r.notNow) return null;
    return (
      <div className="border-t border-border px-3.5 py-3">
        <span role="status" className="text-xs text-muted-foreground">
          {r.notNow}
        </span>
      </div>
    );
  }
  const done = r.review.kind === "done" ? r.review.notes.length : undefined;
  return (
    <div className="flex flex-col gap-2 border-t border-border px-3.5 py-3">
      <Button
        className="self-start"
        disabled={!r.ready || r.review.kind === "working"}
        onClick={r.ask}
      >
        {r.review.kind === "done" ? t("report.review.again") : t("report.review.ask")}
      </Button>
      <span className="text-xs text-muted-foreground">
        {r.ready ? t("report.review.note") : t("report.review.nothing")}
      </span>
      <span role="status" aria-live="polite" className="text-xs">
        {r.review.kind === "working" && t("report.review.working")}
        {done === 0 && t("report.review.none")}
        {done === 1 && t("report.review.count.one")}
        {done !== undefined && done > 1 && t("report.review.count", { n: done })}
        {r.review.kind === "failed" && r.review.message}
      </span>
    </div>
  );
}

/** A section's notes, beside it on the page; never part of the report or its exports. */
export function ReviewNotes({ notes }: { notes: readonly ReviewNote[] }) {
  if (notes.length === 0) return null;
  return (
    <div className="flex flex-col gap-2 print:hidden" data-review-notes>
      {notes.map((n, i) => (
        <aside
          key={i}
          className="flex flex-col gap-1 border-l-[3px] border-[var(--pa-accent)] bg-[var(--pa-bg)] px-3 py-2 text-[13px]"
        >
          <span className="text-xs text-[var(--pa-fg-muted)]">
            {t("report.review.about", { quote: n.quote })}
          </span>
          <span>{n.comment}</span>
          <span className="self-start border border-[var(--pa-border)] px-2 py-0.5 text-xs text-[var(--pa-fg-muted)]">
            {t("report.review.rule", { rule: n.ruleText })}
          </span>
        </aside>
      ))}
    </div>
  );
}
