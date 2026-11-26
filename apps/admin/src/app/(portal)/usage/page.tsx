// Usage: anonymous counts from the lab (ADR 0048): visitors, the most-used experiments, where
// people stop, exports and devices. Read from usage_events, never from synced attempts.
import type { Usage, UsageCount, UsageExperiment } from "@pa/api-client";

import { ApiProblem, Empty, Panel, Ring, SegBar, Spark, Tile } from "@/components/bits";
import { TopBar } from "@/components/topbar";
import { adminGet, staffMe } from "@/lib/api";
import { EXPERIMENTS, experiment, titleOf } from "@/lib/experiments";
import { n, percent } from "@/lib/format";
import { rangeOf } from "@/lib/range";
import { STEPS, stepName } from "@/lib/steps";

const FORMATS: Readonly<Record<string, string>> = {
  pdf: "PDF report",
  docx: "Word report",
  figures: "Figures",
  data: "Data",
};
const DEVICES = [
  { key: "phone", label: "Phone", colour: "var(--pa-accent)" },
  { key: "tablet", label: "Tablet", colour: "var(--pa-warn)" },
  { key: "desktop", label: "Desktop", colour: "var(--pa-ok)" },
] as const;

const colourOf = (id: string) => {
  const e = experiment(id);
  return e ? `var(--pa-topic-${e.topic})` : "var(--pa-ok)";
};
const countOf = (rows: readonly UsageCount[], key: string) =>
  rows.find((r) => r.key === key)?.n ?? 0;

function Number({ value, note }: { value: number; note?: string }) {
  return (
    <span style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
      <span className="ad-big">{n(value)}</span>
      {note && <span style={{ fontSize: 13, color: "var(--pa-text-faint)" }}>{note}</span>}
    </span>
  );
}

function Header({ cols, cells }: { cols: string; cells: readonly string[] }) {
  return (
    <div role="row" className="ad-tr ad-th" style={{ gridTemplateColumns: cols }}>
      {cells.map((h, i) => (
        <span key={h} role="columnheader" style={{ textAlign: i > 0 ? "right" : undefined }}>
          {h}
        </span>
      ))}
    </div>
  );
}

