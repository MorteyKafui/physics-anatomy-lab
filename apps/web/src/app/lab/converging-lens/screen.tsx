"use client";

import { OpticalBench, ScreenFace } from "@pa/apparatus";
import { runRules, type Finding, type Skill } from "@pa/analysis";
import {
  coach,
  coachIsOn,
  HELP_LEVELS,
  helpLevelFor,
  replay,
  STEPS,
  type Advice,
  type HelpLevel,
  type Step,
} from "@pa/engine";
import {
  asLensReading,
  convergingLens,
  decideLensBench,
  GAUZE_REACH,
  LENS_PROCEDURE_RULES,
  lensBenchProjection,
  lensReadingData,
  readPosition,
  recordedPosition,
  screenImage,
  type LensBenchCommand,
  type LensReading,
} from "@pa/experiments";
import { hasMessage, t, type MessageKey } from "@pa/i18n";
// The lens copy is kept apart from the shared messages; this lab registers it.
import "@pa/i18n/converging-lens";
import { createRng } from "@pa/instruments";
import { Button } from "@pa/ui/components/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@pa/ui/components/tabs";
import { ChevronLeftIcon, TriangleAlertIcon } from "@pa/ui/icons";
import Link from "next/link";
import { useMemo, useState } from "react";

import { CheckItem, Rail, StepStrip } from "../parts";
import { useAttempt } from "../use-attempt";

const E = convergingLens;
const P = "experiments.converging-lens";
const msg = (key: string, params?: Record<string, string | number>) =>
  hasMessage(key) ? t(key as MessageKey, params) : key;
const stepName = (s: Step) => t(`lab.steps.${s}` as MessageKey);
const cm = (m: number) => (m * 100).toFixed(1);
/** The first reading's object distance, m, as the question sets it. */
const FIRST_U = E.objectDistances[0];
const MM = 0.001;

/**
 * The converging lens lab (the approved board "The converging lens: finding the image"): the
 * same lab as the others, with the optical bench. Steps 1 to 5 are built here; tabulating,
 * plotting, the analysis and the report come next.
 */
