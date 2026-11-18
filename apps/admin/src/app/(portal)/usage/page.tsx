// Usage: most-used experiments, time per step, devices (master plan, admin portal table).
import type { ExperimentUse, Usage } from "@pa/api-client";

import { ApiProblem, Empty, Panel, Ring, Tile } from "@/components/bits";
import { TopBar } from "@/components/topbar";
import { adminGet, staffMe } from "@/lib/api";
import { EXPERIMENTS, experiment, titleOf } from "@/lib/experiments";
import { n, percent } from "@/lib/format";
import { rangeOf } from "@/lib/range";
import { STEPS, stepName } from "@/lib/steps";

const MODES = ["guided", "exam", "own-data"] as const;

function byExperiment(rows: readonly ExperimentUse[]) {
  const ids = [...new Set(rows.map((r) => r.experiment_id))];
  return ids
    .map((id) => {
      const mine = rows.filter((r) => r.experiment_id === id);
      const sum = (pick: (r: ExperimentUse) => number) => mine.reduce((s, r) => s + pick(r), 0);
      const mode = Object.fromEntries(
        MODES.map((m) => [m, mine.filter((r) => r.mode === m).reduce((s, r) => s + r.attempts, 0)]),
      ) as Record<(typeof MODES)[number], number>;
      return { id, attempts: sum((r) => r.attempts), reports: sum((r) => r.reports), mode };
    })
    .sort((a, b) => b.attempts - a.attempts);
}

