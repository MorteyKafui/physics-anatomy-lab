// Audit log: every change made through the portal, and every export, who did it and when.
import type { AiSwitchState, AuditPage } from "@pa/api-client";
import Link from "next/link";

import { ApiProblem, Chip, Empty, Panel } from "@/components/bits";
import { TopBar } from "@/components/topbar";
import { switchName } from "@/lib/ai";
import { adminGet, staffMe } from "@/lib/api";
import { when } from "@/lib/format";

const ACTIONS: Readonly<Record<string, string>> = {
  "class.ai.set": "Changed AI for a class",
  "ai.switch.set": "Changed an AI switch",
  "ai.flag.dismiss": "Dismissed a flagged reply",
  "ai.flag.restore": "Restored a flagged reply",
  "member.display-name.replace": "Replaced a display name",
  "export.create": "Exported a table",
};
const COLS = "200px minmax(180px, 1.2fr) minmax(200px, 1.4fr) minmax(220px, 2fr)";

function summary(action: string, detail: Record<string, unknown>): string {
  const reason = typeof detail.reason === "string" ? ` Reason: ${detail.reason}.` : "";
  if (action === "class.ai.set")
    return `AI ${detail.enabled ? "on" : "off"}, was ${detail.was ? "on" : "off"}.${reason}`;
  if (action === "ai.switch.set")
    return `${switchName(detail.name as AiSwitchState["name"])} ${detail.enabled ? "on" : "off"}, was ${detail.was ? "on" : "off"}.${reason}`;
  if (action === "export.create")
    return `${String(detail.report)}, ${String(detail.range)}, ${String(detail.rows)} rows.`;
  return reason.trim() || "–";
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const before = (await searchParams).before;
  const query =
    typeof before === "string" && /^[0-9a-f-]{36}$/i.test(before) ? `?before=${before}` : "";
  const [me, r] = await Promise.all([staffMe(), adminGet<AuditPage>(`/admin/audit${query}`)]);
  const top = <TopBar page="Audit log" environment={me.ok ? me.data.environment : null} />;
  if (!r.ok)
    return (
      <>
        {top}
        <ApiProblem status={r.status} detail={r.detail} />
      </>
    );
  const { entries, next_before } = r.data;
  return (
    <>
      {top}
      <div className="ad-body">
        <Panel
          title="Every admin action"
          sub="Newest first. Kept for two years; nobody can change or remove an entry before then."
          action={
            query ? (
              <Link className="ad-f ad-btn ad-button" href="/audit">
                Newest
              </Link>
            ) : undefined
          }
        >
          {entries.length === 0 ? (
            <div style={{ padding: 16 }}>
              <Empty title="Nothing yet">
                Each change made here, and each export, is recorded with who did it and when.
              </Empty>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <div
                role="table"
                aria-label="Audit log"
                className="ad-table"
                style={{ minWidth: 860 }}
              >
                <div role="row" className="ad-tr ad-th" style={{ gridTemplateColumns: COLS }}>
                  {["When", "Who", "What", "Details"].map((h) => (
                    <span key={h} role="columnheader">
                      {h}
                    </span>
                  ))}
                </div>
                {entries.map((e) => (
                  <div
                    key={e.id}
                    role="row"
                    className="ad-tr ad-row"
                    style={{ gridTemplateColumns: COLS }}
                  >
                    <span role="cell" style={{ color: "var(--pa-text-soft)" }}>
                      {when(e.at)}
                    </span>
                    <span role="cell" style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <span className="ad-mono">{e.actor_email}</span>
                      {e.actor_via === "dev-bypass" && (
                        <span style={{ alignSelf: "flex-start" }}>
                          <Chip kind="amber">Dev bypass</Chip>
                        </span>
                      )}
                    </span>
                    <span role="cell" style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      {ACTIONS[e.action] ?? e.action}
                      {e.target_id && (
                        <span
                          className="ad-mono"
                          style={{ fontSize: 12, color: "var(--pa-text-faint)" }}
                        >
                          {e.target_type} …{e.target_id.slice(-12)}
                        </span>
                      )}
                    </span>
                    <span role="cell" style={{ color: "var(--pa-text-soft)" }}>
                      {summary(e.action, e.detail)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {next_before && (
            <div style={{ padding: "12px 16px", borderTop: "1px solid var(--pa-ink-800)" }}>
              <Link className="ad-f ad-btn ad-button" href={`/audit?before=${next_before}`}>
                Older entries
              </Link>
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
