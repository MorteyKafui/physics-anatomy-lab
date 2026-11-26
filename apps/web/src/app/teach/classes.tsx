"use client";

// The teacher's classes, each with a link to its live board. Drafted in
// design/mockups/TeacherStart.dc.html; the approved board starts at the live class.
import { createApi, type ClassOut } from "@pa/api-client";
import { t, type MessageKey } from "@pa/i18n";
import "@pa/i18n/teach";
import "@pa/i18n/privacy";
import { Switch } from "@pa/ui/components/switch";
import { labelIdFor } from "@pa/ui/lib/label-id";
import Link from "next/link";
import { useEffect, useId, useState } from "react";

import { ConsentGate } from "../account/consent-gate";
import { Notice, Shell } from "./panels";

const api = createApi();
const k = (key: string) => key as MessageKey;
export const LINK =
  "text-[var(--pa-accent-soft)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-[var(--pa-accent)]";

export function Classes() {
  return (
    <ConsentGate teacher>
      <ClassList />
    </ConsentGate>
  );
}

/**
 * AI for this class (design/mockups/AI.dc.html, "Teacher switch"; ADR 0008): off until the
 * teacher turns it on. Students' AI help follows it at once.
 */
function AiSwitch({ value, onChange }: { value: ClassOut; onChange: (c: ClassOut) => void }) {
  const id = useId();
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string>();
  const set = async (on: boolean) => {
    setSaving(true);
    setProblem(undefined);
    const r = await api.classes.update(value.id, { ai_enabled: on });
    setSaving(false);
    if (r.ok) onChange(r.data);
    else setProblem(r.detail);
  };
  return (
    <span className="flex flex-col gap-1">
      <span className="flex items-center gap-2.5">
        <Switch
          id={id}
          checked={value.ai_enabled}
          disabled={saving}
          onCheckedChange={(on) => void set(on)}
        />
        <label id={labelIdFor(id)} htmlFor={id} className="text-sm">
          {t(k("teach.ai.label"))}
        </label>
      </span>
      <span role="status" className="text-xs text-[var(--pa-text-soft)]">
        {problem ?? t(k(value.ai_enabled ? "teach.ai.on" : "teach.ai.off"))}
      </span>
      <span className="text-xs text-[var(--pa-text-faint)]">{t(k("teach.ai.note"))}</span>
    </span>
  );
}

function ClassList() {
  const [classes, setClasses] = useState<ClassOut[] | "signed-out" | null>(null);
  useEffect(() => {
    void api.classes.list().then((r) => setClasses(r.ok ? r.data : "signed-out"));
  }, []);
  if (classes === null) return <Notice>{"\u00a0"}</Notice>;
  return (
    <Shell>
      <h1 className="text-[15px] font-medium">{t(k("teach.classes"))}</h1>
      {classes === "signed-out" ? (
        <p className="text-[var(--pa-text-soft)]">{t(k("teach.signedOut"))}</p>
      ) : classes.length === 0 ? (
        <p className="text-[var(--pa-text-soft)]">{t(k("teach.classes.none"))}</p>
      ) : (
        <ul className="flex flex-col border border-[var(--pa-ink-800)]">
          {classes.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between gap-3 border-t border-[var(--pa-ink-800)] px-4 py-3 first:border-t-0"
            >
              <span className="flex min-w-0 flex-col gap-2">
                <span className="flex flex-col">
                  <span>{c.name}</span>
                  <span className="font-mono text-xs text-[var(--pa-text-faint)]">{c.code}</span>
                </span>
                <AiSwitch
                  value={c}
                  onChange={(next) =>
                    setClasses((all) =>
                      Array.isArray(all) ? all.map((x) => (x.id === next.id ? next : x)) : all,
                    )
                  }
                />
              </span>
              <span className="flex flex-wrap justify-end gap-x-4 gap-y-1">
                <Link className={LINK} href={`/teach/live?class=${encodeURIComponent(c.id)}`}>
                  {t(k("teach.classes.open"))}
                </Link>
                <Link className={LINK} href={`/teach/students?class=${encodeURIComponent(c.id)}`}>
                  {t(k("privacy.students.title"))}
                </Link>
                <Link
                  className={LINK}
                  href={`/teach/delete-class?class=${encodeURIComponent(c.id)}`}
                >
                  {t(k("privacy.deleteClass.link"))}
                </Link>
              </span>
            </li>
          ))}
        </ul>
      )}
      {classes === "signed-out" ? null : (
        <Link className={LINK} href="/teach/questions">
          {t(k("teach.questions.link"))}
        </Link>
      )}
      <Link className={LINK} href="/teach/example">
        {t(k("teach.classes.example"))}
      </Link>
      {classes === "signed-out" ? null : (
        <Link className={LINK} href="/account">
          {t(k("privacy.title"))}
        </Link>
      )}
    </Shell>
  );
}