export default async function UsagePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const range = rangeOf((await searchParams).range);
  const [me, r] = await Promise.all([staffMe(), adminGet<Usage>(`/admin/usage?range=${range.id}`)]);
  const top = (
    <TopBar
      page="Usage"
      range={range.id}
      rangeHref={(id) => `/usage?range=${id}`}
      environment={me.ok ? me.data.environment : null}
    />
  );
  if (!r.ok)
    return (
      <>
        {top}
        <ApiProblem status={r.status} detail={r.detail} />
      </>
    );
  const u = r.data;
  const table = byExperiment(u.experiments);
  const total = (pick: (r: ExperimentUse) => number) =>
    u.experiments.reduce((s, row) => s + pick(row), 0);
  const attempts = total((x) => x.attempts);
  const reports = total((x) => x.reports);
  const exam = total((x) => (x.mode === "exam" ? x.attempts : 0));
  const multi = total((x) => x.multi_device);
  const timed = [...new Set(u.step_minutes.map((t) => t.experiment_id))];
  const cols = `minmax(200px, 2fr) repeat(5, minmax(70px, 1fr)) 110px`;

  return (
    <>
      {top}
      <div className="ad-body">
        <div className="ad-tiles">
          <Tile title="Attempts started" when={range.long} href="#experiments" link="By experiment">
            <span className="ad-big">{n(attempts)}</span>
          </Tile>
          <Tile title="Reached the report" when={range.long} href="#experiments" link="Completion">
            <span style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span className="ad-big">{n(reports)}</span>
              <span style={{ fontSize: 13, color: "var(--pa-text-faint)" }}>
                {percent(reports, attempts)} of attempts
              </span>
            </span>
          </Tile>
          <Tile title="Exam mode" when={range.long} href="/learning" link="View learning">
            <span className="ad-big">{n(exam)}</span>
          </Tile>
          <Tile title="On a second device" when={range.long} href="#devices" link="Devices">
            <span style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span className="ad-big">{n(multi)}</span>
              <span style={{ fontSize: 13, color: "var(--pa-text-faint)" }}>attempts</span>
            </span>
          </Tile>
        </div>

        <div id="experiments">
          <Panel
            title="Most-used experiments"
            sub={`Attempts started in the ${range.long.toLowerCase()}, by students in classes and signed-in teachers`}
          >
            {table.length === 0 ? (
              <div style={{ padding: 16 }}>
                <Empty title="No attempts in this range">
                  Attempts appear here once a signed-in student or teacher syncs one. Signed-out
                  work stays on the device and is not counted.
                </Empty>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <div
                  role="table"
                  aria-label="Most-used experiments"
                  className="ad-table"
                  style={{ minWidth: 720 }}
                >
                  <div role="row" className="ad-tr ad-th" style={{ gridTemplateColumns: cols }}>
                    {[
                      "Experiment",
                      "Attempts",
                      "Guided",
                      "Exam",
                      "Own data",
                      "Reports",
                      "Completion",
                    ].map((h, i) => (
                      <span
                        key={h}
                        role="columnheader"
                        style={{ textAlign: i > 0 && i < 6 ? "right" : undefined }}
                      >
                        {h}
                      </span>
                    ))}
                  </div>
                  {table.map((row) => {
                    const e = experiment(row.id);
                    return (
                      <div
                        key={row.id}
                        role="row"
                        className="ad-tr ad-row"
                        style={{ gridTemplateColumns: cols }}
                      >
                        <span role="cell">{titleOf(row.id)}</span>
                        {[
                          row.attempts,
                          row.mode.guided,
                          row.mode.exam,
                          row.mode["own-data"],
                          row.reports,
                        ].map((v, i) => (
                          <span
                            key={i}
                            role="cell"
                            className="ad-mono"
                            style={{ textAlign: "right" }}
                          >
                            {n(v)}
                          </span>
                        ))}
                        <span
                          role="cell"
                          className="ad-mono"
                          style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
                        >
                          <Ring
                            share={row.attempts ? row.reports / row.attempts : null}
                            colour={e ? `var(--pa-topic-${e.topic})` : "var(--pa-ok)"}
                          />
                          {percent(row.reports, row.attempts)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Panel>
        </div>

        <div id="steps">
          <Panel
            title="Time per step"
            sub="Median minutes from finishing one step to finishing the next, by the device's clock"
          >
            {timed.length === 0 ? (
              <div style={{ padding: 16 }}>
                <Empty title="No finished steps in this range">
                  Times appear once synced attempts have finished steps.
                </Empty>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <div
                  role="table"
                  aria-label="Time per step"
                  className="ad-table"
                  style={{ minWidth: 560 }}
                >
                  <div
                    role="row"
                    className="ad-tr ad-th"
                    style={{
                      gridTemplateColumns: `120px repeat(${String(timed.length)}, minmax(120px, 1fr))`,
                    }}
                  >
                    <span role="columnheader">Step</span>
                    {timed.map((id) => (
                      <span key={id} role="columnheader" style={{ textAlign: "right" }}>
                        {titleOf(id)}
                      </span>
                    ))}
                  </div>
                  {STEPS.map((step) => (
                    <div
                      key={step}
                      role="row"
                      className="ad-tr ad-row"
                      style={{
                        gridTemplateColumns: `120px repeat(${String(timed.length)}, minmax(120px, 1fr))`,
                      }}
                    >
                      <span role="cell">{stepName(step)}</span>
                      {timed.map((id) => {
                        const t = u.step_minutes.find(
                          (x) => x.experiment_id === id && x.step === step,
                        );
                        return (
                          <span
                            key={id}
                            role="cell"
                            className="ad-mono"
                            style={{ textAlign: "right" }}
                          >
                            {t ? `${t.minutes.toFixed(1)} min` : "–"}
                            {t && (
                              <span style={{ color: "var(--pa-text-faint)" }}> ({n(t.n)})</span>
                            )}
                          </span>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Panel>
        </div>

        <div id="devices">
          <Panel title="Devices and connections">
            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
              <span style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--pa-text-soft)" }}>
                  Attempts continued on a second device
                </span>
                <span className="ad-mono">{n(multi)}</span>
              </span>
              <Empty title="Device types, connection speeds, offline and online use">
                Not recorded. Attempts carry only a random device id, never the kind of device.
                These need product analytics (PostHog in the plan), which is not set up yet.
              </Empty>
            </div>
          </Panel>
        </div>
        <p style={{ margin: 0, fontSize: 12, color: "var(--pa-text-faint)" }}>
          {EXPERIMENTS.length} experiments in the lab. Students who work signed out are not counted:
          the lab works without an account (ADR 0011).
        </p>
      </div>
    </>
  );
}
