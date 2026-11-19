"use client";

// Your data (design/mockups/Privacy.dc.html, "Your data"; ADR 0042): download everything, what
// was agreed to (and, for a teacher, the analytics choice), and deleting.
import { createApi, type ConsentState, type MeResponse } from "@pa/api-client";
import { t } from "@pa/i18n";
import "@pa/i18n/privacy";
import Link from "next/link";
import { useEffect, useState } from "react";

import { ConsentGate } from "./consent-gate";
import {
  Action,
  Card,
  DANGER_LINK,
  Heading,
  k,
  Lead,
  Page,
  Problem,
  Small,
  useDownload,
} from "./parts";

const api = createApi();

export function YourData() {
  const [me, setMe] = useState<MeResponse | { problem: string } | null>(null);
  useEffect(() => {
    void api.auth.me().then((r) =>
      // Only a refused session means signed out; offline or a server fault says so instead.
      setMe(r.ok ? r.data : { problem: r.status === 401 ? t(k("privacy.signedOut")) : r.detail }),
    );
  }, []);
  if (me === null) return null;
  if ("problem" in me) {
    return (
      <Page>
        <Heading>{t(k("privacy.title"))}</Heading>
        <Lead>{me.problem}</Lead>
      </Page>
    );
  }
  return (
    <ConsentGate teacher={me.kind === "teacher"}>
      <Cards teacher={me.kind === "teacher"} />
    </ConsentGate>
  );
}

function Cards({ teacher }: { teacher: boolean }) {
  const [consents, setConsents] = useState<ConsentState[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const {
    busy,
    error: downloadError,
    download,
  } = useDownload(
    () => api.privacy.exportMine(),
    (after) => api.privacy.exportMyAttempts(after),
  );
  useEffect(() => {
    void api.privacy.consents().then((r) => {
      if (r.ok) setConsents(r.data.consents);
    });
  }, []);
  const terms = consents.find((c) => c.purpose === "terms");
  const analytics = consents.find((c) => c.purpose === "analytics");

  async function setAnalytics(granted: boolean) {
    if (!analytics || saving) return;
    setSaving(true);
    const r = await api.privacy.choose({
      purpose: "analytics",
      version: analytics.current_version,
      granted,
    });
    setSaving(false);
    if (r.ok) setConsents(r.data.consents);
    else setError(r.detail);
  }

  return (
    <Page>
      <div className="flex flex-col gap-2">
        <Heading>{t(k("privacy.title"))}</Heading>
        <Lead>{t(k("privacy.intro"))}</Lead>
      </div>
      <div className="flex flex-col gap-2 pt-4">
        <Card title={t(k("privacy.download.title"))}>
          <Small>{t(k("privacy.download.body"))}</Small>
          <Action kind="secondary" className="mt-1.5" disabled={busy} onClick={download}>
            {t(k(busy ? "privacy.download.busy" : "privacy.download.button"))}
          </Action>
          {downloadError ? <Problem>{downloadError}</Problem> : null}
        </Card>
        <Card title={t(k("privacy.agreed.title"))}>
          {terms?.version ? (
            <Small>
              {t(k(teacher ? "privacy.agreed.body" : "privacy.agreed.bodyStudent"), {
                version: terms.version,
              })}
            </Small>
          ) : null}
          {teacher && analytics ? (
            <>
              <label className="mt-1.5 flex items-center gap-2.5">
                <input
                  type="checkbox"
                  disabled={saving}
                  checked={analytics.granted === true}
                  onChange={(e) => void setAnalytics(e.target.checked)}
                  className="size-[22px] shrink-0 accent-[var(--pa-fg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pa-ring)]"
                />
                <span>{t(k("privacy.analytics.label"))}</span>
              </label>
              <Small>{t(k("privacy.analytics.note"))}</Small>
            </>
          ) : null}
          {error ? <Problem>{error}</Problem> : null}
        </Card>
        {teacher ? (
          <Card title={t(k("privacy.delete.title"))}>
            <Small>{t(k("privacy.delete.body"))}</Small>
            <Link className={DANGER_LINK} href="/account/delete">
              {t(k("privacy.delete.link"))}
            </Link>
          </Card>
        ) : (
          <Card title={t(k("privacy.leave.title"))}>
            <Small>{t(k("privacy.leave.body"))}</Small>
            <Link className={DANGER_LINK} href="/account/leave">
              {t(k("privacy.leave.link"))}
            </Link>
          </Card>
        )}
      </div>
    </Page>
  );
}
