"use client";

import {
  coachIsOn,
  decideExam,
  EMPTY_EXAM,
  examProjection,
  frontier,
  replay,
  STEPS,
  type Advice,
  type Step,
} from "@pa/engine";
import { hasMessage, t } from "@pa/i18n";
import { Button } from "@pa/ui/components/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@pa/ui/components/tabs";
import { ChevronLeftIcon, Volume2Icon } from "@pa/ui/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { ExamBar } from "./exam/bar";
import { AssistMenu, HelpLevelSelect, SoundMenu } from "./lab-controls";
import { PracticalSwitch, ShareLink } from "./lab-switch";
import { TutorPanel } from "./lazy-panels";
import { Rail, StepStrip } from "./parts";
import { HelpMenu } from "./tutor/help-menu";
import { canUse, useAiStatus } from "./tutor/use-ai-status";
import { UncertaintySwitch } from "./uncertainty-switch";
import type { useAudio } from "./use-audio";
import { backToPractice, type AttemptHandle } from "./use-attempt";

type Audio = ReturnType<typeof useAudio>;

const msg = (key: string, params?: Record<string, string | number>) =>
  hasMessage(key) ? t(key, params) : "";

/**
 * What the coach says at each step of a practical whose copy follows the usual keys: the step's
 * title, then why it matters (or the question's text). A step without its own copy is named.
 */
export const spokenStepFor =
  (prefix: string) =>
  (step: Step): string => {
    const title = msg(`${prefix}.${step}.title`);
    if (!title) return t(`lab.steps.${step}`);
    const more = msg(`${prefix}.${step}.why`) || msg(`${prefix}.${step}.text`);
    return more ? `${title}. ${more}` : title;
  };

/**
 * The lab around a practical's bench, the same for every practical: the rail, the header with its
 * settings (help level, help per skill, uncertainties, sound, help, share), the exam bar, the
 * coach panel with its tabs, the spoken coach and its captions, and the step strip. A practical
 * gives only what is its own: the bench or the step's panel, each step's instructions, its
 * explanation and its tips. So every setting and every kind of help reaches all six practicals.
 */
