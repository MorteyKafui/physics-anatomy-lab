// Content: each experiment, its version and its use. Ids, versions and topics come from
// packages/experiments; use comes from the API.
import type { ExperimentTotal } from "@pa/api-client";

import { ApiProblem, Empty, Panel } from "@/components/bits";
import { TopBar } from "@/components/topbar";
import { adminGet, staffMe } from "@/lib/api";
import { EXPERIMENTS } from "@/lib/experiments";
import { day, n } from "@/lib/format";

const TOPICS: Readonly<Record<string, string>> = {
  mechanics: "Mechanics",
  heat: "Heat",
  light: "Light",
  waves: "Waves",
  electricity: "Electricity",
  measurement: "Measurement",
  modern: "Modern physics",
};
const COLS = "minmax(220px, 2fr) minmax(180px, 1.4fr) 120px 70px 90px 90px 120px";

export default async function ContentPage() {
  const [me, r] = await Promise.all([staffMe(), adminGet<ExperimentTotal[]>("/admin/content")]);
  const top = <TopBar page="Content" environment={me.ok ? me.data.environment : null} />;
  if (!r.ok)
    return (
      <>
        {top}
        <ApiProblem status={r.status} detail={r.detail} />
      </>
    );
  return (
    <>
      {top}
      <div className="ad-body">
        <Panel
          title="Experiments"
          sub="As defined in packages/experiments, with use across all time"
        >
          <div style={{ overflowX: "auto" }}>
            <div
              role="table"
              aria-label="Experiments"
              className="ad-table"
              style={{ minWidth: 860 }}
            >
              <div role="row" className="ad-tr ad-th" style={{ gridTemplateColumns: COLS }}>
                {["Experiment", "Id", "Topic", "Version", "Attempts", "Students", "Last used"].map(
                  (h, i) => (
                    <span
                      key={h}
                      role="columnheader"
                      style={{ textAlign: i >= 3 && i <= 5 ? "right" : undefined }}
                    >
                      {h}
                    </span>
                  ),
                )}
              </div>
              {EXPERIMENTS.map((e) => {
                const use = r.data.find((u) => u.experiment_id === e.id);
                return (
                  <div
                    key={e.id}
                    role="row"
                    className="ad-tr ad-row"
                    style={{ gridTemplateColumns: COLS }}
                  >
                    <span
                      role="cell"
                      style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
                    >
                      <span
                        aria-hidden="true"
                        style={{ width: 7, height: 7, background: `var(--pa-topic-${e.topic})` }}
                      />
                      {e.title}
                      {e.flagship && (
                        <span style={{ fontSize: 12, color: "var(--pa-text-faint)" }}>
                          Flagship
                        </span>
                      )}
                    </span>
                    <span role="cell" className="ad-mono" style={{ color: "var(--pa-text-soft)" }}>
                      {e.id}
                    </span>
                    <span role="cell">{TOPICS[e.topic] ?? e.topic}</span>
                    <span role="cell" className="ad-mono" style={{ textAlign: "right" }}>
                      {e.version}
                    </span>
                    <span role="cell" className="ad-mono" style={{ textAlign: "right" }}>
                      {n(use?.attempts ?? 0)}
                    </span>
                    <span role="cell" className="ad-mono" style={{ textAlign: "right" }}>
                      {n(use?.students ?? 0)}
                    </span>
                    <span role="cell" style={{ color: "var(--pa-text-soft)" }}>
                      {use?.last_used_ms ? day(use.last_used_ms) : "–"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </Panel>
        <div className="ad-split">
          <div className="ad-wide">
            <Empty title="Status, changelog and review">
              Draft, review, pilot and live are not recorded for experiments yet, nor is a changelog
              per version. Today an experiment is in the lab once its pull request, with the physics
              reviewer&rsquo;s approval, is merged.
            </Empty>
          </div>
          <div className="ad-narrow">
            <Empty title="Feature flags and gradual rollout">
              Not set up yet. Every experiment in the lab is open to everyone.
            </Empty>
          </div>
        </div>
      </div>
    </>
  );
}
