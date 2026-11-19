"use client";

// Classes, with AI on or off for each (audited, with undo), and each class's students by
// display name only (rule 4).
import type { ClassRow, MemberRow } from "@pa/api-client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { membersOf, setClassAi } from "@/app/actions";
import { day, n } from "@/lib/format";

import { Chip, Empty } from "./bits";
import { Drawer, DrawerRows, DrawerRule, DrawerSection } from "./drawer";
import { useToast } from "./toast";

const COLS = "minmax(180px, 2fr) 100px minmax(120px, 1fr) 80px 110px 120px 110px";

export function ClassesPanel({
  classes,
  openId,
}: {
  classes: readonly ClassRow[];
  openId?: string;
}) {
  const rows = classes;
  const [open, setOpen] = useState<string | null>(openId ?? null);
  const [members, setMembers] = useState<{ id: string; list: MemberRow[] } | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const toast = useToast();
  const router = useRouter();
  const chosen = rows.find((c) => c.id === open);
  const shown = members && members.id === open ? members.list : null;

  const load = useCallback((id: string) => {
    void membersOf(id).then((r) => {
      if (r.ok) setMembers({ id, list: r.data });
      else setProblem(r.detail);
    });
  }, []);

  // A class named in the address (from search) opens with its students.
  useEffect(() => {
    if (openId) load(openId);
  }, [openId, load]);

  function openClass(id: string) {
    setProblem(null);
    setOpen(id);
    load(id);
  }

  async function setAi(c: ClassRow, enabled: boolean, undo = false) {
    const r = await setClassAi(c.id, enabled, undo ? "Undo" : undefined);
    if (!r.ok) {
      toast({ text: r.detail, failed: true });
      return;
    }
    router.refresh();
    toast({
      text: `AI ${enabled ? "on" : "off"} for ${c.code}.${undo ? "" : " Recorded in the audit log."}`,
      ...(undo ? {} : { undo: () => void setAi(r.data, !enabled, true) }),
    });
  }

  if (rows.length === 0)
    return (
      <div style={{ padding: 16 }}>
        <Empty title="No classes yet">Classes appear here once a teacher creates one.</Empty>
      </div>
    );

  return (
    <>
      <div style={{ overflowX: "auto" }}>
        <div role="table" aria-label="Classes" className="ad-table" style={{ minWidth: 860 }}>
          <div role="row" className="ad-tr ad-th" style={{ gridTemplateColumns: COLS }}>
            {["Class", "Code", "Teacher", "Students", "Joining", "AI", ""].map((h, i) => (
              <span
                key={i}
                role="columnheader"
                style={{ textAlign: i === 3 ? "right" : undefined }}
              >
                {h}
              </span>
            ))}
          </div>
          {rows.map((c) => (
            <div
              key={c.id}
              role="row"
              className="ad-tr ad-row"
              style={{ gridTemplateColumns: COLS }}
            >
              <span role="cell">{c.name}</span>
              <span role="cell" className="ad-mono">
                {c.code}
              </span>
              <span role="cell" style={{ color: "var(--pa-text-soft)" }}>
                {c.teacher_name ?? "No name given"}
              </span>
              <span role="cell" className="ad-mono" style={{ textAlign: "right" }}>
                {n(c.members)}
              </span>
              <span role="cell">
                <Chip kind={c.joining_open ? "green" : "grey"}>
                  {c.joining_open ? "Open" : "Closed"}
                </Chip>
              </span>
              <span role="cell">
                <button
                  type="button"
                  role="switch"
                  aria-checked={c.ai_enabled}
                  aria-label={`AI for ${c.name}`}
                  className="ad-f ad-btn ad-button"
                  onClick={() => void setAi(c, !c.ai_enabled)}
                  style={{ height: 26, gap: 8 }}
                >
                  <span
                    aria-hidden="true"
                    className="ad-dot"
                    style={{
                      background: c.ai_enabled ? "var(--pa-topic-light)" : "var(--pa-dash-quiet)",
                    }}
                  />
                  {c.ai_enabled ? "On" : "Off"}
                </button>
              </span>
              <span role="cell">
                <button
                  className="ad-f ad-btn ad-button"
                  type="button"
                  style={{ height: 26 }}
                  onClick={() => openClass(c.id)}
                >
                  Students
                </button>
              </span>
            </div>
          ))}
        </div>
      </div>

      <Drawer
        open={!!chosen}
        onClose={() => setOpen(null)}
        title={chosen ? `${chosen.name}, ${chosen.code}` : ""}
        {...(chosen
          ? {
              chip: {
                kind: chosen.ai_enabled ? "violet" : "grey",
                text: chosen.ai_enabled ? "AI on" : "AI off",
              },
            }
          : {})}
        action={
          chosen && (
            <button
              className="ad-f ad-primary"
              type="button"
              style={{ height: 34, padding: "0 14px" }}
              onClick={() => void setAi(chosen, !chosen.ai_enabled)}
            >
              {chosen.ai_enabled ? "Turn AI off" : "Turn AI on"}
            </button>
          )
        }
      >
        {chosen && (
          <>
            <DrawerRows
              rows={[
                ["Teacher", chosen.teacher_name ?? "No name given"],
                ["Students", n(chosen.members)],
                ["Joining", chosen.joining_open ? "Open" : "Closed"],
                ["Created", day(chosen.created_at)],
              ]}
            />
            <DrawerSection label="Students, by display name">
              {problem && <span style={{ color: "var(--pa-danger-text)" }}>{problem}</span>}
              {!problem && shown === null && <span>Loading…</span>}
              {shown?.length === 0 && <span>No students have joined yet.</span>}
              {shown && shown.length > 0 && (
                <ul
                  style={{
                    listStyle: "none",
                    margin: 0,
                    padding: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  {shown.map((m) => (
                    <li
                      key={m.id}
                      style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}
                    >
                      <span>{m.display_name}</span>
                      <span className="ad-mono" style={{ color: "var(--pa-text-faint)" }}>
                        {n(m.attempts)} attempts
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </DrawerSection>
            <DrawerRule>
              AI is off by default for classes (ADR 0008); a teacher turns it on for their class.
              Staff can turn it off for any class, and every change is in the audit log.
            </DrawerRule>
          </>
        )}
      </Drawer>
    </>
  );
}
