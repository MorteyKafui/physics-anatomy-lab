"use client";
// The teacher's Questions page (design/mockups/Questions.dc.html, "Teacher: …";
// docs/content/ai-questions-brief.md). Claude drafts three follow-up questions for exam mode; the
// teacher edits them and sends the ones they want for review. Nothing reaches a student before a
// reviewer approves it in the admin portal.
import { createApi, streamAi, type QuestionOut } from "@pa/api-client";
import { t, type MessageKey } from "@pa/i18n";
import "@pa/i18n/teach";
import { Button } from "@pa/ui/components/button";
import { useEffect, useState } from "react";

import { ConsentGate } from "../../account/consent-gate";
import { canUse, useAiStatus } from "../../lab/tutor/use-ai-status";
import { FIELD, Shell } from "../panels";

const api = createApi();
const k = (key: string) => key as MessageKey;

// The experiments drafting knows (apps/api/app/ai/questions.py, FACTS).
const EXPERIMENTS = ["simple-pendulum"] as const;
const TOPICS = [
  "measuring",
  "precautions",
  "tabulation",
  "graph",
  "calculation",
  "theory",
] as const;
type Topic = (typeof TOPICS)[number];

interface Draft {
  question: string;
  answer: string;
  marks: number;
  keep: boolean;
}

type Drafting =
  | { readonly kind: "idle" }
  | { readonly kind: "working" }
  | { readonly kind: "held"; readonly message: string };

function draftsOf(item: Readonly<Record<string, unknown>>): Draft[] | undefined {
  if (!Array.isArray(item.questions)) return undefined;
  const out: Draft[] = [];
  for (const q of item.questions as unknown[]) {
    if (typeof q !== "object" || q === null) return undefined;
    const { question, answer, marks } = q as Record<string, unknown>;
    if (typeof question !== "string" || typeof answer !== "string" || typeof marks !== "number")
      return undefined;
    out.push({ question, answer, marks, keep: true });
  }
  return out;
}

export function Questions() {
  return (
    <ConsentGate teacher>
      <QuestionsPage />
    </ConsentGate>
  );
}

