"use client";

// Flagged replies (design/mockups/AiAdmin.dc.html; ai-evals-brief.md, decision 6): answers a
// student or teacher reported, with the reason. Dismiss is audited, with undo; "Make a case"
// copies a draft evaluation case, for a pull request, with nothing that links it to the flag.
import type { AiFlagRow } from "@pa/api-client";
import { useRouter } from "next/navigation";

import { setAiFlag } from "@/app/actions";
import { FEATURE_NAMES } from "@/lib/ai";
import { when } from "@/lib/format";
import { stepName } from "@/lib/steps";
import { titleOf } from "@/lib/experiments";

import { Chip } from "./bits";
import { useToast } from "./toast";

const REASONS: Readonly<Record<AiFlagRow["reason"], string>> = {
  "wrong-physics": "Wrong physics",
  confusing: "Confusing",
  unsuitable: "Unkind or unsuitable",
  other: "Something else",
};

/** A draft case for apps/api/evals/cases: the question and rubric are for staff to write. */
export function draftCase(f: AiFlagRow): string {
  const quoted = (s: string) => JSON.stringify(s);
  return [
    `# From a flagged reply (${REASONS[f.reason]}). Write the question and the rubric.`,
    `# The reply that was reported: ${quoted(f.reply)}`,
    "[[case]]",
    'id = "flagged-…"',
    ...(f.step ? [`step = ${quoted(f.step)}`] : []),
    'question = "…"',
    "rubric = [",
    '  "…",',
    "]",
  ].join("\n");
}

export function AiFlags({ flags, open }: { flags: readonly AiFlagRow[]; open: number }) {
  const toast = useToast();
  const router = useRouter();

  async function dismiss(f: AiFlagRow, undo = false) {
    const r = await setAiFlag(f.id, !undo, undo ? "Undo" : undefined);
    if (!r.ok) {
      toast({ text: r.detail, failed: true });
      return;
    }
    router.refresh();
    toast({
      text: undo ? "Flag restored." : "Flag dismissed. Recorded in the audit log.",
      ...(undo ? {} : { undo: () => void dismiss(f, true) }),
    });
  }

  async function makeCase(f: AiFlagRow) {
    try {
      await navigator.clipboard.writeText(draftCase(f));
      toast({ text: "Draft case copied. Add it to apps/api/evals/cases in a pull request." });
    } catch {
      toast({ text: "The draft case could not be copied.", failed: true });
    }
  }

  const button = { height: 30 } as const;
  return (
    <>
      {flags.length === 0 && (
        <p style={{ margin: 0, padding: "12px 16px", fontSize: 13, color: "var(--pa-text-muted)" }}>
          No flagged replies. Students and teachers can report an answer from the tutor, what if and
          report review.
        </p>
      )}
      {flags.map((f) => (
        <div
          key={f.id}
          style={{
            display: "flex",
            gap: 12,
            alignItems: "flex-start",
            padding: "12px 16px",
            borderTop: "1px solid var(--pa-ink-800)",
            flexWrap: "wrap",
          }}
        >
          <Chip kind="amber">{REASONS[f.reason]}</Chip>
          <span style={{ flex: "1 1 240px", display: "flex", flexDirection: "column", gap: 2 }}>
            <span>“{f.reply}”</span>
            <span className="ad-sub">
              {[
                FEATURE_NAMES[f.feature],
                titleOf(f.experiment_id),
                f.step ? stepName(f.step) : null,
              ]
                .filter(Boolean)
                .join(" · ")}{" "}
              · {when(f.at)}
            </span>
          </span>
          <span style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              className="ad-f ad-btn ad-button"
              style={button}
              onClick={() => void makeCase(f)}
            >
              Make a case
            </button>
            <button
              type="button"
              className="ad-f ad-btn ad-button"
              style={button}
              onClick={() => void dismiss(f)}
            >
              Dismiss
            </button>
          </span>
        </div>
      ))}
      <span
        className="ad-sub"
        style={{ padding: "10px 16px", borderTop: "1px solid var(--pa-ink-800)" }}
      >
        {open > flags.length
          ? `Showing the newest ${String(flags.length)} of ${String(open)}. `
          : ""}
        A flag keeps the reply and the reason, never the question or who sent it. Kept 90 days.
      </span>
    </>
  );
}
