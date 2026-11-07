"use client";

import { eventsBefore, examProjection, replay, type LabEvent } from "@pa/engine";
import {
  EXAM_MINUTES,
  EXAM_PARTS,
  examClock,
  followUps,
  markScript,
  simplePendulum,
  type Mark,
} from "@pa/experiments";
import { t, type MessageKey } from "@pa/i18n";
import { DEFAULT_ENVIRONMENT } from "@pa/instruments";
import { cn, Logo } from "@pa/ui";
import { Button } from "@pa/ui/components/button";
import { CheckIcon, MinusIcon, XIcon } from "@pa/ui/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { reportContent } from "../report/content";
import { save } from "../snapshot-export";
import { startExam, useAttempt } from "../use-attempt";
import { mmss } from "./bar";
import { examFacts } from "./facts";

const E = simplePendulum;
const G = DEFAULT_ENVIRONMENT.g;

const itemText = (id: string) => t(`exam.item.${id}` as MessageKey, { swings: E.swings });
const lostText = (m: Mark) =>
  m.lost ? t(`exam.lost.${m.lost.key}` as MessageKey, m.lost.params) : undefined;

/** The events up to the hand-in: the script is marked as it was handed in, and never changes. */
function asHandedIn(events: readonly LabEvent[]): LabEvent[] {
  const handIn = events.find((e) => e.kind === "exam.hand-in");
  return handIn ? [...eventsBefore(events, handIn), handIn] : [...events];
}

/**
 * Exam mode (approved board Exam.dc.html): the question and the guide's split of the hour before
 * the clock starts, and the marked script with likely follow-up questions after the hand-in.
 */
