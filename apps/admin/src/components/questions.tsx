"use client";

// The Question bank (design/mockups/Questions.dc.html, "Admin: …"; ai-questions-brief.md):
// questions teachers drafted with Claude and sent for review. The drawer has one main action,
// Approve, with Edit and Reject; each decision is in the audit log and can be undone.
import type { QuestionReview } from "@pa/api-client";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { approveQuestion, rejectQuestion, reopenQuestion } from "@/app/actions";
import { experiment } from "@/lib/experiments";
import { day } from "@/lib/format";

import { Chip, Empty, type ChipKind } from "./bits";
import { Drawer, DrawerRows, DrawerRule, DrawerSection } from "./drawer";
import { useToast } from "./toast";

const COLS = "minmax(260px, 3fr) minmax(130px, 1.2fr) minmax(160px, 1.4fr) 90px 110px";
const STATE: Record<QuestionReview["state"], { text: string; kind: ChipKind }> = {
  submitted: { text: "Waiting", kind: "amber" },
  approved: { text: "Approved", kind: "green" },
  rejected: { text: "Not approved", kind: "red" },
};
const TOPIC: Record<string, string> = {
  measuring: "measuring",
  precautions: "precautions",
  tabulation: "the table",
  graph: "the graph",
  calculation: "the calculation",
  theory: "the theory",
};
const title = (id: string) => experiment(id)?.title ?? id;
const marks = (m: number) => (m === 1 ? "1 mark" : `${String(m)} marks`);

type Mode = "view" | "edit" | "reject";

