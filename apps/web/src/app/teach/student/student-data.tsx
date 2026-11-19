"use client";

// One student's data, for when the student or their parent asks (design/mockups/Privacy.dc.html,
// "A student's data"; ADR 0042): download their work, or remove them from the class.
import { createApi, type StudentExport } from "@pa/api-client";
import { t } from "@pa/i18n";
import "@pa/i18n/privacy";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import {
  Action,
  Card,
  DANGER_LINK,
  Heading,
  k,
  Lead,
  LINK,
  Page,
  Problem,
  Small,
  useDownload,
} from "../../account/parts";

const api = createApi();

export function StudentData() {
  const params = useSearchParams();
  const classId = params.get("class") ?? "";
  const memberId = params.get("member") ?? "";
  const [student, setStudent] = useState<StudentExport | "missing" | null>(null);
  const [asking, setAsking] = useState(false);
  const [removed, setRemoved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const download = useDownload(
    () => api.privacy.exportMember(classId, memberId),
    (after) => api.privacy.exportMemberAttempts(classId, memberId, after),
  );
  useEffect(() => {
    void api.privacy
      .exportMember(classId, memberId)
      .then((r) => setStudent(r.ok ? r.data : "missing"));
  }, [classId, memberId]);

  if (student === null) return null;
  if (student === "missing") {
    return (
      <Page>
        <Lead>{t(k("privacy.notFound"))}</Lead>
      </Page>
    );
  }
  const name = student.display_name;
  if (removed) {
    return (
      <Page>
        <Heading>{t(k("privacy.student.removed"), { name })}</Heading>
        <Link
          className={`${LINK} pt-4`}
          href={`/teach/students?class=${encodeURIComponent(classId)}`}
        >
          {t(k("privacy.done.students"))}
        </Link>
      </Page>
    );
  }

  async function remove() {
    setBusy(true);
    setError(null);
    const r = await api.privacy.removeMember(classId, memberId);
    setBusy(false);
    if (r.ok) setRemoved(true);
    else setError(r.detail);
  }

  return (
    <Page>
      <div className="flex flex-col gap-2">
        <Small>{student.class_name}</Small>
        <Heading>{t(k("privacy.student.title"), { name })}</Heading>
        <Lead>{t(k("privacy.student.for"))}</Lead>
      </div>
      <div className="flex flex-col gap-2 pt-4">
        <Card title={t(k("privacy.student.download.title"))}>
          <Small>{t(k("privacy.student.download.body"))}</Small>
          <Action
            kind="secondary"
            className="mt-1.5"
            disabled={download.busy}
            onClick={download.download}
          >
            {t(k(download.busy ? "privacy.download.busy" : "privacy.download.button"))}
          </Action>
          {download.error ? <Problem>{download.error}</Problem> : null}
        </Card>
        <Card title={t(k("privacy.student.remove.title"))}>
          <Small>{t(k("privacy.student.remove.body"))}</Small>
          <button
            type="button"
            className={`${DANGER_LINK} self-start`}
            aria-expanded={asking}
            onClick={() => setAsking(true)}
          >
            {t(k("privacy.student.remove.link"), { name })}
          </button>
        </Card>
      </div>
      {asking ? (
        <section
          aria-label={t(k("privacy.student.remove.ask"), { name })}
          className="mt-4 flex flex-col gap-2 border border-[var(--pa-danger-fg)] bg-[var(--pa-surface)] p-3.5"
        >
          <h2 className="font-semibold">{t(k("privacy.student.remove.ask"), { name })}</h2>
          <Small>{t(k("privacy.student.remove.warn"))}</Small>
          {error ? <Problem>{error}</Problem> : null}
          <div className="flex gap-2">
            <Action
              kind="danger"
              className="h-11 flex-1"
              disabled={busy}
              onClick={() => void remove()}
            >
              {t(k("privacy.student.remove.go"))}
            </Action>
            <Action kind="secondary" className="h-11 flex-1" onClick={() => setAsking(false)}>
              {t(k("privacy.student.remove.cancel"))}
            </Action>
          </div>
        </section>
      ) : null}
    </Page>
  );
}