export function ExamScreen() {
  const handle = useAttempt(E.id);
  const router = useRouter();
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<string>();
  const [now] = useState(() => Date.now());
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(undefined), 6000);
    return () => clearTimeout(id);
  }, [toast]);

  const attempt = handle?.attempt;
  const events = handle?.events;
  const exam = useMemo(
    () => (attempt && events ? replay(examProjection, attempt, events) : undefined),
    [attempt, events],
  );
  const marked = useMemo(() => {
    if (!attempt || !events || attempt.mode !== "exam" || !exam?.handedInAt) return undefined;
    const report = reportContent(attempt, asHandedIn(events), G);
    return markScript(examFacts(report));
  }, [attempt, events, exam]);

  if (!handle || !exam) {
    return (
      <main
        className="flex min-h-dvh items-center justify-center bg-background text-muted-foreground"
        aria-busy="true"
      >
        {t("lab.loading")}
      </main>
    );
  }

  const running =
    handle.attempt.mode === "exam" && exam.startedAt !== undefined && !exam.handedInAt;
  const questions = followUps(G).map((q) => ({
    id: q.id,
    q: t(`exam.q.${q.id}` as MessageKey, q.params),
    a: t(`exam.a.${q.id}` as MessageKey, q.params),
  }));
  const used =
    exam.startedAt !== undefined && exam.handedInAt !== undefined
      ? Math.min(EXAM_MINUTES, Math.ceil((exam.handedInAt - exam.startedAt) / 60_000))
      : 0;

  const begin = async () => {
    await startExam(E.id);
    router.push(`/lab/${E.id}`);
  };

  const download = async () => {
    if (!marked) return;
    const [{ scriptPdf }, { loadFonts }] = await Promise.all([
      import("./pdf"),
      import("../report/pdf"),
    ]);
    const pdf = await scriptPdf(
      {
        title: `${t("experiments.simple-pendulum.title")}: ${t("exam.script").toLowerCase()}`,
        date: new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(
          handle.attempt.createdAt,
        ),
        got: marked.got,
        of: marked.of,
        timeUsed: t("exam.timeUsedValue", { used, of: EXAM_MINUTES }),
        sections: marked.sections,
        itemText,
        lostText,
        followUps: questions,
      },
      await loadFonts(),
      "a4",
    );
    save(pdf.bytes, `${E.id}-exam-script.pdf`, "application/pdf");
    setToast(pdf.pages === 1 ? t("exam.made.one") : t("exam.made", { pages: pdf.pages }));
  };

  return (
    <main className="flex min-h-dvh flex-col gap-3.5 bg-[var(--pa-ink-1000)] p-3.5 text-foreground">
      <header className="flex flex-wrap items-center gap-x-3.5 gap-y-2.5 border border-border bg-[var(--pa-ink-900)] px-4 py-3">
        <Link
          href="/"
          aria-label={t("lab.rail.home")}
          className="flex size-[30px] items-center justify-center bg-foreground text-background"
        >
          <Logo size={20} />
        </Link>
        <nav
          aria-label={t("review.back")}
          className="flex items-center gap-2 text-muted-foreground"
        >
          <Link href={`/lab/${E.id}`} className="hover:text-foreground">
            {t("experiments.simple-pendulum.title")}
          </Link>
          <span aria-hidden>›</span>
          <h1 className="text-foreground" aria-current="page">
            {t("exam.title")}
          </h1>
        </nav>
        <span className="border border-input px-2 py-0.5 text-xs text-soft">
          {t("exam.coachOff")}
        </span>
      </header>

      {marked ? (
        <div className="flex flex-wrap items-stretch gap-3.5">
          <section
            aria-label={t("exam.script")}
            className="flex min-w-0 flex-[999_1_620px] flex-col border border-border bg-[var(--pa-ink-900)]"
          >
            <div className="flex flex-wrap items-end gap-x-7 gap-y-3 border-b border-border px-[18px] py-4">
              <span className="flex flex-col">
                <span className="text-xs text-muted-foreground">{t("exam.mark")}</span>
                <span className="font-mono text-[34px] font-medium">
                  {marked.got} <span className="text-lg text-muted-foreground">/ {marked.of}</span>
                </span>
              </span>
              <span className="flex flex-col">
                <span className="text-xs text-muted-foreground">{t("exam.timeUsed")}</span>
                <span className="font-mono">
                  {t("exam.timeUsedValue", { used, of: EXAM_MINUTES })}
                </span>
              </span>
              <span className="flex-1" />
              <span className="max-w-64 text-right text-xs text-muted-foreground">
                {t("exam.markedBy")}
              </span>
            </div>
            <div className="flex flex-col gap-3.5 px-[18px] py-3.5">
              {marked.sections.map((s) => (
                <div key={s.id} className="flex flex-col gap-1.5">
                  <div className="flex items-baseline justify-between border-b border-input pb-1">
                    <h2 className="text-sm font-semibold">
                      {t(`exam.section.${s.id}` as MessageKey)}
                    </h2>
                    <span className="font-mono text-[13px]">
                      {s.got} / {s.of}
                    </span>
                  </div>
                  <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                    {s.items.map((m) => {
                      const full = m.got === m.of;
                      const part = !full && m.got > 0;
                      const Icon = full ? CheckIcon : part ? MinusIcon : XIcon;
                      return (
                        <li key={m.id} className="flex items-start gap-2.5 text-[13px]">
                          <span
                            className={cn(
                              "flex size-[18px] shrink-0 items-center justify-center border",
                              full
                                ? "border-ok text-ok"
                                : part
                                  ? "border-warn text-warn"
                                  : "border-danger text-danger",
                            )}
                          >
                            <Icon className="size-3" strokeWidth={3} aria-hidden />
                          </span>
                          <span className="flex flex-1 flex-col">
                            <span>{itemText(m.id)}</span>
                            {lostText(m) && (
                              <span className="text-muted-foreground">{lostText(m)}</span>
                            )}
                          </span>
                          <span className="font-mono text-soft">
                            {m.got}/{m.of}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </section>
          <aside
            aria-label={t("exam.followUps")}
            className="flex max-w-[480px] flex-[1_1_340px] flex-col border border-border bg-[var(--pa-ink-900)]"
          >
            <h2 className="border-b border-border px-4 py-3 text-[15px] font-medium">
              {t("exam.followUps")}
            </h2>
            <div className="flex flex-col gap-3 px-4 py-3">
              {questions.map((q) => (
                <div key={q.id} className="flex flex-col gap-1.5 border-b border-border pb-2.5">
                  <span>{q.q}</span>
                  {open[q.id] && (
                    <span id={`answer-${q.id}`} className="text-[13px] text-soft">
                      {q.a}
                    </span>
                  )}
                  <Button
                    variant="outline"
                    className="h-[30px] self-start"
                    aria-expanded={!!open[q.id]}
                    aria-controls={`answer-${q.id}`}
                    onClick={() => setOpen((o) => ({ ...o, [q.id]: !o[q.id] }))}
                  >
                    {open[q.id] ? t("exam.hide") : t("exam.show")}
                  </Button>
                </div>
              ))}
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  className="h-[38px] bg-foreground font-semibold text-background hover:bg-soft"
                  onClick={() => void download()}
                >
                  {t("exam.download")}
                </Button>
                <Link
                  href={`/lab/${E.id}/review`}
                  className="flex h-[38px] items-center border border-input px-3.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring"
                >
                  {t("exam.review")}
                </Link>
              </div>
            </div>
          </aside>
        </div>
      ) : running ? (
        <section className="flex flex-col items-start gap-3 border border-border bg-[var(--pa-ink-900)] p-5">
          <p>{t("exam.running", { left: mmss(examClock(exam.startedAt!, now).left) })}</p>
          <Link
            href={`/lab/${E.id}`}
            className="flex h-10 items-center bg-primary px-4 text-sm font-semibold text-primary-foreground"
          >
            {t("exam.backToExam")}
          </Link>
        </section>
      ) : (
        <div className="flex flex-wrap items-stretch gap-3.5">
          <section
            aria-label={t("exam.question.meta", { minutes: EXAM_MINUTES })}
            className="flex min-w-0 flex-[999_1_620px] flex-col gap-3.5 border border-border bg-[var(--pa-ink-900)] px-[22px] py-5"
          >
            <span className="text-xs text-muted-foreground">
              {t("exam.question.meta", { minutes: EXAM_MINUTES })}
            </span>
            <h2 className="font-display text-[30px] leading-tight font-bold">
              {t("exam.question.lead")}
            </h2>
            <ol className="m-0 flex flex-col gap-2 pl-5 text-soft">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <li key={n}>{t(`exam.question.${n}` as MessageKey, { swings: E.swings })}</li>
              ))}
            </ol>
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <Button className="h-10 px-4 font-semibold" onClick={() => void begin()}>
                {t("exam.start")}
              </Button>
              <Link
                href={`/lab/${E.id}`}
                className="flex h-10 items-center border border-input px-3.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring"
              >
                {t("exam.back")}
              </Link>
              <span className="text-xs text-muted-foreground">{t("exam.startHint")}</span>
            </div>
          </section>
          <aside
            aria-label={t("exam.split")}
            className="flex max-w-[460px] flex-[1_1_340px] flex-col border border-border bg-[var(--pa-ink-900)]"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="text-[15px] font-medium">{t("exam.split")}</h2>
              <span className="font-mono text-xs text-muted-foreground">
                {t("exam.minutes", { n: EXAM_MINUTES })}
              </span>
            </div>
            <ul className="m-0 flex list-none flex-col px-4 pt-2 pb-3.5">
              {EXAM_PARTS.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center gap-2.5 border-b border-border py-[7px]"
                >
                  <span
                    aria-hidden
                    className={cn(
                      "h-1.5 shrink-0",
                      p.id === "performing" ? "bg-primary" : "bg-[var(--pa-line-strong)]",
                    )}
                    style={{ width: p.minutes * 4 }}
                  />
                  <span className="flex-1">{t(`exam.part.${p.id}` as MessageKey)}</span>
                  <span className="font-mono text-[13px] text-soft">
                    {t("exam.minutes", { n: p.minutes })}
                  </span>
                </li>
              ))}
            </ul>
            <span className="px-4 pb-3.5 text-xs text-muted-foreground">{t("exam.splitHint")}</span>
          </aside>
        </div>
      )}

      <div
        role="status"
        className="pointer-events-none fixed right-4 bottom-4 z-40 md:right-7 md:bottom-7"
      >
        {toast && (
          <div className="flex max-w-[380px] items-start gap-3 bg-foreground px-3.5 py-3 text-[13px] text-background">
            {toast}
          </div>
        )}
      </div>
    </main>
  );
}
