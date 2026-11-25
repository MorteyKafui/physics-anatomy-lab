"use client";

import { t } from "@pa/i18n";
import "@pa/i18n/access";
import "@pa/i18n/landing";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { handOver } from "../_access/handoff";
import { rich } from "../_access/rich";

const focus =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pa-ink-950)]";

/**
 * The landing page's two forms (Main.dc.html, "Sign up"): a teacher's school email and a
 * student's class code. Each hands what was typed to its own screen, /sign-in or /join, which
 * carries Turnstile and the rest of the flow, so the landing page loads no third-party script.
 */
export function SignUpForms() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");

  const go = (kind: "email" | "code", value: string, to: string) => (e: FormEvent) => {
    e.preventDefault();
    if (value.trim()) handOver(kind, value.trim());
    router.push(to);
  };

  return (
    <>
      <form
        aria-label={t("landing.signUp.teachers")}
        onSubmit={go("email", email, "/sign-in")}
        className="flex min-w-0 flex-[1_1_340px] flex-col gap-3.5 bg-[var(--pa-ink-950)] p-7 text-[var(--pa-text)]"
      >
        <span className="text-[22px] font-semibold">{t("landing.signUp.teachers")}</span>
        <label htmlFor="su-email" className="text-sm text-[var(--pa-text-soft)]">
          {t("landing.signUp.email")}
        </label>
        <input
          id="su-email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@school.edu.gh"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-12 border border-[var(--pa-line-strong)] bg-[var(--pa-ink-850)] px-3.5 text-base text-[var(--pa-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pa-accent)]"
        />
        <button
          type="submit"
          className="flex h-12 items-center justify-center bg-[var(--pa-text)] font-semibold text-[var(--pa-ink-950)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pa-accent)]"
        >
          {t("landing.signUp.withEmail")}
        </button>
        <span className="text-[13px] text-[var(--pa-text-muted)] [&_a]:text-[var(--pa-accent-soft)]">
          {rich(t("landing.signUp.agree"))}
        </span>
      </form>
      <form
        aria-label={t("landing.signUp.join")}
        onSubmit={go("code", code, "/join")}
        className="flex min-w-0 flex-[1_1_300px] flex-col gap-3.5 bg-[var(--pa-paper)] p-7 text-[var(--pa-on-paper)]"
      >
        <span className="text-[22px] font-semibold">{t("landing.signUp.students")}</span>
        <label htmlFor="su-code" className="text-sm text-[var(--pa-on-paper-muted)]">
          {t("access.join.code")}
        </label>
        <input
          id="su-code"
          type="text"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder={t("access.join.codePlaceholder")}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className={`h-12 border border-[var(--pa-on-paper)] bg-white px-3.5 font-mono text-lg font-medium tracking-[0.08em] ${focus}`}
        />
        <button
          type="submit"
          className={`flex h-12 items-center justify-center bg-[var(--pa-ink-950)] font-semibold text-[var(--pa-paper)] ${focus}`}
        >
          {t("access.join.join")}
        </button>
        <Link
          prefetch={false}
          href="/lab/simple-pendulum"
          className={`text-center font-medium text-[var(--pa-on-paper)] underline ${focus}`}
        >
          {t("access.join.noCode")}
        </Link>
      </form>
    </>
  );
}
