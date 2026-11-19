"use client";
// "Report this answer" (design/mockups/AI.dc.html; docs/content/ai-evals-brief.md decision 6).
// Under a tutor reply, a what-if scenario or a review note. A report keeps the answer's text and
// the reason, never the question and never who sent it (POST /api/ai/flags). It is never on the
// lab's critical path: it loads with the AI answer it sits under, and failing changes nothing.
import type { FeatureName, FlagRequest } from "@pa/api-client";
import { t } from "@pa/i18n";
import "@pa/i18n/flag";
import { Button } from "@pa/ui/components/button";
import { useId, useState } from "react";

const REASONS = ["wrong-physics", "confusing", "unsuitable", "other"] as const;
type Reason = (typeof REASONS)[number];

type State =
  | { readonly kind: "closed" }
  | { readonly kind: "open"; readonly reason: Reason; readonly failed?: string }
  | { readonly kind: "sending"; readonly reason: Reason }
  | { readonly kind: "sent" };

export interface ReportAnswerProps {
  readonly feature: FeatureName;
  readonly experimentId: string;
  readonly step?: FlagRequest["step"];
  /** The answer as the student saw it. */
  readonly reply: string;
  /** "note" for a review note; "answer" otherwise. */
  readonly what?: "answer" | "note";
}

export function ReportAnswer({
  feature,
  experimentId,
  step,
  reply,
  what = "answer",
}: ReportAnswerProps) {
  const [state, setState] = useState<State>({ kind: "closed" });
  const title = useId();

  async function send(reason: Reason) {
    setState({ kind: "sending", reason });
    const body: FlagRequest = {
      feature,
      experiment_id: experimentId,
      step: step ?? null,
      reason,
      reply: reply.slice(0, 2000),
    };
    try {
      const r = await fetch("/api/ai/flags", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (r.ok) {
        setState({ kind: "sent" });
        return;
      }
      const detail = ((await r.json().catch(() => ({}))) as { detail?: unknown }).detail;
      setState({
        kind: "open",
        reason,
        failed: typeof detail === "string" ? detail : t("ai.flag.failed"),
      });
    } catch {
      setState({ kind: "open", reason, failed: t("ai.flag.failed") });
    }
  }

  if (state.kind === "closed")
    return (
      <button
        type="button"
        className="self-start text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
        onClick={() => setState({ kind: "open", reason: "wrong-physics" })}
      >
        {what === "note" ? t("ai.flag.linkNote") : t("ai.flag.link")}
      </button>
    );
  if (state.kind === "sent")
    return (
      <div role="status" className="flex flex-col gap-1 border border-border bg-surface p-3">
        <span className="font-semibold">{t("ai.flag.thanks")}</span>
        <span className="text-sm text-muted-foreground">{t("ai.flag.thanksNote")}</span>
      </div>
    );
  const reason = state.reason;
  return (
    <div
      role="group"
      aria-labelledby={title}
      className="flex flex-col gap-2 border border-border bg-surface p-3"
    >
      <span id={title} className="font-semibold">
        {t("ai.flag.title")}
      </span>
      <div role="radiogroup" aria-label={t("ai.flag.reason")} className="flex flex-col gap-1.5">
        {REASONS.map((r) => (
          <button
            key={r}
            type="button"
            role="radio"
            aria-checked={r === reason}
            disabled={state.kind === "sending"}
            className={`min-h-9 border px-3 text-left text-sm ${
              r === reason ? "border-accent-fill bg-accent-wash" : "border-border"
            }`}
            onClick={() => setState({ kind: "open", reason: r })}
          >
            {t(`ai.flag.reason.${r}`)}
          </button>
        ))}
      </div>
      <span className="text-xs text-muted-foreground">{t("ai.flag.kept")}</span>
      {state.kind === "open" && state.failed && (
        <span role="alert" className="text-xs text-warn">
          {state.failed}
        </span>
      )}
      <div className="flex gap-2">
        <Button disabled={state.kind === "sending"} onClick={() => void send(reason)}>
          {state.kind === "sending" ? t("ai.flag.sending") : t("ai.flag.send")}
        </Button>
        <Button variant="outline" onClick={() => setState({ kind: "closed" })}>
          {t("ai.flag.cancel")}
        </Button>
      </div>
    </div>
  );
}