export function ConvergingLensScreen() {
  const handle = useAttempt(E.id);
  const [tab, setTab] = useState("instructions");
  const [refusal, setRefusal] = useState<string>();
  const [advice, setAdvice] = useState<Advice[]>([]);
  const [checked, setChecked] = useState<string>();
  // A slider's place while it is being dragged; recorded when it is let go.
  const [draft, setDraft] = useState<{ part: "lens" | "screen"; to: number }>();

  const bench = useMemo(
    () => (handle ? replay(lensBenchProjection, handle.attempt, handle.events) : undefined),
    [handle],
  );
  const prediction = useMemo(() => {
    const e = handle?.events.findLast((x) => x.kind === "converging-lens.predict");
    const choice = (e?.data as { choice?: string } | null)?.choice;
    return choice === "rise" || choice === "fall" || choice === "same" ? choice : undefined;
  }, [handle]);

  if (!handle || !bench) {
    return (
      <main
        className="flex min-h-dvh items-center justify-center text-muted-foreground"
        aria-busy="true"
      >
        {t("lab.loading")}
      </main>
    );
  }

  const state = handle.state;
  const stepIndex = STEPS.indexOf(state.step);
  const percent = Math.round((state.completed.length / STEPS.length) * 100);
  const next = STEPS[stepIndex + 1];
  const world = bench.world;

  const act = async (command: LensBenchCommand) => {
    const d = decideLensBench(bench, command);
    if (!d.ok) {
      setRefusal(t(`${P}.refused.${d.reason}` as MessageKey));
      return false;
    }
    setRefusal(undefined);
    await handle.record(d.events);
    return true;
  };
  const finishStep = async () => {
    await handle.dispatch({ type: "complete-step" });
    if (next) await handle.dispatch({ type: "go-to-step", step: next });
    setAdvice([]);
    setRefusal(undefined);
  };
  /** Finish a step, first letting the coach act once on what the step's checks found. */
  const finishChecked = async (findings: readonly Finding[], signature: string) => {
    const real = findings.filter((f) => f.severity !== "good");
    if (real.length && checked !== signature) {
      setChecked(signature);
      const out = coach(handle.state, real, "step-exit");
      await handle.record(out.events);
      setAdvice(out.advice);
      if (out.advice.length) return;
    }
    await finishStep();
  };

  const building = state.step === "build";
  const measuring = state.step === "measure";
  const shown = draft ? { ...bench, [draft.part]: draft.to } : bench;
  const image = screenImage(world, shown);
  const u = shown.lens - shown.object;
  const coaxial = Math.abs(bench.offAxis) <= E.coaxialTolerance;
  const atFirstU = Math.abs(bench.lens - bench.object - FIRST_U) < 0.0005;

  const readings = state.readings
    .map(asLensReading)
    .filter((r): r is LensReading => r !== undefined);
  const procedure = runRules(LENS_PROCEDURE_RULES, { readings, noImageAt: bench.noImageAt });
  const coaxialFinding = runRules(
    LENS_PROCEDURE_RULES.filter((r) => r.id === "lens-not-coaxial"),
    {
      readings: [
        {
          id: "bench",
          u: 0,
          v: 0,
          blur: 0,
          sharpestAt: 0,
          s: 0,
          readFrom: "centre",
          viewAngleDeg: 0,
          offAxis: bench.offAxis,
        },
      ],
      noImageAt: [],
    },
  );

  // Help levels, as in the other labs (master plan, "Assist levels").
  const levelFor = (skill: Skill): HelpLevel =>
    coachIsOn(state) ? helpLevelFor(state, skill) : "on-my-own";
  const measureMarks = levelFor("measurement") !== "on-my-own";

  const takeReading = async () => {
    const rng = createRng((handle.attempt.seed ^ (readings.length + 1)) >>> 0);
    const read = (x: number) => recordedPosition(readPosition(x, { rng }));
    const o = read(bench.object);
    const data = lensReadingData(bench, {
      u: Number((read(bench.lens) - o).toFixed(1)),
      v: Number((read(bench.screen) - read(bench.lens)).toFixed(1)),
    });
    if (!data) {
      setRefusal(t(`${P}.measure.cannot`));
      return;
    }
    setRefusal(undefined);
    await handle.dispatch({
      type: "record-reading",
      id: `reading-${globalThis.crypto.randomUUID().slice(0, 8)}`,
      data,
    });
  };

  const findingCard = (
    f: { key: string; params?: Record<string, string | number> },
    demonstrate = true,
  ) => (
    <div
      key={f.key}
      role="status"
      className="flex flex-col gap-2.5 border border-warn bg-warn-wash p-3.5"
    >
      <span className="flex items-center gap-2 font-semibold text-warn">
        <TriangleAlertIcon className="size-4" aria-hidden />
        {msg(`${f.key}.title`, f.params)}
      </span>
      <span className="text-soft">{msg(`${f.key}.detail`, f.params)}</span>
      {demonstrate && hasMessage(`${f.key}.demonstrate`) && (
        <span className="text-muted-foreground">{msg(`${f.key}.demonstrate`)}</span>
      )}
    </div>
  );
  const adviceCards = advice.map((a) => findingCard(a.finding, a.level === "demonstrate"));

  const imageState = image.kind !== "image" ? "none" : image.sharp ? "sharp" : "blurred";
  const description = t(`${P}.bench`, {
    object: cm(shown.object),
    lens: cm(shown.lens),
    screen: cm(shown.screen),
    image: t(`${P}.bench.${imageState}` as MessageKey),
  });
  const screenSize = 2 * E.screenHalfHeight;
  const face =
    image.kind === "image"
      ? {
          blur: Math.min(0.2, image.blur / screenSize / 4),
          size: Math.min(0.9, (2 * E.objectHalfHeight * image.magnification) / screenSize),
          offset: image.offset / screenSize,
        }
      : undefined;
  const faceLabel =
    image.kind !== "image"
      ? t(`${P}.screen.none`)
      : !image.onScreen
        ? t(`${P}.screen.offScreen`)
        : t(image.sharp ? `${P}.screen.sharp` : `${P}.screen.blurred`);

  const slider = (part: "lens" | "screen") => {
    const value = (draft?.part === part ? draft.to : bench[part]) * 100;
    const commit = () => {
      if (draft?.part !== part) return;
      const to = draft.to;
      setDraft(undefined);
      void act({ type: "move", part, to });
    };
    return (
      <label className="flex flex-col gap-1.5 text-sm text-muted-foreground">
        <span className="flex justify-between">
          {t(`${P}.measure.${part}`)}
          <span className="font-mono text-foreground">{value.toFixed(1)} cm</span>
        </span>
        <input
          type="range"
          min={0}
          max={100}
          step={0.1}
          value={value}
          aria-valuetext={`${value.toFixed(1)} cm`}
          className="w-full accent-primary"
          onChange={(e) => setDraft({ part, to: Number(e.target.value) / 100 })}
          onPointerUp={commit}
          onKeyUp={commit}
          onBlur={commit}
        />
      </label>
    );
  };

  return (
    <div className="flex min-h-dvh bg-background text-foreground md:h-dvh">
      <Rail current="lab" />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-border px-5 py-3">
          <Link
            href="/"
            aria-label={t("lab.header.back")}
            className="flex size-11 items-center justify-center md:hidden"
          >
            <ChevronLeftIcon className="size-5" aria-hidden />
          </Link>
          <div className="flex items-center gap-3 md:border md:border-border md:bg-surface md:px-3.5 md:py-2">
            <span aria-hidden className="hidden size-2.5 bg-topic-light md:block" />
            <div className="flex flex-col">
              <h1 className="font-semibold">{t(`${P}.title`)}</h1>
              <span className="font-mono text-xs text-muted-foreground">
                {t("lab.header.stepOf", {
                  n: stepIndex + 1,
                  total: STEPS.length,
                  step: stepName(state.step),
                })}
              </span>
            </div>
            <div
              className="hidden h-1 w-30 bg-border md:block"
              role="img"
              aria-label={t("lab.header.progress", { percent })}
            >
              <div className="h-1 bg-primary" style={{ width: `${percent}%` }} />
            </div>
          </div>
          <span className="hidden flex-1 md:block" />
          <label className="hidden items-center gap-2 text-sm text-muted-foreground md:flex">
            <span className="sr-only min-[1320px]:not-sr-only">{t("lab.helpLevel.label")}</span>
            <select
              className="h-9 border border-input bg-surface px-2.5 text-sm font-medium text-foreground"
              value={state.helpLevel}
              onChange={(e) =>
                void handle.dispatch({ type: "set-help-level", level: e.target.value as HelpLevel })
              }
            >
              {HELP_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {t(`lab.helpLevel.${level}` as MessageKey)}
                </option>
              ))}
            </select>
          </label>
          <span className="border border-border px-2.5 py-1 text-xs text-muted-foreground">
            {t(`${P}.inDevelopment`)}
          </span>
        </header>

        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <section className="flex min-w-0 flex-1 flex-col items-center gap-4 overflow-y-auto px-4 pt-6 pb-10 md:px-6">
            <div className="w-full max-w-[760px]">
              <OpticalBench
                className="block h-auto w-full"
                label={description}
                object={shown.object}
                lens={shown.lens}
                screen={shown.screen}
                offAxis={shown.offAxis}
                objectHalfHeight={E.objectHalfHeight}
                image={
                  image.kind === "image"
                    ? { at: image.sharpestAt, magnification: image.magnification }
                    : undefined
                }
              />
            </div>
            <div className="flex w-full max-w-[760px] flex-wrap items-stretch gap-4">
              <div className="flex flex-col gap-2 border border-border bg-surface p-3">
                <span className="text-xs text-muted-foreground">{t(`${P}.measure.onScreen`)}</span>
                <ScreenFace image={face} label={faceLabel} />
                <span
                  className={
                    imageState === "sharp"
                      ? "self-start border border-ok px-2 py-0.5 text-xs text-ok"
                      : "self-start border border-warn px-2 py-0.5 text-xs text-warn"
                  }
                >
                  {t(
                    imageState === "sharp"
                      ? `${P}.measure.sharp`
                      : imageState === "blurred"
                        ? `${P}.measure.blurred`
                        : `${P}.measure.noImage`,
                  )}
                </span>
              </div>
              <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-3 border border-border bg-surface p-3.5">
                {slider("lens")}
                {slider("screen")}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() =>
                      void act({ type: "move", part: "screen", to: bench.screen - MM })
                    }
                  >
                    {t(`${P}.measure.towards`)}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() =>
                      void act({ type: "move", part: "screen", to: bench.screen + MM })
                    }
                  >
                    {t(`${P}.measure.away`)}
                  </Button>
                </div>
                <span className="text-xs text-muted-foreground">{t(`${P}.measure.step`)}</span>
              </div>
            </div>
            {refusal && (
              <p
                role="alert"
                className="w-full max-w-[760px] border border-warn bg-warn-wash p-3 text-sm"
              >
                {refusal}
              </p>
            )}
          </section>

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
              </TabsList>

              <TabsContent value="instructions" className="flex flex-col gap-3.5 p-5">
                {state.step === "question" && (
                  <>
                    <h2 className="font-display text-2xl leading-tight font-bold">
                      {t(`${P}.question.title`)}
                    </h2>
                    <p className="text-soft">{t(`${P}.question.text`)}</p>
                  </>
                )}
                {state.step === "predict" && (
                  <>
                    <h2 className="font-display text-2xl leading-tight font-bold">
                      {t(`${P}.predict.title`)}
                    </h2>
                    <p className="text-soft">{t(`${P}.predict.text`)}</p>
                    <div
                      className="flex flex-col gap-2"
                      role="group"
                      aria-label={t(`${P}.predict.title`)}
                    >
                      {(["rise", "fall", "same"] as const).map((c) => (
                        <Button
                          key={c}
                          variant={prediction === c ? "default" : "outline"}
                          aria-pressed={prediction === c}
                          onClick={() =>
                            void handle.record([
                              { kind: "converging-lens.predict", data: { choice: c } },
                            ])
                          }
                        >
                          {t(`${P}.predict.${c}`)}
                        </Button>
                      ))}
                    </div>
                    {prediction && (
                      <p className="text-muted-foreground">
                        {t(`${P}.predict.saved`, { choice: t(`${P}.predict.${prediction}`) })}
                      </p>
                    )}
                  </>
                )}
                {building && (
                  <>
                    <h2 className="font-display text-2xl leading-tight font-bold">
                      {t(`${P}.build.title`)}
                    </h2>
                    <p className="text-soft">{t(`${P}.build.why`)}</p>
                    <div className="flex flex-col gap-1.5">
                      <CheckItem n={1} state={atFirstU ? "done" : "current"}>
                        {t(`${P}.build.u`)}
                      </CheckItem>
                      <CheckItem n={2} state={coaxial ? "done" : atFirstU ? "current" : "todo"}>
                        {t(`${P}.build.coaxial`)}
                      </CheckItem>
                    </div>
                    <div className="flex flex-col gap-2 border border-border bg-background p-3.5">
                      <span className="flex justify-between text-sm text-muted-foreground">
                        {t(`${P}.build.gauze`)}
                        <span className="font-mono text-foreground">
                          {Math.abs(bench.offAxis) < MM / 2
                            ? t(`${P}.build.gauzeOn`)
                            : t(
                                bench.offAxis > 0 ? `${P}.build.gauzeAt` : `${P}.build.gauzeBelow`,
                                {
                                  mm: Math.round(Math.abs(bench.offAxis) / MM),
                                },
                              )}
                        </span>
                      </span>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1"
                          disabled={bench.offAxis >= GAUZE_REACH}
                          onClick={() =>
                            void act({
                              type: "set-height",
                              to: Number((bench.offAxis + MM).toFixed(4)),
                            })
                          }
                        >
                          {t(`${P}.build.raise`)}
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1"
                          disabled={bench.offAxis <= -GAUZE_REACH}
                          onClick={() =>
                            void act({
                              type: "set-height",
                              to: Number((bench.offAxis - MM).toFixed(4)),
                            })
                          }
                        >
                          {t(`${P}.build.lower`)}
                        </Button>
                      </div>
                    </div>
                    {adviceCards}
                    <Button
                      onClick={() =>
                        void finishChecked(
                          coaxialFinding,
                          `build:${bench.offAxis}:${bench.lens - bench.object}`,
                        )
                      }
                    >
                      {t("lab.steps.finishBuilding")}
                    </Button>
                  </>
                )}
                {state.step === "check" && (
                  <>
                    <h2 className="font-display text-2xl leading-tight font-bold">
                      {t(`${P}.check.title`)}
                    </h2>
                    {coaxialFinding.map((f) => findingCard(f))}
                    {!atFirstU && (
                      <p className="text-soft">
                        {t(`${P}.check.u`, { u: cm(bench.lens - bench.object) })}
                      </p>
                    )}
                    {coaxialFinding.length === 0 && atFirstU && (
                      <p className="text-soft">{t(`${P}.check.right`)}</p>
                    )}
                    {(coaxialFinding.length > 0 || !atFirstU) && (
                      <Button
                        variant="outline"
                        onClick={() => void handle.dispatch({ type: "go-to-step", step: "build" })}
                      >
                        {t(`${P}.check.fix`)}
                      </Button>
                    )}
                  </>
                )}
                {measuring && (
                  <>
                    <h2 className="font-display text-2xl leading-tight font-bold">
                      {t(`${P}.measure.title`)}
                    </h2>
                    <p className="text-soft">{t(`${P}.measure.why`)}</p>
                    <div className="flex gap-6 border border-border bg-background px-3.5 py-3 font-mono">
                      <span className="flex flex-col">
                        <span className="font-sans text-xs text-muted-foreground">u</span>
                        {cm(u)} cm
                      </span>
                      <span className="flex flex-col">
                        <span className="font-sans text-xs text-muted-foreground">v</span>
                        {image.kind === "image"
                          ? `${cm(shown.screen - shown.lens)} cm`
                          : t(`${P}.measure.noImage`)}
                      </span>
                    </div>
                    <Button className="self-start" onClick={() => void takeReading()}>
                      {t(`${P}.measure.take`)}
                    </Button>
                    {measureMarks && procedure.map((f) => findingCard(f))}
                    {adviceCards}
                    <div className="flex flex-col gap-1">
                      <span className="text-sm text-muted-foreground">
                        {t(`${P}.measure.readings`)}
                      </span>
                      {readings.length ? (
                        <ol className="flex flex-col gap-0.5 font-mono text-sm">
                          {readings.map((r) => (
                            <li key={r.id}>
                              {t(`${P}.measure.reading`, { u: r.u.toFixed(1), v: r.v.toFixed(1) })}
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <span className="text-sm text-soft">{t(`${P}.measure.none`)}</span>
                      )}
                    </div>
                    <Button
                      disabled={!readings.length}
                      onClick={() =>
                        void finishChecked(
                          procedure,
                          `measure:${readings.length}:${bench.noImageAt.length}`,
                        )
                      }
                    >
                      {t("lab.steps.finishMeasuring")}
                    </Button>
                  </>
                )}
                {stepIndex > STEPS.indexOf("measure") && (
                  <>
                    <h2 className="font-display text-2xl leading-tight font-bold">
                      {stepName(state.step)}
                    </h2>
                    <p className="text-soft">{t(`${P}.next`)}</p>
                  </>
                )}
                {(state.step === "question" ||
                  state.step === "predict" ||
                  state.step === "check") &&
                  next && (
                    <Button
                      disabled={
                        (state.step === "predict" && !prediction) ||
                        (state.step === "check" && (coaxialFinding.length > 0 || !atFirstU))
                      }
                      onClick={() => void finishStep()}
                    >
                      {t("lab.steps.continue", { step: stepName(next) })}
                    </Button>
                  )}
              </TabsContent>

              <TabsContent value="explanation" className="flex flex-col gap-3.5 p-5">
                <h2 className="font-display text-2xl leading-tight font-bold">
                  {t(`${P}.explain.title`)}
                </h2>
                <p className="text-soft">{t(`${P}.explain.text`)}</p>
                <div className="flex flex-col gap-2.5 border border-border bg-background p-4">
                  <span className="text-center font-mono text-[22px]">1/u + 1/v = 1/f</span>
                  <div className="grid grid-cols-[32px_minmax(0,1fr)] gap-x-2.5 gap-y-1 text-sm text-soft">
                    {(["u", "v", "f"] as const).map((s) => (
                      <span key={s} className="contents">
                        <span className="font-mono text-foreground">{s}</span>
                        <span>{t(`${P}.explain.${s}`)}</span>
                      </span>
                    ))}
                  </div>
                </div>
                <p className="text-soft">{t(`${P}.explain.graph`)}</p>
              </TabsContent>

              <TabsContent value="tips" className="flex flex-col gap-3 p-5">
                <h2 className="font-display text-2xl leading-tight font-bold">
                  {t(`${P}.tips.title`)}
                </h2>
                <ul className="flex list-disc flex-col gap-2 pl-4.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <li key={n}>{t(`${P}.tips.${n}` as MessageKey)}</li>
                  ))}
                </ul>
              </TabsContent>
            </Tabs>
          </aside>
        </div>

        <StepStrip
          current={state.step}
          completed={state.completed}
          // Steps 6 to 10 come with the next pull request; until then the lab stops at Measure.
          open={(s) =>
            STEPS.indexOf(s) <=
            Math.min(
              STEPS.indexOf("measure"),
              STEPS.indexOf(state.step) + (state.completed.includes(state.step) ? 1 : 0),
            )
          }
          onGo={(s) => void handle.dispatch({ type: "go-to-step", step: s })}
        />
      </div>
    </div>
  );
}
