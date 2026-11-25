"use client";

// Deleting one class (design/mockups/Privacy.dc.html, "Delete class"; ADR 0042). The API checks
// the typed class name and a sign-in within the last hour.
import { createApi, type ClassOut } from "@pa/api-client";
import { t } from "@pa/i18n";
import "@pa/i18n/privacy";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { ConfirmScreen, count, Heading, k, Lead, LINK, Page, Rich } from "../../account/parts";

const api = createApi();

export function DeleteClass() {
  const classId = useSearchParams().get("class") ?? "";
  const [found, setFound] = useState<{ c: ClassOut; students: number } | "missing" | null>(null);
  useEffect(() => {
    void Promise.all([api.classes.get(classId), api.classes.members(classId)]).then(([c, m]) =>
      setFound(c.ok && m.ok ? { c: c.data, students: m.data.length } : "missing"),
    );
  }, [classId]);
  if (found === null) return null;
  if (found === "missing") {
    return (
      <Page>
        <Lead>{t(k("privacy.notFound"))}</Lead>
      </Page>
    );
  }
  const className = found.c.name;
  return (
    <ConfirmScreen
      confirmLabel={t(k("privacy.deleteClass.confirm"))}
      hint={t(k("privacy.deleteAccount.recent"))}
      go={t(k("privacy.deleteClass.go"))}
      keep={t(k("privacy.deleteClass.keep"))}
      keepHref="/teach"
      done={t(k("privacy.deleteClass.done"), { className })}
      after={{ href: "/teach", label: t(k("privacy.done.classes")) }}
      onConfirm={(typed) => api.privacy.deleteClass(classId, typed)}
    >
      <Heading>{t(k("privacy.deleteClass.title"), { className })}</Heading>
      <Lead>
        <Rich
          id="privacy.deleteClass.body"
          params={{ students: count("students", found.students) }}
        />
      </Lead>
      {found.students > 0 ? (
        <Link
          className={`${LINK} self-start`}
          href={`/teach/students?class=${encodeURIComponent(classId)}`}
        >
          {t(k("privacy.deleteClass.downloadFirst"))}
        </Link>
      ) : null}
    </ConfirmScreen>
  );
}
