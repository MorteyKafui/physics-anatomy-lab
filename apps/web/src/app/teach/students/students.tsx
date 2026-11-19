"use client";

// A class's students, each with a link to their data. The same list as the classes page
// (classes.tsx); the board covers only the student's data page it leads to.
import { createApi, type ClassOut, type MemberOut } from "@pa/api-client";
import { t } from "@pa/i18n";
import "@pa/i18n/privacy";
import "@pa/i18n/teach";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { k } from "../../account/parts";
import { LINK } from "../classes";
import { Notice, Shell } from "../panels";

const api = createApi();

export function Students() {
  const classId = useSearchParams().get("class") ?? "";
  const [found, setFound] = useState<{ c: ClassOut; members: MemberOut[] } | "missing" | null>(
    null,
  );
  useEffect(() => {
    void Promise.all([api.classes.get(classId), api.classes.members(classId)]).then(([c, m]) =>
      setFound(c.ok && m.ok ? { c: c.data, members: m.data } : "missing"),
    );
  }, [classId]);
  if (found === null) return <Notice>{" "}</Notice>;
  if (found === "missing") return <Notice>{t(k("privacy.notFound"))}</Notice>;
  return (
    <Shell>
      <span className="text-[13px] text-[var(--pa-text-faint)]">{found.c.name}</span>
      <h1 className="text-[15px] font-medium">{t(k("privacy.students.title"))}</h1>
      {found.members.length === 0 ? (
        <p className="text-[var(--pa-text-soft)]">{t(k("privacy.students.none"))}</p>
      ) : (
        <ul className="flex flex-col border border-[var(--pa-ink-800)]">
          {found.members.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between gap-3 border-t border-[var(--pa-ink-800)] px-4 py-3 first:border-t-0"
            >
              <span>{m.display_name}</span>
              <Link
                className={LINK}
                href={`/teach/student?class=${encodeURIComponent(classId)}&member=${encodeURIComponent(m.id)}`}
              >
                {t(k("privacy.students.open"))}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link className={LINK} href="/teach">
        {t(k("privacy.back"))}
      </Link>
    </Shell>
  );
}
