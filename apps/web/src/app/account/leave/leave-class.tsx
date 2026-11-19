"use client";

// A student deletes their own work and leaves the class (design/mockups/Privacy.dc.html,
// "Student deletes"; ADR 0042). The API checks the typed display name.
import { createApi, type StudentMe } from "@pa/api-client";
import { t } from "@pa/i18n";
import "@pa/i18n/privacy";
import { useEffect, useState } from "react";

import {
  ConfirmScreen,
  DownloadFirst,
  Heading,
  k,
  Lead,
  Page,
  Rich,
  Small,
  useDownload,
} from "../parts";

const api = createApi();

export function LeaveClass() {
  const [me, setMe] = useState<StudentMe | { problem: string } | null>(null);
  const { busy, download } = useDownload(
    () => api.privacy.exportMine(),
    (after) => api.privacy.exportMyAttempts(after),
  );
  useEffect(() => {
    void api.auth.me().then((r) => {
      if (r.ok && r.data.kind === "student") setMe(r.data);
      else setMe({ problem: r.ok || r.status === 401 ? t(k("privacy.signedOut")) : r.detail });
    });
  }, []);
  if (me === null) return null;
  if ("problem" in me) {
    return (
      <Page>
        <Lead>{me.problem}</Lead>
      </Page>
    );
  }
  return (
    <ConfirmScreen
      confirmLabel={t(k("privacy.leaveClass.confirm"))}
      go={t(k("privacy.leaveClass.go"))}
      keep={t(k("privacy.leaveClass.keep"))}
      keepHref="/account"
      done={t(k("privacy.leaveClass.done"))}
      after={{ href: "/", label: t(k("privacy.done.home")) }}
      onConfirm={(typed) => api.privacy.leaveClass(typed)}
    >
      <Small>
        <Rich
          id="privacy.leaveClass.inClass"
          params={{ className: me.school_class.name, name: me.display_name }}
        />
      </Small>
      <Heading>{t(k("privacy.leaveClass.title"))}</Heading>
      <Lead>{t(k("privacy.leaveClass.body"))}</Lead>
      <Lead>{t(k("privacy.leaveClass.body2"))}</Lead>
      <DownloadFirst
        label={t(k("privacy.leaveClass.downloadFirst"))}
        busy={busy}
        onClick={download}
      />
    </ConfirmScreen>
  );
}
