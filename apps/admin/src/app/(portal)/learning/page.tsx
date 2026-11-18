// Learning: where students stop, the commonest mistakes, hints by skill, exam mode.
import type { Learning } from "@pa/api-client";
import Link from "next/link";

import { ApiProblem, Empty, MiniBars, Panel } from "@/components/bits";
import { ExportButton } from "@/components/export-button";
import { MistakesTable } from "@/components/mistakes";
import { StageChart } from "@/components/stage-chart";
import { TopBar } from "@/components/topbar";
import { adminGet, staffMe } from "@/lib/api";
import { EXPERIMENTS, experiment, titleOf } from "@/lib/experiments";
import { n, percent } from "@/lib/format";
import { rangeOf } from "@/lib/range";

const SKILL_NAMES: Readonly<Record<string, string>> = {
  apparatus: "Apparatus",
  measurement: "Measurement",
  tabulation: "Tabulation",
  graph: "Graph",
  analysis: "Analysis",
  writing: "Writing",
};

export default async function LearningPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const range = rangeOf(params.range);
  const chosen =
    experiment(typeof params.experiment === "string" ? params.experiment : "") ?? EXPERIMENTS[0]!;
  const [me, r] = await Promise.all([
    staffMe(),
    adminGet<Learning>(
      `/admin/learning?range=${range.id}&experiment=${encodeURIComponent(chosen.id)}`,
    ),
  ]);
  const top = (
    <TopBar
      page="Learning"
      range={range.id}
      rangeHref={(id) => `/learning?range=${id}&experiment=${chosen.id}`}
      environment={me.ok ? me.data.environment : null}
    >
      <ExportButton report="stages" range={range.id} experimentId={chosen.id} />
    </TopBar>
  );
  if (!r.ok)
    return (
      <>
        {top}
        <ApiProblem status={r.status} detail={r.detail} />
      </>
    );
  const l = r.data;
  const perExperiment = [...new Set(l.experiments.map((e) => e.experiment_id))].map((id) => {
    const rows = l.experiments.filter((e) => e.experiment_id === id);
    const exam = rows.filter((e) => e.mode === "exam");
    return {
      id,
      attempts: rows.reduce((s, e) => s + e.attempts, 0),
      hints: rows.reduce((s, e) => s + e.hints, 0),
      examAttempts: exam.reduce((s, e) => s + e.attempts, 0),
      examReports: exam.reduce((s, e) => s + e.reports, 0),
    };
  });
  const maxSkill = Math.max(1, ...l.skills.map((s) => s.hints.reduce((a, b) => a + b, 0)));

  return (
    <>
      {top}
      <div className="ad-body">
        <nav
          aria-label="Experiment"
          style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}
        >
          <span style={{ fontSize: 13, color: "var(--pa-text-muted)" }}>Experiment</span>
          <span className="ad-seg" style={{ flexWrap: "wrap" }}>
            {EXPERIMENTS.map((e) => (
              <Link
                key={e.id}
                className="ad-f"
                href={`/learning?range=${range.id}&experiment=${e.id}`}
                aria-current={e.id === chosen.id ? "true" : undefined}
                scroll={false}
              >
                {e.title}
              </Link>
            ))}
          </span>
        </nav>

        <div id="stages" className="ad-split">
          <StageChart stages={l.stages} title={chosen.title.toLowerCase()} rangeLong={range.long} />
        </div>

        <div id="mistakes">
          <Panel
            title="Most common mistakes"
            sub={`Hints the coach showed, all experiments, ${range.long.toLowerCase()}`}
            action={
              <ExportButton report="mistakes" range={range.id} label="Export CSV" primary={false} />
            }
          >
            <MistakesTable mistakes={l.mistakes} />
          </Panel>
        </div>

        <div id="skills" className="ad-split">
          <Panel
            className="ad-wide"
            title="Hints by skill"
            sub={`Each bar is one ${l.window.bucket_minutes >= 1440 ? "day" : "hour"}, ${range.long.toLowerCase()}`}
          >
            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
              {l.skills.map((s) => {
                const total = s.hints.reduce((a, b) => a + b, 0);
                return (
                  <div
                    key={s.skill}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "120px 1fr 60px",
                      gap: 12,
                      alignItems: "end",
                    }}
                  >
                    <span style={{ color: "var(--pa-text-soft)" }}>
                      {SKILL_NAMES[s.skill] ?? s.skill}
                    </span>
                    <MiniBars values={s.hints} />
                    <span
                      className="ad-mono"
                      style={{ textAlign: "right" }}
                      aria-label={`${String(total)} hints`}
                    >
                      {n(total)}
                    </span>
                    <span className="sr-only">
                      {`${SKILL_NAMES[s.skill] ?? s.skill}: ${String(total)} hints, ${percent(total, maxSkill)} of the busiest skill.`}
                    </span>
                  </div>
                );
              })}
            </div>
          </Panel>
          <Panel className="ad-narrow" title="How often hints are needed" sub={range.long}>
            <div style={{ padding: "6px 0" }}>
              {perExperiment.length === 0 && (
                <p
                  style={{
                    margin: 0,
                    padding: "8px 16px",
                    fontSize: 13,
                    color: "var(--pa-text-muted)",
                  }}
                >
                  No attempts in this range.
                </p>
              )}
              {perExperiment.map((e) => (
                <div
                  key={e.id}
                  className="ad-tr"
                  style={{ gridTemplateColumns: "1fr auto", borderTop: 0 }}
                >
                  <span>{titleOf(e.id)}</span>
                  <span className="ad-mono">
                    {e.attempts ? (e.hints / e.attempts).toFixed(1) : "–"}{" "}
                    <span style={{ color: "var(--pa-text-faint)" }}>per attempt</span>
                  </span>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <div className="ad-split">
          <Panel
            className="ad-wide"
            title="Exam mode"
            sub={`Attempts in exam mode, ${range.long.toLowerCase()}`}
          >
            <div style={{ padding: "6px 0" }}>
              {perExperiment.filter((e) => e.examAttempts > 0).length === 0 && (
                <p
                  style={{
                    margin: 0,
                    padding: "8px 16px",
                    fontSize: 13,
                    color: "var(--pa-text-muted)",
                  }}
                >
                  No exam-mode attempts in this range.
                </p>
              )}
              {perExperiment
                .filter((e) => e.examAttempts > 0)
                .map((e) => (
                  <div
                    key={e.id}
                    className="ad-tr"
                    style={{ gridTemplateColumns: "1fr auto auto", gap: 16, borderTop: 0 }}
                  >
                    <span>{titleOf(e.id)}</span>
                    <span className="ad-mono">{n(e.examAttempts)} started</span>
                    <span className="ad-mono">{n(e.examReports)} handed in</span>
                  </div>
                ))}
            </div>
          </Panel>
          <Panel className="ad-narrow" title="Score trends per skill">
            <div style={{ padding: 16 }}>
              <Empty title="Not recorded yet">
                Marks are worked out in the lab from each attempt&rsquo;s events; the server does
                not work them out yet, so there are no scores to chart. Hints by skill are shown
                instead.
              </Empty>
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
