// People and access: teachers, classes and students. Students stay pseudonymous: display names
// only, and only inside a class (rule 4).
import type { ClassRow, TeacherRow } from "@pa/api-client";

import { ApiProblem, Empty, Panel } from "@/components/bits";
import { ClassesPanel } from "@/components/classes";
import { ExportButton } from "@/components/export-button";
import { TopBar } from "@/components/topbar";
import { adminGet, staffMe } from "@/lib/api";
import { day, n, when } from "@/lib/format";

const COLS = "minmax(160px, 1.4fr) minmax(220px, 2fr) 80px 130px 190px";

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const [me, teachers, classes] = await Promise.all([
    staffMe(),
    adminGet<TeacherRow[]>("/admin/people/teachers"),
    adminGet<ClassRow[]>("/admin/people/classes"),
  ]);
  const top = (
    <TopBar page="People and access" environment={me.ok ? me.data.environment : null}>
      <ExportButton report="classes" range="30d" label="Export classes" />
    </TopBar>
  );
  const failed = !teachers.ok ? teachers : !classes.ok ? classes : null;
  if (failed && !failed.ok)
    return (
      <>
        {top}
        <ApiProblem status={failed.status} detail={failed.detail} />
      </>
    );
  if (!teachers.ok || !classes.ok) return top;

  return (
    <>
      {top}
      <div className="ad-body">
        <Panel
          title="Classes"
          sub={`${n(classes.data.length)} classes. Open one for its students.`}
        >
          <ClassesPanel
            classes={classes.data}
            {...(typeof params.class === "string" ? { openId: params.class } : {})}
          />
        </Panel>
        <Panel
          title="Teachers"
          sub={`${n(teachers.data.length)} signed up. Adults only; emails are for support.`}
        >
          {teachers.data.length === 0 ? (
            <div style={{ padding: 16 }}>
              <Empty title="No teachers yet">Teachers appear here after they first sign in.</Empty>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <div
                role="table"
                aria-label="Teachers"
                className="ad-table"
                style={{ minWidth: 780 }}
              >
                <div role="row" className="ad-tr ad-th" style={{ gridTemplateColumns: COLS }}>
                  {["Name", "Email", "Classes", "Joined", "Last signed in"].map((h, i) => (
                    <span
                      key={h}
                      role="columnheader"
                      style={{ textAlign: i === 2 ? "right" : undefined }}
                    >
                      {h}
                    </span>
                  ))}
                </div>
                {teachers.data.map((t) => (
                  <div
                    key={t.id}
                    role="row"
                    className="ad-tr ad-row"
                    style={{ gridTemplateColumns: COLS }}
                  >
                    <span role="cell">{t.display_name ?? "No name given"}</span>
                    <span role="cell" className="ad-mono" style={{ color: "var(--pa-text-soft)" }}>
                      {t.email}
                    </span>
                    <span role="cell" className="ad-mono" style={{ textAlign: "right" }}>
                      {n(t.classes)}
                    </span>
                    <span role="cell">{day(t.created_at)}</span>
                    <span role="cell" style={{ color: "var(--pa-text-soft)" }}>
                      {t.last_signed_in_at ? when(t.last_signed_in_at) : "–"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Panel>
        <div className="ad-split">
          <div className="ad-wide">
            <Empty title="Schools and bulk class setup">
              Not built yet. Classes belong to teachers; there is no school record to group them by.
            </Empty>
          </div>
          <div className="ad-narrow">
            <Empty title="Staff access">
              Staff sign in through Cloudflare Access with two-step verification. Who may sign in is
              set in the Access policy, not here.
            </Empty>
          </div>
        </div>
      </div>
    </>
  );
}