export function QuestionBank({ questions }: { questions: readonly QuestionReview[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("view");
  const [edit, setEdit] = useState({ question: "", answer: "", marks: 1 });
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const router = useRouter();
  const chosen = questions.find((q) => q.id === openId);

  function open(q: QuestionReview) {
    setOpenId(q.id);
    setMode("view");
    setEdit({ question: q.question, answer: q.answer, marks: q.marks });
    setReason("");
  }

  async function undo(q: QuestionReview) {
    const r = await reopenQuestion(q.id);
    router.refresh();
    toast(r.ok ? { text: "Undone. It waits for review again." } : { text: r.detail, failed: true });
  }

  async function decide(q: QuestionReview) {
    setBusy(true);
    const r =
      mode === "reject"
        ? await rejectQuestion(q.id, reason.trim())
        : await approveQuestion(q.id, mode === "edit" ? edit : undefined);
    setBusy(false);
    if (!r.ok) {
      toast({ text: r.detail, failed: true });
      return;
    }
    setOpenId(null);
    router.refresh();
    toast({
      text:
        mode === "reject"
          ? "Not approved. The teacher sees your reason."
          : `Approved. It joins exam mode for the ${title(q.experiment_id).toLowerCase()}.`,
      undo: () => void undo(r.data),
    });
  }

  if (questions.length === 0)
    return (
      <div style={{ padding: 16 }}>
        <Empty title="Nothing here">
          Questions appear here when a teacher sends them for review.
        </Empty>
      </div>
    );

  const field = { width: "100%", boxSizing: "border-box" as const };
  return (
    <>
      <div style={{ overflowX: "auto" }}>
        <div role="table" aria-label="Questions" className="ad-table" style={{ minWidth: 760 }}>
          <div role="row" className="ad-tr ad-th" style={{ gridTemplateColumns: COLS }}>
            {["Question", "Experiment", "Sent by", "Sent", "State"].map((h) => (
              <span key={h} role="columnheader">
                {h}
              </span>
            ))}
          </div>
          {questions.map((q) => (
            <div
              key={q.id}
              role="row"
              className="ad-tr ad-row"
              style={{ gridTemplateColumns: COLS }}
            >
              <span role="cell" style={{ minWidth: 0 }}>
                <button
                  type="button"
                  className="ad-f"
                  onClick={() => open(q)}
                  style={{
                    background: "transparent",
                    border: 0,
                    color: "var(--pa-text)",
                    font: "inherit",
                    textAlign: "left",
                    cursor: "pointer",
                    padding: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    maxWidth: "100%",
                  }}
                >
                  {q.question}
                </button>
              </span>
              <span role="cell" style={{ color: "var(--pa-text-soft)" }}>
                {title(q.experiment_id)}
              </span>
              <span
                role="cell"
                style={{
                  color: "var(--pa-text-soft)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {q.submitted_by ?? "Account deleted"}
              </span>
              <span role="cell" className="ad-mono">
                {day(q.submitted_at)}
              </span>
              <span role="cell">
                <Chip kind={STATE[q.state].kind}>{STATE[q.state].text}</Chip>
              </span>
            </div>
          ))}
        </div>
      </div>
      <Drawer
        open={!!chosen}
        onClose={() => setOpenId(null)}
        title="Review a question"
        {...(chosen ? { chip: STATE[chosen.state] } : {})}
        action={
          chosen && chosen.state === "submitted" ? (
            <>
              {mode !== "reject" && (
                <button
                  type="button"
                  className="ad-f ad-btn ad-button"
                  style={{ height: 34 }}
                  onClick={() => setMode("reject")}
                >
                  Reject
                </button>
              )}
              {mode === "view" && (
                <button
                  type="button"
                  className="ad-f ad-btn ad-button"
                  style={{ height: 34 }}
                  onClick={() => setMode("edit")}
                >
                  Edit
                </button>
              )}
              <button
                type="button"
                className="ad-f ad-primary"
                disabled={busy || (mode === "reject" && reason.trim() === "")}
                onClick={() => void decide(chosen)}
              >
                {mode === "reject"
                  ? "Reject with this reason"
                  : mode === "edit"
                    ? "Save and approve"
                    : "Approve"}
              </button>
            </>
          ) : undefined
        }
      >
        {chosen && (
          <>
            <DrawerRows
              rows={[
                [
                  "Experiment",
                  `${title(chosen.experiment_id)} · ${TOPIC[chosen.topic] ?? chosen.topic}`,
                ],
                ["Sent by", chosen.submitted_by ?? "Account deleted"],
                ["Drafted by", "Claude, edited by the teacher"],
                ["Sent", day(chosen.submitted_at)],
                ...(chosen.reviewed_by ? ([["Reviewed by", chosen.reviewed_by]] as const) : []),
              ]}
            />
            {mode === "edit" ? (
              <>
                <label
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    fontSize: 12,
                    color: "var(--pa-text-faint)",
                  }}
                >
                  Question
                  <textarea
                    className="ad-f ad-input"
                    rows={3}
                    style={field}
                    value={edit.question}
                    onChange={(e) => setEdit({ ...edit, question: e.target.value })}
                  />
                </label>
                <label
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    fontSize: 12,
                    color: "var(--pa-text-faint)",
                  }}
                >
                  Model answer
                  <textarea
                    className="ad-f ad-input"
                    rows={4}
                    style={field}
                    value={edit.answer}
                    onChange={(e) => setEdit({ ...edit, answer: e.target.value })}
                  />
                </label>
                <label
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    fontSize: 12,
                    color: "var(--pa-text-faint)",
                  }}
                >
                  Marks
                  <input
                    className="ad-f ad-input ad-mono"
                    type="number"
                    min={1}
                    max={4}
                    style={{ width: 80 }}
                    value={edit.marks}
                    onChange={(e) => setEdit({ ...edit, marks: Number(e.target.value) })}
                  />
                </label>
              </>
            ) : (
              <>
                <DrawerSection label={`Question · ${marks(chosen.marks)}`}>
                  {chosen.question}
                </DrawerSection>
                <DrawerSection label="Model answer">{chosen.answer}</DrawerSection>
              </>
            )}
            {mode === "reject" && (
              <label
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  fontSize: 12,
                  color: "var(--pa-text-faint)",
                }}
              >
                Why it is not going in the bank (the teacher sees this)
                <textarea
                  className="ad-f ad-input"
                  rows={3}
                  maxLength={300}
                  style={field}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </label>
            )}
            {chosen.reason && <DrawerSection label="Reason given">{chosen.reason}</DrawerSection>}
            <DrawerRule>
              Approved questions join exam mode for everyone using this experiment.
            </DrawerRule>
          </>
        )}
      </Drawer>
    </>
  );
}