export function LabFrame({
  experimentId,
  experimentVersion,
  handle,
  audio,
  uncertain,
  setUncertain,
  main,
  instructions,
  explanation,
  tips,
  advice,
  rowOf,
  spokenStep,
}: {
  experimentId: string;
  experimentVersion: number;
  handle: AttemptHandle;
  audio: Audio;
  uncertain: boolean;
  setUncertain: (on: boolean) => void;
  /** The centre of the lab: the bench, or the table, graph or analysis at those steps. */
  main: ReactNode;
  /** The current step's instructions, for the coach panel. */
  instructions: ReactNode;
  explanation: ReactNode;
  tips: ReactNode;
  /** The coach's corrections at this step: each is spoken once at each level it reaches. */
  advice: readonly Advice[];
  /** A finding's row, as the student numbers it, for the spoken correction. */
  rowOf?: (f: { rows?: readonly string[] }) => number | "";
  /** What the coach says on arriving at a step, and what Read aloud reads. */
  spokenStep: (step: Step) => string;
}) {
  const router = useRouter();
  const state = handle.state;
  const [tab, setTab] = useState("instructions");
  // AI (ADR 0043): asked once, off the critical path; the lab never waits for it.
  const aiStatus = useAiStatus();
  const showHint = useCallback(() => setTab("tips"), []);
  const showAsk = useCallback(() => setTab("ask"), []);

  // Exam mode: the clock, from the attempt's own events.
  const exam = useMemo(() => replay(examProjection, handle.attempt, handle.events), [handle]);
  const handIn = useCallback(
    async (auto: boolean) => {
      const now = replay(examProjection, handle.attempt, handle.events);
      const d = decideExam(handle.attempt.mode, now, { type: "hand-in", auto });
      if (d.ok) await handle.record(d.events);
      router.push(`/lab/${experimentId}/exam`);
    },
    [handle, router, experimentId],
  );
  const examNow = handle.attempt.mode === "exam" ? exam : EMPTY_EXAM;

  // The spoken coach: each step's instructions as the student arrives, and on turning sound on.
  const { say, read } = audio;
  const soundOn = audio.settings.on;
  const step = state.step;
  const line = spokenStep(step);
  useEffect(() => {
    if (soundOn) say(line, "step");
    // Said once per step: a new line for the same step (a reading taken) is not said again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, soundOn, say]);

  // Every correction the coach raises, said once at each level it reaches.
  const spoken = useRef(new Set<string>());
  useEffect(() => {
    for (const a of advice) {
      const id = `${a.finding.rule}:${a.level}`;
      if (spoken.current.has(id)) continue;
      spoken.current.add(id);
      const params = { ...a.finding.params, row: rowOf?.(a.finding) ?? "" };
      const parts = [msg(`${a.finding.key}.title`, params), msg(`${a.finding.key}.detail`, params)];
      if (a.level === "demonstrate") parts.push(msg(`${a.finding.key}.demonstrate`, params));
      say(parts.filter(Boolean).join(". "), "correction");
    }
  }, [advice, say, rowOf]);

  const tutorOn = coachIsOn(state) && canUse(aiStatus, "tutor");
  const tutorInput = {
    experimentId,
    experimentVersion,
    step: state.step,
    helpLevel: state.helpLevel,
    events: handle.events,
    quantities: [],
  };

  return (
    <div className="flex min-h-dvh bg-background text-foreground md:h-dvh">
      <Rail
        current="lab"
        help={
          <HelpMenu
            status={aiStatus}
            onHint={showHint}
            onAsk={showAsk}
            coachOn={coachIsOn(state)}
            place="rail"
          />
        }
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-border px-5 py-3">
          <Link
            prefetch={false}
            href="/"
            aria-label={t("lab.header.back")}
            className="flex size-11 items-center justify-center md:hidden"
          >
            <ChevronLeftIcon className="size-5" aria-hidden />
          </Link>
          <PracticalSwitch current={experimentId} step={state.step} completed={state.completed} />
          <span className="hidden flex-1 md:block" />
          <HelpLevelSelect handle={handle} />
          {state.mode !== "exam" && <UncertaintySwitch on={uncertain} onChange={setUncertain} />}
          <SoundMenu audio={audio} />
          <AssistMenu handle={handle} />
          <HelpMenu
            status={aiStatus}
            onHint={showHint}
            onAsk={showAsk}
            coachOn={coachIsOn(state)}
            place="header"
          />
          <ShareLink experimentId={experimentId} />
        </header>
        {handle.attempt.mode === "exam" &&
          examNow.startedAt !== undefined &&
          examNow.handedInAt === undefined && (
            <ExamBar startedAt={examNow.startedAt} onHandIn={(auto) => void handIn(auto)} />
          )}
        {handle.attempt.mode === "exam" && examNow.handedInAt !== undefined && (
          <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-border bg-surface px-5 py-3 text-sm">
            <span>{examNow.auto ? t("exam.timeUp") : t("exam.handedIn")}</span>
            <Link
              href={`/lab/${experimentId}/exam`}
              className="font-semibold underline underline-offset-2"
            >
              {t("exam.seeScript")}
            </Link>
            <button
              type="button"
              className="underline underline-offset-2"
              onClick={() => void backToPractice(experimentId).then(() => window.location.reload())}
            >
              {t("exam.backToPractice")}
            </button>
          </div>
        )}

        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          {main}
          <aside
            aria-label={t("lab.coach.label")}
            className="flex min-w-0 flex-col border-border bg-surface md:w-[380px] md:overflow-y-auto md:border-l"
          >
            <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
              <TabsList
                variant="line"
                className="h-auto! w-full justify-start gap-5 border-b border-border px-5 py-0"
              >
                {(["instructions", "explanation", "tips"] as const).map((v) => (
                  <TabsTrigger
                    key={v}
                    value={v}
                    className="flex-none px-0 py-3.5 text-sm after:bg-primary"
                  >
                    {t(`lab.coach.${v}`)}
                  </TabsTrigger>
                ))}
                {tutorOn && (
                  <TabsTrigger
                    value="ask"
                    className="flex-none px-0 py-3.5 text-sm after:bg-primary"
                  >
                    {t("lab.coach.askTab")}
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="instructions" className="flex flex-col gap-3.5 p-5">
                {/* Read aloud: for a student who learns by listening, whether or not the coach's
                    voice is on. */}
                {state.mode !== "exam" && line && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-2 self-start text-muted-foreground"
                    onClick={() => read(line)}
                  >
                    <Volume2Icon aria-hidden />
                    {t("lab.audio.readAloud")}
                  </Button>
                )}
                {instructions}
              </TabsContent>
              <TabsContent value="explanation" className="flex flex-col gap-3.5 p-5">
                {explanation}
              </TabsContent>
              <TabsContent value="tips" className="flex flex-col gap-3 p-5">
                {tips}
              </TabsContent>
              {tutorOn && (
                <TabsContent value="ask" className="flex min-h-[420px] flex-col">
                  <TutorPanel
                    key={state.step}
                    stepName={t(`lab.steps.${state.step}`)}
                    input={tutorInput}
                  />
                </TabsContent>
              )}
            </Tabs>
          </aside>
        </div>

        {audio.settings.on && (
          <p
            role="status"
            aria-label={t("lab.audio.caption")}
            className="min-h-10 border-t border-border bg-surface px-5 py-2.5 text-sm"
          >
            {audio.caption}
          </p>
        )}
        <StepStrip
          current={state.step}
          completed={state.completed}
          open={(s) => STEPS.indexOf(s) <= STEPS.indexOf(frontier(state))}
          onGo={(s) => void handle.dispatch({ type: "go-to-step", step: s })}
        />
      </div>
    </div>
  );
}
