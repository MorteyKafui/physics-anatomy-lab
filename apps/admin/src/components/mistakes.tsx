// The commonest mistakes: the coach's hints, by how many students needed each one.
import type { Mistake } from "@pa/api-client";

import { experiment, mistakeName, titleOf } from "@/lib/experiments";
import { n } from "@/lib/format";

import { Empty } from "./bits";

const COLUMNS = "minmax(220px, 2.2fr) minmax(110px, 1fr) 80px 100px 120px";
const SKILLS: Readonly<Record<string, string>> = {
  apparatus: "Apparatus",
  measurement: "Measurement",
  tabulation: "Tabulation",
  graph: "Graph",
  analysis: "Analysis",
  writing: "Writing",
};

export function MistakesTable({ mistakes }: { mistakes: readonly Mistake[] }) {
  if (mistakes.length === 0)
    return (
      <div style={{ padding: 16 }}>
        <Empty title="No hints shown in this range">
          Mistakes appear once students in a class sync attempts in which the coach gave a hint.
        </Empty>
      </div>
    );
  return (
    <div style={{ overflowX: "auto" }}>
      <div role="table" aria-label="Most common mistakes" className="ad-table" style={{ minWidth: 680 }}>
        <div role="row" className="ad-tr ad-th" style={{ gridTemplateColumns: COLUMNS }}>
          <span role="columnheader">Mistake</span>
          <span role="columnheader">Experiment</span>
          <span role="columnheader" style={{ textAlign: "right" }}>
            Students
          </span>
          <span role="columnheader" style={{ textAlign: "right" }}>
            Hints shown
          </span>
          <span role="columnheader">Skill</span>
        </div>
        {mistakes.map((m) => {
          const e = experiment(m.experiment_id);
          return (
            <div
              key={`${m.experiment_id}-${m.hint}-${m.rule ?? ""}`}
              role="row"
              className="ad-tr ad-row"
              style={{ gridTemplateColumns: COLUMNS }}
            >
              <span role="cell" title={m.rule ?? m.hint}>
                {mistakeName(m.hint)}
              </span>
              <span
                role="cell"
                style={{ color: "var(--pa-text-soft)", display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 7,
                    height: 7,
                    flex: "0 0 auto",
                    background: e ? `var(--pa-topic-${e.topic})` : "var(--pa-text-faint)",
                  }}
                />
                {titleOf(m.experiment_id)}
              </span>
              <span role="cell" className="ad-mono" style={{ textAlign: "right" }}>
                {n(m.students)}
              </span>
              <span role="cell" className="ad-mono" style={{ textAlign: "right" }}>
                {n(m.hints)}
              </span>
              <span role="cell" style={{ color: "var(--pa-text-soft)" }}>
                {m.skill ? (SKILLS[m.skill] ?? m.skill) : "–"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
