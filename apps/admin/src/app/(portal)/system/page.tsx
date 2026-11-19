// System: the database, sync volume and versions, read from the API; error trends, latency and
// deploys arrive with Sentry and the deploy pipeline.
import type { SystemInfo } from "@pa/api-client";

import { ApiProblem, Empty, MiniBars, Panel, Tile } from "@/components/bits";
import { TopBar } from "@/components/topbar";
import { adminGet, staffMe } from "@/lib/api";
import { bytes, n } from "@/lib/format";

export default async function SystemPage() {
  const [me, r] = await Promise.all([staffMe(), adminGet<SystemInfo>("/admin/system")]);
  const top = <TopBar page="System" environment={me.ok ? me.data.environment : null} />;
  if (!r.ok)
    return (
      <>
        {top}
        <ApiProblem status={r.status} detail={r.detail} />
      </>
    );
  const s = r.data;
  const synced = s.attempts_synced_per_day.reduce((a, b) => a + b, 0);
  const tables = [...s.tables].sort((a, b) => b.bytes - a.bytes);

  return (
    <>
      {top}
      <div className="ad-body">
        <div className="ad-tiles">
          <Tile title="Attempts synced" when="14 days" href="#sync" link="Sync">
            <span className="ad-big">{n(synced)}</span>
            <MiniBars values={s.attempts_synced_per_day} />
          </Tile>
          <Tile title="Database storage" when="Now" href="#tables" link="By table">
            <span className="ad-big">{bytes(s.database_bytes)}</span>
          </Tile>
          <Tile title="Failed syncs" when="14 days" href="#sync" link="Why not yet">
            <span className="ad-big" style={{ color: "var(--pa-text-faint)" }}>
              –
            </span>
            <span style={{ fontSize: 12, color: "var(--pa-text-muted)" }}>Not recorded yet.</span>
          </Tile>
          <Tile title="Errors" when="Last hour" href="#monitoring" link="Monitoring">
            <span className="ad-big" style={{ color: "var(--pa-text-faint)" }}>
              –
            </span>
            <span style={{ fontSize: 12, color: "var(--pa-text-muted)" }}>
              Arrives with Sentry.
            </span>
          </Tile>
        </div>

        <div className="ad-split">
          <Panel className="ad-wide" title="Versions" label="Versions">
            <div
              style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}
            >
              {(
                [
                  ["Environment", s.environment],
                  ["API version", s.api_version],
                  ["Database migration", s.migration ?? "None"],
                  ["PostgreSQL", s.postgres],
                  [
                    "Charts read from",
                    s.replica ? "The read replica" : "The primary database, read-only",
                  ],
                ] as const
              ).map(([k, v]) => (
                <span key={k} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <span style={{ color: "var(--pa-text-soft)" }}>{k}</span>
                  <span className="ad-mono">{v}</span>
                </span>
              ))}
            </div>
          </Panel>
          <div id="sync" className="ad-narrow">
            <Empty title="Sync failures">
              Not recorded yet. A device keeps its work until the server accepts it, and tries again
              later, so a failed sync loses nothing; but failures are not counted anywhere yet.
            </Empty>
          </div>
        </div>

        <div id="tables">
          <Panel
            title="Tables"
            sub="Row counts are PostgreSQL's running counts of live rows, close but not exact"
          >
            <div style={{ overflowX: "auto" }}>
              <div role="table" aria-label="Tables" className="ad-table" style={{ minWidth: 480 }}>
                <div
                  role="row"
                  className="ad-tr ad-th"
                  style={{ gridTemplateColumns: "1fr 120px 120px" }}
                >
                  <span role="columnheader">Table</span>
                  <span role="columnheader" style={{ textAlign: "right" }}>
                    Rows, about
                  </span>
                  <span role="columnheader" style={{ textAlign: "right" }}>
                    Size
                  </span>
                </div>
                {tables.map((t) => (
                  <div
                    key={t.name}
                    role="row"
                    className="ad-tr ad-row"
                    style={{ gridTemplateColumns: "1fr 120px 120px" }}
                  >
                    <span role="cell" className="ad-mono">
                      {t.name}
                    </span>
                    <span role="cell" className="ad-mono" style={{ textAlign: "right" }}>
                      {n(t.rows)}
                    </span>
                    <span role="cell" className="ad-mono" style={{ textAlign: "right" }}>
                      {bytes(t.bytes)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Panel>
        </div>

        <div id="monitoring" className="ad-split">
          <div className="ad-wide">
            <Empty title="Error trends and classroom latency">
              Not measured yet. These come from Sentry, which is not connected.
            </Empty>
          </div>
          <div className="ad-narrow">
            <Empty title="Releases and recent deploys">
              Not shown yet. They come from the deploy pipeline once staging and production deploy
              from it.
            </Empty>
          </div>
        </div>
      </div>
    </>
  );
}
