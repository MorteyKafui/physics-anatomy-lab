// The admin AI page's Evaluations panel (design/mockups/AiAdmin.dc.html; ai-evals-brief.md,
// decision 5): each feature's latest results in this deployment, against the bar.
import type { EvalSummary } from "@pa/api-client";

import { day } from "@/lib/format";
import { FEATURE_NAMES } from "@/lib/ai";

import { Chip } from "./bits";

const row = {
  display: "grid",
  gridTemplateColumns: "150px minmax(80px, 1fr) 56px 110px",
  gap: 12,
  alignItems: "center",
  padding: "10px 16px",
  borderTop: "1px solid var(--pa-ink-800)",
} as const;

export function Evaluations({ evaluations }: { evaluations: readonly EvalSummary[] }) {
  const run = evaluations.filter((e) => e.run_at !== null);
  const last = run
    .map((e) => e.run_at ?? "")
    .sort()
    .at(-1);
  const failing = evaluations.flatMap((e) => e.failing.map((f) => ({ ...f, feature: e.feature })));
  return (
    <>
      {run.length === 0 && (
        <p style={{ margin: 0, padding: "12px 16px", fontSize: 13, color: "var(--pa-text-muted)" }}>
          Not run yet: the evaluation key is not set. Every pull request still checks that the cases
          are well formed.
        </p>
      )}
      {run.map((e) => {
        const rate = e.rate ?? 0;
        const good = e.passed === true;
        return (
          <div key={e.feature} style={row}>
            <span>{FEATURE_NAMES[e.feature]}</span>
            <span
              className="ad-track"
              role="img"
              aria-label={`${FEATURE_NAMES[e.feature]}: ${String(Math.round(rate * 100))}% of rubric lines pass, bar ${String(Math.round(e.bar * 100))}%`}
              style={{ display: "block", height: 6, position: "relative" }}
            >
              <span
                style={{
                  position: "absolute",
                  inset: "0 auto 0 0",
                  width: `${String(Math.round(rate * 100))}%`,
                  background: good ? "var(--pa-ok-fg)" : "var(--pa-danger-fg)",
                }}
              />
            </span>
            <span className="ad-mono" style={{ textAlign: "right" }}>
              {Math.round(rate * 100)}%
            </span>
            <span style={{ justifySelf: "end" }}>
              <Chip kind={good ? "green" : "red"}>{good ? "Passing" : "Below the bar"}</Chip>
            </span>
          </div>
        );
      })}
      {failing.map((f) => (
        <div
          key={`${f.feature}/${f.id}`}
          style={{
            display: "flex",
            gap: 12,
            alignItems: "flex-start",
            padding: "12px 16px",
            borderTop: "1px solid var(--pa-ink-800)",
          }}
        >
          <Chip kind="red">Failed</Chip>
          <span style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <span className="ad-mono" style={{ fontSize: 12 }}>
              {f.feature}/{f.id}
            </span>
            <span className="ad-sub">{f.why}</span>
          </span>
        </div>
      ))}
      <span
        className="ad-sub"
        style={{ padding: "10px 16px", borderTop: "1px solid var(--pa-ink-800)" }}
      >
        The bar: every safety case passes, and 90% of rubric lines for each feature. Runs when a
        prompt changes, and weekly.
        {last && ` Last run ${day(last)}.`}
      </span>
    </>
  );
}
