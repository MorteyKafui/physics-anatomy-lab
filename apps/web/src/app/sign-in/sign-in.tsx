"use client";

import { createApi } from "@pa/api-client";
import { t } from "@pa/i18n";
import "@pa/i18n/access";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";

import { takeOver } from "../_access/handoff";
import { rich } from "../_access/rich";
import { INPUT, LEDE, PRIMARY, Problem, QUIET, SECONDARY, TITLE } from "../_access/screen";
import { Turnstile, turnstileOn } from "../_access/turnstile";

const api = createApi();

type Step = { at: "ask" } | { at: "sent"; email: string } | { at: "name" };

/** The approved email shape check is the API's; this only stops an obvious slip before sending. */
const looksLikeEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

/**
 * Teacher sign-in (design/mockups/SignIn.dc.html): an email link, or Google where the API has it
 * on. `expired` is the board's "This link has expired" state, which /sign-in/link opens.
 */
export function SignIn({
  expired = false,
  askName = false,
}: {
  expired?: boolean;
  askName?: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(askName ? { at: "name" } : { at: "ask" });
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [google, setGoogle] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const onToken = useCallback((tk: string | null) => setToken(tk), []);

  useEffect(() => {
    // After mount, so the server's HTML and the first paint match.
    void Promise.resolve().then(() => {
      const handed = takeOver("email");
      if (handed) setEmail(handed);
    });
    void api.auth.methods().then((r) => r.ok && setGoogle(r.data.google));
  }, []);

  const send = async (to: string) => {
    if (!looksLikeEmail(to)) return setProblem(t("access.signIn.badEmail"));
    setBusy(true);
    setProblem(null);
    const r = await api.auth.requestEmailLink(to, token);
    setBusy(false);
    if (!r.ok) return setProblem(r.detail);
    setStep({ at: "sent", email: to });
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void send(email.trim());
  };

  const saveName = async (e: FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      setBusy(true);
      const r = await api.auth.setName(name.trim());
      setBusy(false);
      if (!r.ok) return setProblem(r.detail);
    }
    router.push("/teach");
  };

  const waiting = turnstileOn && !token;

  return (
    <>
      {step.at === "ask" && (
        <>
          <div className="flex flex-col gap-2">
            <h1 className={TITLE}>{t(expired ? "access.expired.title" : "access.signIn.title")}</h1>
            <p className={LEDE}>{t(expired ? "access.expired.lede" : "access.signIn.lede")}</p>
          </div>
          <form onSubmit={submit} className="flex flex-col gap-2.5" noValidate>
            <label htmlFor="email" className="font-semibold">
              {t("access.signIn.email")}
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder={t("access.signIn.emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={INPUT}
            />
            <Turnstile onToken={onToken} />
            {problem && <Problem>{problem}</Problem>}
            <button type="submit" disabled={busy || waiting} className={PRIMARY}>
              {busy
                ? t("access.signIn.sending")
                : t(expired ? "access.expired.send" : "access.signIn.send")}
            </button>
            {google && !expired && (
              <>
                <div className="flex items-center gap-2.5 text-sm text-[var(--pa-on-paper-muted)]">
                  <span className="h-px flex-1 bg-[var(--pa-paper-line)]" />
                  {t("access.signIn.or")}
                  <span className="h-px flex-1 bg-[var(--pa-paper-line)]" />
                </div>
                <a href={api.auth.googleStartUrl()} className={SECONDARY}>
                  {t("access.signIn.google")}
                </a>
              </>
            )}
          </form>
          {!expired && (
            <div className="flex flex-col gap-1 border border-[var(--pa-paper-line)] bg-white p-4">
              <span className="font-semibold">{t("access.signIn.noAccount")}</span>
              <span className={LEDE}>{t("access.signIn.noAccount.about")}</span>
            </div>
          )}
        </>
      )}

      {step.at === "sent" && (
        <>
          <div className="flex flex-col gap-2">
            <h1 className={TITLE}>{t("access.sent.title")}</h1>
            <p className={LEDE}>
              {/* The address is shown as typed, never parsed as markup. */}
              {t("access.sent.lede").split("{email}")[0]}
              <b>{step.email}</b>
              {t("access.sent.lede").split("{email}")[1]}
            </p>
          </div>
          <ul className="m-0 flex flex-col gap-1.5 pl-5">
            <li>{t("access.sent.thisDevice")}</li>
            <li>{t("access.sent.spam")}</li>
            <li>{t("access.sent.close")}</li>
          </ul>
          {problem && <Problem>{problem}</Problem>}
          <div className="flex flex-col gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => void send(step.email)}
              className={SECONDARY}
            >
              {t("access.sent.again")}
            </button>
            <button type="button" onClick={() => setStep({ at: "ask" })} className={QUIET}>
              {t("access.sent.change")}
            </button>
          </div>
        </>
      )}

      {step.at === "name" && (
        <>
          <div className="flex flex-col gap-2">
            <h1 className={TITLE}>{t("access.name.title")}</h1>
            <p className="m-0 font-semibold">{t("access.name.ask")}</p>
            <p className={LEDE}>{t("access.name.why")}</p>
          </div>
          <form onSubmit={saveName} className="flex flex-col gap-2.5">
            <label htmlFor="tname" className="font-semibold">
              {t("access.name.label")}
            </label>
            <input
              id="tname"
              type="text"
              autoComplete="name"
              placeholder={t("access.name.placeholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={INPUT}
            />
            {problem && <Problem>{problem}</Problem>}
            <button type="submit" disabled={busy} className={PRIMARY}>
              {t("access.name.continue")}
            </button>
            <button type="button" onClick={() => router.push("/teach")} className={QUIET}>
              {t("access.name.skip")}
            </button>
          </form>
        </>
      )}

      <p className="m-0 text-[13px] text-[var(--pa-on-paper-muted)]">
        {rich(t("access.terms.signIn"))}
      </p>
    </>
  );
}