function Ranked({ rows }: { rows: readonly UsageExperiment[] }) {
  const cols = "minmax(200px, 2fr) repeat(4, minmax(80px, 1fr)) 120px";
  return (
    <div style={{ overflowX: "auto" }}>
      <div
        role="table"
        aria-label="Most-used experiments"
        className="ad-table"
        style={{ minWidth: 720 }}
      >
        <Header
          cols={cols}
          cells={[
            "Experiment",
            "Opens",
            "Visitors",
            "Reached the report",
            "Completed",
            "Completion",
          ]}
        />
        {rows.map((row) => (
          <div
            key={row.experiment_id}
            role="row"
            className="ad-tr ad-row"
            style={{ gridTemplateColumns: cols }}
          >
            <span role="cell">{titleOf(row.experiment_id)}</span>
            {[row.opens, row.visitors, row.reached_report, row.completed].map((v, i) => (
              <span key={i} role="cell" className="ad-mono" style={{ textAlign: "right" }}>
                {n(v)}
              </span>
            ))}
            <span
              role="cell"
              className="ad-mono"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: 8,
              }}
            >
              <Ring
                share={row.visitors ? row.completed / row.visitors : null}
                colour={colourOf(row.experiment_id)}
              />
              {percent(row.completed, row.visitors)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Steps({ u }: { u: Usage }) {
  const opened = u.experiments.filter((e) => e.visitors > 0);
  const cols = `minmax(180px, 2fr) repeat(${String(STEPS.length)}, minmax(64px, 1fr))`;
  return (
    <div style={{ overflowX: "auto" }}>
      <div
        role="table"
        aria-label="Where people stop"
        className="ad-table"
        style={{ minWidth: 900 }}
      >
        <Header cols={cols} cells={["Experiment", ...STEPS.map(stepName)]} />
        {opened.map((e) => (
          <div
            key={e.experiment_id}
            role="row"
            className="ad-tr ad-row"
            style={{ gridTemplateColumns: cols }}
          >
            <span role="cell">
              {titleOf(e.experiment_id)}
              <span style={{ color: "var(--pa-text-faint)" }}> ({n(e.visitors)})</span>
            </span>
            {STEPS.map((step) => {
              const done =
                u.steps.find((s) => s.experiment_id === e.experiment_id && s.step === step)
                  ?.visitors ?? 0;
              const share = Math.min(1, done / e.visitors);
              return (
                <span
                  key={step}
                  role="cell"
                  className="ad-mono"
                  title={`${n(done)} of ${n(e.visitors)} visitors finished ${stepName(step)}`}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    gap: 4,
                  }}
                >
                  {percent(Math.min(done, e.visitors), e.visitors)}
                  <span
                    aria-hidden="true"
                    style={{ width: "100%", height: 4, background: "var(--pa-ink-800)" }}
                  >
                    <span
                      style={{
                        display: "block",
                        height: 4,
                        width: `${(share * 100).toFixed(1)}%`,
                        background: colourOf(e.experiment_id),
                      }}
                    />
                  </span>
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
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
  const reached = u.experiments.reduce((s, e) => s + e.reached_report, 0);
  const completed = u.experiments.reduce((s, e) => s + e.completed, 0);
  const exports = u.exports.reduce((s, e) => s + e.n, 0);
  const nothing = (
    <div style={{ padding: 16 }}>
      <Empty title="Nothing counted in this range">
        Counts arrive when someone opens an experiment in the lab with a connection. Browsers with
        Do Not Track or Global Privacy Control send nothing.
      </Empty>
    </div>
  );

  return (
    <>
      {top}
      <div className="ad-body">
        <p style={{ margin: 0, fontSize: 13, color: "var(--pa-text-soft)" }}>
          Anonymous counts. A visitor gets a new id every day, so returning visitors are counted
          again.
        </p>
        <div className="ad-tiles">
          <Tile title="Visitors" when={range.long} href="#devices" link="Devices">
            <Number value={u.visitors} note="day ids" />
            <Spark values={u.visitors_series} />
          </Tile>
          <Tile
            title="Experiments opened"
            when={range.long}
            href="#experiments"
            link="By experiment"
          >
            <Number value={u.opens} />
            <Spark values={u.opens_series} />
          </Tile>
          <Tile title="Reached the report" when={range.long} href="#steps" link="Where people stop">
            <Number value={reached} note="visitors" />
          </Tile>
          <Tile title="Completed" when={range.long} href="#experiments" link="Completion">
            <Number value={completed} note="visitors" />
          </Tile>
        </div>

        <div id="experiments">
          <Panel
            title="Most-used experiments"
            sub={`By opens in the ${range.long.toLowerCase()}. Reached the report and completed count visitors.`}
          >
            {u.experiments.length === 0 ? nothing : <Ranked rows={u.experiments} />}
          </Panel>
        </div>

        <div id="steps">
          <Panel
            title="Where people stop"
            sub="The share of visitors who opened an experiment and finished each step"
          >
            {u.experiments.length === 0 ? nothing : <Steps u={u} />}
          </Panel>
        </div>

        <div className="ad-split">
          <div className="ad-narrow" id="exports">
            <Panel title="Exports by format" sub={`${n(exports)} report downloads`}>
              <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                {Object.entries(FORMATS).map(([key, label]) => (
                  <span key={key} style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--pa-text-soft)" }}>{label}</span>
                    <span className="ad-mono">{n(countOf(u.exports, key))}</span>
                  </span>
                ))}
              </div>
            </Panel>
          </div>
          <div className="ad-narrow" id="devices">
            <Panel title="Devices by class" sub="Visitors, by screen width">
              <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                <SegBar
                  parts={DEVICES.map((d) => ({
                    label: d.label,
                    value: countOf(u.devices, d.key),
                    colour: d.colour,
                  }))}
                />
              </div>
            </Panel>
          </div>
        </div>
        <p style={{ margin: 0, fontSize: 12, color: "var(--pa-text-faint)" }}>
          {EXPERIMENTS.length} experiments in the lab. No names, readings, addresses or cookies:
          each event carries the experiment, the step, mode or export format, a device class, the
          app version and the day&apos;s id. Events are deleted after 13 months.
        </p>
      </div>
    </>
  );
}