function QuestionsPage() {
  const status = useAiStatus();
  const [experiment, setExperiment] = useState<(typeof EXPERIMENTS)[number]>(EXPERIMENTS[0]);
  const [topic, setTopic] = useState<Topic>("precautions");
  const [note, setNote] = useState("");
  const [drafting, setDrafting] = useState<Drafting>({ kind: "idle" });
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [sent, setSent] = useState<QuestionOut[]>([]);
  const [said, setSaid] = useState<string>();
  const [sending, setSending] = useState(false);

  useEffect(() => {
    void api.questions.mine().then((r) => {
      if (r.ok) setSent(r.data);
    });
  }, []);

  const draft = async () => {
    setDrafting({ kind: "working" });
    setSaid(undefined);
    let held = t(k("teach.questions.held"));
    let got: Draft[] | undefined;
    for await (const event of streamAi("/ai/question-drafting", {
      experiment_id: experiment,
      topic,
      note: note.trim(),
    })) {
      if (event.type === "item") got = draftsOf(event.item);
      else if (event.type === "refused" || event.type === "error") held = event.message;
    }
    if (got) {
      setDrafts(got);
      setDrafting({ kind: "idle" });
    } else setDrafting({ kind: "held", message: held });
  };

  const kept = drafts.filter((d) => d.keep);
  const send = async () => {
    setSending(true);
    const r = await api.questions.submit({
      experiment_id: experiment,
      topic,
      questions: kept.map(({ question, answer, marks }) => ({ question, answer, marks })),
    });
    setSending(false);
    if (r.ok) {
      setSent((s) => [...r.data, ...s]);
      setDrafts([]);
      setSaid(t(k("teach.questions.sentOk")));
    } else setSaid(r.detail);
  };
  const change = (i: number, patch: Partial<Draft>) =>
    setDrafts((ds) => ds.map((d, j) => (j === i ? { ...d, ...patch } : d)));
  const aiOn = canUse(status, "question-drafting");

  return (
    <Shell>
      <span className="text-[13px] text-[var(--pa-text-faint)]">
        {t(k("teach.questions.where"))}
      </span>
      <h1 className="text-[15px] font-medium">{t(k("teach.questions.title"))}</h1>
      <p className="text-[var(--pa-text-soft)]">{t(k("teach.questions.intro"))}</p>

      <div className="flex flex-wrap gap-3">
        <label className="flex flex-[1_1_200px] flex-col gap-1.5 text-xs text-[var(--pa-text-faint)]">
          {t(k("teach.questions.experiment"))}
          <select
            className={FIELD}
            value={experiment}
            onChange={(e) => setExperiment(e.target.value as (typeof EXPERIMENTS)[number])}
          >
            {EXPERIMENTS.map((id) => (
              <option key={id} value={id}>
                {t(k(`experiments.${id}.title`))}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-[1_1_200px] flex-col gap-1.5 text-xs text-[var(--pa-text-faint)]">
          {t(k("teach.questions.topic"))}
          <select
            className={FIELD}
            value={topic}
            onChange={(e) => setTopic(e.target.value as Topic)}
          >
            {TOPICS.map((id) => (
              <option key={id} value={id}>
                {t(k(`teach.questions.topic.${id}`))}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="flex flex-col gap-1.5 text-xs text-[var(--pa-text-faint)]">
        {t(k("teach.questions.note"))}
        <textarea
          className={FIELD}
          rows={2}
          maxLength={300}
          value={note}
          placeholder={t(k("teach.questions.notePlaceholder"))}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          className="font-semibold"
          disabled={!aiOn || drafting.kind === "working"}
          onClick={() => void draft()}
        >
          {drafting.kind === "working"
            ? t(k("teach.questions.drafting"))
            : t(k("teach.questions.draft"))}
        </Button>
        <span className="text-xs text-[var(--pa-text-faint)]">
          {aiOn
            ? t(k("teach.questions.sentNote"))
            : t(k("teach.questions.noAi"), { reason: status?.message ?? "" })}
        </span>
      </div>

      {drafting.kind === "held" && (
        <div role="status" className="flex flex-col gap-1.5 border border-warn bg-warn-wash p-3.5">
          <span className="font-semibold text-warn">{t(k("teach.questions.held"))}</span>
          <span>{drafting.message}</span>
        </div>
      )}

      {drafts.length > 0 && (
        <section className="flex flex-col gap-3" aria-label={t(k("teach.questions.title"))}>
          <p className="text-xs text-[var(--pa-text-faint)]">{t(k("teach.questions.keepIntro"))}</p>
          {drafts.map((d, i) => (
            <div key={i} className="flex flex-col gap-2 border border-[var(--pa-ink-800)] p-3.5">
              <label className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={d.keep}
                  aria-label={t(k("teach.questions.keep"), { n: i + 1 })}
                  onChange={(e) => change(i, { keep: e.target.checked })}
                  className="size-5 accent-[var(--pa-accent)]"
                />
                <span className="font-semibold">
                  {t(k("teach.questions.number"), { n: i + 1 })}
                </span>
                <span className="text-xs text-[var(--pa-text-faint)]">
                  {d.marks === 1
                    ? t(k("teach.questions.marks.one"))
                    : t(k("teach.questions.marks"), { n: d.marks })}
                </span>
              </label>
              <label className="flex flex-col gap-1.5 text-xs text-[var(--pa-text-faint)]">
                {t(k("teach.questions.question"))}
                <textarea
                  className={FIELD}
                  rows={2}
                  value={d.question}
                  onChange={(e) => change(i, { question: e.target.value })}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-xs text-[var(--pa-text-faint)]">
                {t(k("teach.questions.answer"))}
                <textarea
                  className={FIELD}
                  rows={2}
                  value={d.answer}
                  onChange={(e) => change(i, { answer: e.target.value })}
                />
              </label>
            </div>
          ))}
          <div className="flex flex-wrap gap-3">
            <Button
              className="font-semibold"
              disabled={kept.length === 0 || sending}
              onClick={() => void send()}
            >
              {kept.length === 1
                ? t(k("teach.questions.send.one"))
                : t(k("teach.questions.send"), { n: kept.length })}
            </Button>
            <Button variant="outline" disabled={!aiOn} onClick={() => void draft()}>
              {t(k("teach.questions.again"))}
            </Button>
          </div>
        </section>
      )}
      {said && (
        <p role="status" className="text-[13px]">
          {said}
        </p>
      )}

      <h2 className="pt-2 text-[15px] font-medium">{t(k("teach.questions.sentTitle"))}</h2>
      {sent.length === 0 ? (
        <p className="text-[var(--pa-text-soft)]">{t(k("teach.questions.none"))}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {sent.map((q) => (
            <li key={q.id} className="flex flex-col gap-1 border border-[var(--pa-ink-800)] p-3">
              <span>{q.question}</span>
              <span className="text-xs text-[var(--pa-text-faint)]">
                {t(k(`teach.questions.state.${q.state}`))}
              </span>
              {q.reason && (
                <span className="text-xs text-[var(--pa-text-faint)]">
                  {t(k("teach.questions.reason"), { reason: q.reason })}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </Shell>
  );
}
