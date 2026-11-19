"use client";
// The coach panel's Ask tab (design/mockups/AI.dc.html; docs/content/ai-tutor-brief.md).
//
// A thread lives in this component's memory only: it is never an event, so it is never synced,
// saved with the attempt or seen by the teacher, and it is gone when the step changes (the lab
// gives this component a new key) or the page closes. Nothing in the lab waits on it.
import { streamAi, type ThreadTurn } from "@pa/api-client";
import { t } from "@pa/i18n";
import "@pa/i18n/tutor";
import { Button } from "@pa/ui/components/button";
import { Textarea } from "@pa/ui/components/textarea";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";

import { QUESTIONS_PER_STEP, tutorContext, type TutorInput } from "./context";

type Pending =
  | { readonly status: "writing"; readonly question: string; readonly text: string }
  | { readonly status: "held"; readonly question: string; readonly message: string }
  | {
      readonly status: "error";
      readonly question: string;
      readonly message: string;
      readonly retry: boolean;
    };

export interface TutorPanelProps {
  /** The step's name as the student sees it, for the empty state. */
  readonly stepName: string;
  /** What the request is built from on the device: the attempt, the step, the bench's numbers. */
  readonly input: Omit<TutorInput, "question" | "thread">;
  /**
   * Reads a reply aloud. A lab with the spoken coach passes its own (the student's speed and
   * voice); otherwise the browser's own voice reads it, and with no voice the button is hidden.
   */
  readonly readAloud?: (text: string) => void;
}

/** The browser's own voice, in British English; undefined where the browser has none. */
function browserVoice(): ((text: string) => void) | undefined {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return undefined;
  return (text) => {
    window.speechSynthesis.cancel();
    const line = new SpeechSynthesisUtterance(text);
    line.lang = "en-GB";
    window.speechSynthesis.speak(line);
  };
}

export function TutorPanel({ stepName, input, readAloud: given }: TutorPanelProps) {
  const [readAloud] = useState(() => given ?? browserVoice());
  const [thread, setThread] = useState<ThreadTurn[]>([]);
  const [pending, setPending] = useState<Pending>();
  const [cutShort, setCutShort] = useState(false);
  const [draft, setDraft] = useState("");
  const stop = useRef<AbortController>(undefined);
  useEffect(() => () => stop.current?.abort(), []);

  const asked = thread.length / 2 + (pending?.status === "writing" ? 1 : 0);
  const left = Math.max(0, QUESTIONS_PER_STEP - asked);
  const writing = pending?.status === "writing";

  const ask = useCallback(
    async (question: string) => {
      const q = question.trim();
      if (!q || writing || thread.length / 2 >= QUESTIONS_PER_STEP) return;
      const controller = new AbortController();
      stop.current = controller;
      setDraft("");
      setCutShort(false);
      setPending({ status: "writing", question: q, text: "" });
      let text = "";
      for await (const event of streamAi(
        "/ai/tutor",
        tutorContext({ ...input, question: q, thread }),
        {
          signal: controller.signal,
        },
      )) {
        if (event.type === "text") {
          text += event.text;
          setPending({ status: "writing", question: q, text });
        } else if (event.type === "done") {
          setThread((th) => [...th, { role: "student", text: q }, { role: "tutor", text }]);
          setCutShort(event.cutShort);
          setPending(undefined);
        } else if (event.type === "refused") {
          setPending({ status: "held", question: q, message: event.message });
        } else {
          setPending({ status: "error", question: q, message: event.message, retry: event.retry });
        }
      }
      // Stopped: keep what arrived as an answer the student can read, outside the thread.
      if (controller.signal.aborted && text) {
        setThread((th) => [...th, { role: "student", text: q }, { role: "tutor", text }]);
        setCutShort(true);
        setPending(undefined);
      } else if (controller.signal.aborted) {
        setPending(undefined);
        setDraft(q);
      }
    },
    [input, thread, writing],
  );

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void ask(draft);
  };
  const lastReply = thread.at(-1)?.text;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div aria-live="polite" className="flex flex-1 flex-col gap-3 overflow-y-auto p-5">
        {thread.length === 0 && !pending && (
          <>
            <h2 className="font-display text-2xl leading-tight font-bold">
              {t("lab.tutor.title")}
            </h2>
            <p className="text-soft">{t("lab.tutor.intro", { step: stepName })}</p>
            <p className="text-xs text-muted-foreground">{t("lab.tutor.private")}</p>
          </>
        )}
        {thread.map((turn, i) =>
          turn.role === "student" ? (
            <p key={i} className="max-w-[85%] self-end border border-border bg-muted px-3 py-2.5">
              <span className="sr-only">{t("lab.tutor.you")}: </span>
              {turn.text}
            </p>
          ) : (
            <p key={i} className="max-w-[92%] self-start whitespace-pre-line">
              <span className="sr-only">{t("lab.tutor.tutor")}: </span>
              {turn.text}
            </p>
          ),
        )}
        {cutShort && <p className="text-xs text-muted-foreground">{t("lab.tutor.cutShort")}</p>}
        {lastReply !== undefined && !pending && readAloud && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => readAloud(lastReply)}>
              {t("lab.tutor.readAloud")}
            </Button>
            <span className="text-xs text-muted-foreground">{t("lab.tutor.captions")}</span>
          </div>
        )}
        {pending && (
          <p className="max-w-[85%] self-end border border-border bg-muted px-3 py-2.5">
            <span className="sr-only">{t("lab.tutor.you")}: </span>
            {pending.question}
          </p>
        )}
        {pending?.status === "writing" && (
          <div className="flex max-w-[92%] flex-col gap-2 self-start">
            {pending.text && <p className="whitespace-pre-line">{pending.text}</p>}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{t("lab.tutor.writing")}</span>
              <Button variant="outline" size="sm" onClick={() => stop.current?.abort()}>
                {t("lab.tutor.stop")}
              </Button>
            </div>
          </div>
        )}
        {(pending?.status === "held" || pending?.status === "error") && (
          <div role="status" className="flex flex-col gap-2 border border-warn bg-warn-wash p-3.5">
            <span className="font-semibold text-warn">
              {pending.status === "held" ? t("lab.tutor.hidden") : t("lab.tutor.noReply")}
            </span>
            <span>{pending.message}</span>
            {(pending.status === "held" || pending.retry) && (
              <Button className="self-start" onClick={() => void ask(pending.question)}>
                {t("lab.tutor.tryAgain")}
              </Button>
            )}
          </div>
        )}
      </div>
      <form onSubmit={submit} className="flex flex-col gap-1.5 border-t border-border px-5 py-3">
        <label htmlFor="tutor-question" className="text-xs text-muted-foreground">
          {t("lab.tutor.label")}
        </label>
        <div className="flex gap-2">
          <Textarea
            id="tutor-question"
            rows={1}
            maxLength={2000}
            value={draft}
            disabled={left === 0}
            placeholder={t("lab.tutor.placeholder")}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) submit(e);
            }}
          />
          <Button type="submit" disabled={writing || left === 0 || !draft.trim()}>
            {t("lab.tutor.send")}
          </Button>
        </div>
        <span className="font-mono text-xs text-muted-foreground">
          {left === 0
            ? t("lab.tutor.none")
            : t("lab.tutor.left", { n: left, total: QUESTIONS_PER_STEP })}
        </span>
      </form>
    </div>
  );
}
