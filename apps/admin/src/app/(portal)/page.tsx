// Overview (master plan, "Dashboards and the admin portal"): the rebuild of Admin.dc.html.
import type { Overview } from "@pa/api-client";

import { Attention } from "@/components/attention";
import { ApiProblem, Panel, SegBar, Spark, Tile } from "@/components/bits";
import { ExportButton } from "@/components/export-button";
import { MistakesTable } from "@/components/mistakes";
import { StageChart } from "@/components/stage-chart";
import { TopBar } from "@/components/topbar";
import { adminGet, staffMe } from "@/lib/api";
import { titleOf } from "@/lib/experiments";
import { bytes, n } from "@/lib/format";
import { rangeOf } from "@/lib/range";

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const range = rangeOf((await searchParams).range);
  const [me, r] = await Promise.all([
    staffMe(),
    adminGet<Overview>(`/admin/overview?range=${range.id}`),
  ]);
  const top = (
    <TopBar
      page="Overview"
      range={range.id}
      rangeHref={(id) => `/?range=${id}`}
      environment={me.ok ? me.data.environment : null}
    >
      <ExportButton report="mistakes" range={range.id} />
    </TopBar>
  );
  if (!r.ok)
    return (
      <>
        {top}
        <ApiProblem status={r.status} detail={r.detail} />
      </>
    );
  const o = r.data;
  const inactive = o.students.members - o.students.active_30_days;
  const reports = o.reports.reduce((s, v) => s + v, 0);

  return (
    <>
      {top}
      <div className="ad-body">
        <div className="ad-tiles">
          <Tile title="Active students" when="30 days" href="/usage" link="View usage">
            <span style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <span className="ad-big">{n(o.students.active_30_days)}</span>
              <span style={{ fontSize: 13, color: "var(--pa-text-faint)" }}>
                of {n(o.students.members)} in classes
              </span>
            </span>
            <SegBar
              parts={[
                { label: "Active", value: o.students.active_30_days, colour: "var(--pa-ok)" },
                { label: "Not active", value: inactive, colour: "var(--pa-dash-quiet)" },
              ]}
            />
          </Tile>
          <Tile title="Classes" when="Now" href="/people" link="Review AI settings">
            <span style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span className="ad-big">{n(o.classes.total)}</span>
              {o.classes.total > 0 && (
                <span style={{ fontSize: 13, color: "var(--pa-text-faint)" }}>
                  {n(Math.round(o.students.members / o.classes.total))} students each, on average
                </span>
              )}
            </span>
            <SegBar
              parts={[
                { label: "AI on", value: o.classes.ai_on, colour: "var(--pa-topic-light)" },
                {
                  label: "AI off",
                  value: o.classes.total - o.classes.ai_on,
                  colour: "var(--pa-dash-quiet)",
                },
              ]}
            />
          </Tile>
          <Tile title="Reports finished" when={range.long} href="/learning" link="View learning">
            <span className="ad-big">{n(reports)}</span>
            <Spark values={o.reports} />
          </Tile>
          <Tile title="Failed syncs" when="14 days" href="/system" link="View sync log">
            <span className="ad-big" style={{ color: "var(--pa-text-faint)" }}>
              –
            </span>
            <span style={{ fontSize: 12, color: "var(--pa-text-muted)" }}>
              Not recorded yet. Devices keep work that has not synced; the server sees only what
              arrives.
            </span>
          </Tile>
        </div>

        <div className="ad-split">
          <StageChart
            stages={o.stages}
            title={titleOf(o.stages_experiment).toLowerCase()}
            rangeLong={range.long}
          />
          <Attention flagged={o.flagged_names} />
        </div>

        <div className="ad-split">
          <Panel
            className="ad-wide"
            title="Most common mistakes"
            sub={`Hints the coach showed, all experiments, ${range.long.toLowerCase()}`}
            action={
              <ExportButton report="mistakes" range={range.id} label="Export CSV" primary={false} />
            }
          >
            <MistakesTable mistakes={o.mistakes} />
          </Panel>
          <Panel
            className="ad-narrow"
            title="System health"
            action={
              <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--pa-text-muted)" }}>
                <span className="ad-dot" style={{ background: "var(--pa-dash-quiet)" }} />
                Monitoring not connected yet
              </span>
            }
          >
            <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
              <HealthRow label="API response, 95th percentile" value="Not measured yet" note="Arrives with Sentry." />
              <HealthRow label="Errors in the last hour" value="Not measured yet" note="Arrives with Sentry." />
              <HealthRow label="Live classes right now" value="Not built yet" note="Arrives with live classes." />
              <HealthRow label="Database storage" value={bytes(o.database_bytes)} mono />
              <HealthRow label="Snapshot storage (R2)" value="Not set up yet" />
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}

function HealthRow({
  label,
  value,
  note,
  mono = false,
}: {
  label: string;
  value: string;
  note?: string;
  mono?: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <span style={{ color: "var(--pa-text-soft)" }}>{label}</span>
        <span
          className={mono ? "ad-mono" : undefined}
          style={{ color: mono ? "var(--pa-text)" : "var(--pa-text-faint)", textAlign: "right" }}
        >
          {value}
        </span>
      </span>
      {note && <span style={{ fontSize: 12, color: "var(--pa-text-faint)" }}>{note}</span>}
    </div>
  );
}
