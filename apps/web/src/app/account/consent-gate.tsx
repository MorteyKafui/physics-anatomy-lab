"use client";

// Before a signed-in page: the new-terms notice, and a teacher's analytics choice
// (design/mockups/Privacy.dc.html, "New terms" and "Analytics choice"; ADR 0042). Signed out or
// offline, the page shows as it is: nothing here may stand between a student and the lab.
import { createApi, type ConsentState } from "@pa/api-client";
import { t } from "@pa/i18n";
import "@pa/i18n/privacy";
import { useCallback, useEffect, useState } from "react";

import { Action, Actions, Heading, k, Lead, Page, Problem, Rich, Small, Spacer } from "./parts";

const api = createApi();

function dismissedKey(c: ConsentState) {
  return `pa.notice.${c.purpose}.${c.upcoming_version ?? ""}`;
}

function wasDismissed(c: ConsentState): boolean {
  try {
    return sessionStorage.getItem(dismissedKey(c)) === "1";
  } catch {
    return false;
  }
}

function dismiss(c: ConsentState) {
  try {
    sessionStorage.setItem(dismissedKey(c), "1");
  } catch {
    // Private windows may refuse storage; the notice then shows again next time.
  }
}

function longDate(day: string) {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function ConsentGate(props: { children: React.ReactNode; teacher?: boolean }) {
  const [states, setStates] = useState<ConsentState[] | null | "skip">(null);
  const [, setTick] = useState(0);
  const load = useCallback(() => {
    void api.privacy.consents().then((r) => setStates(r.ok ? r.data.consents : "skip"));
  }, []);
  useEffect(load, [load]);

  if (states === null) return null;
  if (states === "skip") return <>{props.children}</>;

  const due = states.find((c) => c.needs_agreement);
  if (due) return <TermsNotice consent={due} now onDone={setStates} />;
  const soon = states.find(
    (c) => c.required && c.upcoming_version !== null && c.version !== c.upcoming_version,
  );
  if (soon && !wasDismissed(soon)) {
    return (
      <TermsNotice
        consent={soon}
        now={false}
        onDone={setStates}
        onLater={() => {
          dismiss(soon);
          setTick((n) => n + 1);
        }}
      />
    );
  }
  const analytics = states.find((c) => c.purpose === "analytics");
  if (props.teacher && analytics && analytics.granted === null) {
    return <AnalyticsChoice consent={analytics} onDone={setStates} />;
  }
  return <>{props.children}</>;
}

function TermsNotice(props: {
  consent: ConsentState;
  now: boolean;
  onDone: (states: ConsentState[]) => void;
  onLater?: () => void;
}) {
  const { consent, now } = props;
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const version = now ? consent.current_version : (consent.upcoming_version ?? "");
  const params = {
    document: consent.document,
    date: consent.upcoming_from ? longDate(consent.upcoming_from) : "",
  };
  async function agree() {
    setBusy(true);
    const r = await api.privacy.choose({ purpose: consent.purpose, version, granted: true });
    setBusy(false);
    if (r.ok) props.onDone(r.data.consents);
    else setError(r.detail);
  }
  return (
    <Page>
      <div className="flex flex-col gap-2">
        <Heading>{t(k(now ? "privacy.notice.titleNow" : "privacy.notice.title"))}</Heading>
        <Lead>
          <Rich id={now ? "privacy.notice.bodyNow" : "privacy.notice.body"} params={params} />
        </Lead>
      </div>
      <label className="mt-4 flex items-start gap-3 border border-[var(--pa-border)] bg-[var(--pa-surface)] px-3.5 py-3">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 size-[22px] shrink-0 accent-[var(--pa-fg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pa-ring)]"
        />
        <span>{t(k("privacy.notice.agree"), params)}</span>
      </label>
      {error ? <Problem>{error}</Problem> : null}
      <Spacer />
      <Actions>
        <Action kind="primary" disabled={!agreed || busy} onClick={() => void agree()}>
          {t(k("privacy.notice.carryOn"))}
        </Action>
        {props.onLater ? (
          <>
            <Action kind="secondary" onClick={props.onLater}>
              {t(k("privacy.notice.close"))}
            </Action>
            <Small>{t(k("privacy.notice.later"))}</Small>
          </>
        ) : null}
      </Actions>
    </Page>
  );
}

function AnalyticsChoice(props: {
  consent: ConsentState;
  onDone: (states: ConsentState[]) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function choose(granted: boolean) {
    setBusy(true);
    const r = await api.privacy.choose({
      purpose: "analytics",
      version: props.consent.current_version,
      granted,
    });
    setBusy(false);
    if (r.ok) props.onDone(r.data.consents);
    else setError(r.detail);
  }
  return (
    <Page>
      <div className="flex flex-col gap-2">
        <Heading>{t(k("privacy.choice.title"))}</Heading>
        <Lead>{t(k("privacy.choice.body"))}</Lead>
        <Lead>{t(k("privacy.choice.body2"))}</Lead>
      </div>
      {error ? <Problem>{error}</Problem> : null}
      <Spacer />
      <Actions>
        <Action kind="secondary" disabled={busy} onClick={() => void choose(true)}>
          {t(k("privacy.choice.yes"))}
        </Action>
        <Action kind="primary" disabled={busy} onClick={() => void choose(false)}>
          {t(k("privacy.choice.no"))}
        </Action>
      </Actions>
    </Page>
  );
}
