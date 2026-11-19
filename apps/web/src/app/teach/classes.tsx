"use client";

// The teacher's classes, each with a link to its live board. Drafted in
// design/mockups/TeacherStart.dc.html; the approved board starts at the live class.
import { createApi, type ClassOut } from "@pa/api-client";
import { t, type MessageKey } from "@pa/i18n";
import "@pa/i18n/teach";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Notice, Shell } from "./panels";

const api = createApi();
const k = (key: string) => key as MessageKey;
const LINK =
  "text-[var(--pa-accent-soft)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-[var(--pa-accent)]";

export function Classes() {
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
              <span className="flex flex-col">
                <span>{c.name}</span>
                <span className="font-mono text-xs text-[var(--pa-text-faint)]">{c.code}</span>
              </span>
              <Link className={LINK} href={`/teach/live?class=${encodeURIComponent(c.id)}`}>
                {t(k("teach.classes.open"))}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link className={LINK} href="/teach/example">
        {t(k("teach.classes.example"))}
      </Link>
    </Shell>
  );
}
