"use client";

// Deleting a teacher's account (design/mockups/Privacy.dc.html, "Delete account"; ADR 0042).
// The API checks the typed email and a sign-in within the last hour.
import { createApi, type TeacherExport } from "@pa/api-client";
import { t } from "@pa/i18n";
import "@pa/i18n/privacy";
import { useEffect, useState } from "react";

import {
  ConfirmScreen,
  count,
  DownloadFirst,
  Heading,
  k,
  Lead,
  Page,
  Rich,
  useDownload,
} from "../parts";

const api = createApi();

export function DeleteAccount() {
  const [summary, setSummary] = useState<TeacherExport | "not-teacher" | null>(null);
  const { busy, download } = useDownload(
    () => api.privacy.exportMine(),
    (after) => api.privacy.exportMyAttempts(after),
  );
  useEffect(() => {
    void api.privacy.exportMine().then((r) => {
      setSummary(r.ok && r.data.kind === "teacher" ? r.data : "not-teacher");
    });
  }, []);
  if (summary === null) return null;
  if (summary === "not-teacher") {
    return (
      <Page>
        <Lead>{t(k("privacy.signedOut"))}</Lead>
      </Page>
    );
  }
  const students = summary.classes.reduce((n, c) => n + c.students, 0);
  return (
    <ConfirmScreen
      confirmType="email"
      confirmLabel={t(k("privacy.deleteAccount.confirm"))}
      hint={t(k("privacy.deleteAccount.recent"))}
      go={t(k("privacy.deleteAccount.go"))}
      keep={t(k("privacy.deleteAccount.keep"))}
      keepHref="/account"
      done={t(k("privacy.deleteAccount.done"))}
      after={{ href: "/", label: t(k("privacy.done.home")) }}
      onConfirm={(typed) => api.privacy.deleteAccount(typed)}
    >
      <Heading>{t(k("privacy.deleteAccount.title"))}</Heading>
      <Lead>{t(k("privacy.deleteAccount.lead"))}</Lead>
      <ul className="list-disc pl-5 text-[var(--pa-fg-soft)]">
        <li>{t(k("privacy.deleteAccount.own"))}</li>
        <li>
          <Rich
            id="privacy.deleteAccount.classes"
            params={{
              classes: count("classes", summary.classes.length),
              students: count("students", students),
            }}
          />
        </li>
      </ul>
      <Lead>{t(k("privacy.deleteAccount.signedOut"))}</Lead>
      <DownloadFirst
        label={t(k("privacy.deleteAccount.downloadFirst"))}
        busy={busy}
        onClick={download}
      />
    </ConfirmScreen>
  );
}
