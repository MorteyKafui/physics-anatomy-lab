"use client";

import { createApi, type JoinPreview } from "@pa/api-client";
import { t } from "@pa/i18n";
import "@pa/i18n/access";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";

import { takeOver } from "../_access/handoff";
import { rich } from "../_access/rich";
import { FOCUS, INPUT, LEDE, PRIMARY, Problem, QUIET, TITLE } from "../_access/screen";
import { Turnstile, turnstileOn } from "../_access/turnstile";

const api = createApi();

/** Where a student starts once they have joined. */
const START = "/lab/simple-pendulum";

/**
 * Joining a class (design/mockups/Join.dc.html; ADR 0011): a class code, then the class and its
 * plain-words notices, a display name and the Terms tick. No email, age or phone number. The
 * board's analytics question is left out: students are never asked about analytics (ADR 0042).
 */
export function Join() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [found, setFound] = useState<JoinPreview | null>(null);
  const [name, setName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const onToken = useCallback((tk: string | null) => setToken(tk), []);

  const find = useCallback(async (raw: string) => {
    const c = raw.trim();
    if (!c) return;
    setBusy(true);
    setProblem(null);
    const r = await api.join.preview(c);
    setBusy(false);
    if (!r.ok) return setProblem(r.detail);
    setCode(c);
    setFound(r.data);
  }, []);

  useEffect(() => {
    // A code typed on the landing page; after mount, so the first paint matches the server's.
    void Promise.resolve().then(() => {
      const handed = takeOver("code");
      if (handed) {
        setCode(handed);
        void find(handed);
      }
    });
  }, [find]);

  const join = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setProblem(t("access.join.needName"));
    if (!agreed) return setProblem(t("access.join.needAgree"));
    setBusy(true);
    setProblem(null);
    const r = await api.join.join({
      code,
      display_name: name.trim(),
      agreed_to_terms: true,
      ...(token ? { turnstile_token: token } : {}),
    });
    setBusy(false);
    if (!r.ok) return setProblem(r.detail);
    router.push(START);
  };

  if (!found)
    return (
      <>
        <div className="flex flex-col gap-2">
          <h1 className={TITLE}>{t("access.join.codeTitle")}</h1>
          <p className={LEDE}>{t("access.join.codeLede")}</p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void find(code);
          }}
          className="flex flex-col gap-2.5"
        >
          <label htmlFor="code" className="font-semibold">
            {t("access.join.code")}
          </label>
          <input
            id="code"
            type="text"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder={t("access.join.codePlaceholder")}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className={`${INPUT} font-mono text-lg tracking-[0.08em]`}
          />
          {problem && <Problem>{problem}</Problem>}
          <button type="submit" disabled={busy || !code.trim()} className={PRIMARY}>
            {busy ? t("access.join.finding") : t("access.join.find")}
          </button>
        </form>
        <Link prefetch={false} href={START} className={QUIET}>
          {t("access.join.noCode")}
        </Link>
      </>
    );

  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className={TITLE}>{t("access.join.title", { className: found.class_name })}</h1>
        <p className={LEDE}>
          {found.teacher_name
            ? t("access.join.teacher", { teacher: found.teacher_name })
            : t("access.join.noTeacherName")}
        </p>
      </div>
      <div className="flex flex-col gap-2 border border-[var(--pa-paper-line)] bg-white p-4">
        <span className="font-semibold">{t("access.join.plain")}</span>
        <ul className="m-0 flex flex-col gap-1.5 pl-5">
          <li>{t("access.join.plain.noDetails")}</li>
          <li>{t("access.join.plain.teacherSees")}</li>
          <li>{t("access.join.plain.noMessages")}</li>
          <li>
            {rich(t(found.ai_enabled ? "access.join.plain.aiOn" : "access.join.plain.aiOff"))}
          </li>
          <li>{t("access.join.plain.delete")}</li>
        </ul>
        <Link prefetch={false} href="/privacy" className="self-start underline">
          {t("access.join.policy")}
        </Link>
      </div>
      <form onSubmit={join} className="flex flex-col gap-2.5" noValidate>
        <label htmlFor="dname" className="font-semibold">
          {t("access.join.name")}
        </label>
        <input
          id="dname"
          type="text"
          autoComplete="nickname"
          maxLength={40}
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-describedby="dname-hint"
          className={INPUT}
        />
        <span id="dname-hint" className="text-sm text-[var(--pa-on-paper-muted)]">
          {t("access.join.nameHint")}
        </span>
        <label htmlFor="agree" className="flex items-start gap-2.5">
          <input
            id="agree"
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className={`mt-1 size-5 shrink-0 accent-[var(--pa-on-paper)] ${FOCUS}`}
          />
          <span>{rich(t("access.join.agree"))}</span>
        </label>
        <Turnstile onToken={onToken} />
        {problem && <Problem>{problem}</Problem>}
        <button type="submit" disabled={busy || (turnstileOn && !token)} className={PRIMARY}>
          {busy ? t("access.join.joining") : t("access.join.join")}
        </button>
        <button
          type="button"
          onClick={() => {
            setFound(null);
            setProblem(null);
          }}
          className={QUIET}
        >
          {t("access.join.otherCode")}
        </button>
      </form>
    </>
  );
}
