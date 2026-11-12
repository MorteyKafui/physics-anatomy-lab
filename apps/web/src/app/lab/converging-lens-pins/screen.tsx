"use client";

import { EyeView, PinsBench } from "@pa/apparatus";
import { runRules, type Finding, type Skill } from "@pa/analysis";
import {
  coach,
  coachIsOn,
  frontier,
  HELP_LEVELS,
  helpLevelFor,
  replay,
  STEPS,
  type Advice,
  type HelpLevel,
  type Step,
} from "@pa/engine";
import {
  asPinsReading,
  decidePinsBench,
  lensPins,
  PINS_PROCEDURE_RULES,
  pinsBenchProjection,
  pinsEyeView,
  pinsReadingData,
  pinsView,
  readPosition,
  recordedPosition,
  type PinsBenchCommand,
  type PinsReading,
} from "@pa/experiments";
import { hasMessage, t, type MessageKey } from "@pa/i18n";
// The lens copy, the two-pin lab's with it, is kept apart from the shared messages.
import "@pa/i18n/converging-lens";
import { createRng } from "@pa/instruments";
import { Button } from "@pa/ui/components/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@pa/ui/components/tabs";
import { ChevronLeftIcon, TriangleAlertIcon } from "@pa/ui/icons";
import Link from "next/link";
import { useMemo, useState } from "react";

import { CheckItem, Rail, StepStrip } from "../parts";
import { useAttempt } from "../use-attempt";

const E = lensPins;
const P = "experiments.converging-lens-pins";
const msg = (key: string, params?: Record<string, string | number>) =>
  hasMessage(key) ? t(key as MessageKey, params) : key;
const stepName = (s: Step) => t(`lab.steps.${s}` as MessageKey);
const cm = (m: number) => (m * 100).toFixed(1);
/** The first reading's object distance, m, as the question sets it. */
const FIRST_X = E.objectDistances[0];
const MM = 0.001;
/** The search pin moves a millimetre a press, as on the board. */
const PIN_STEP = MM;

/**
 * The converging lens with two pins (the approved board "The converging lens: two pins and no
 * parallax"): the same lab as the others, with the two-pin bench and an eye view through the
 * lens. Steps 1 to 5 are built here; tabulating, plotting and the analysis come next.
 */
export function ConvergingLensPinsScreen() {
  const handle = useAttempt(E.id);
  const [tab, setTab] = useState("instructions");
  const [refusal, setRefusal] = useState<string>();
  const [advice, setAdvice] = useState<Advice[]>([]);
  const [checked, setChecked] = useState<string>();
  // Which view the student is looking from: the board's "Look from the left / right".
  const [looking, setLooking] = useState<-1 | 0 | 1>(0);
  // A slider's place while it is being dragged; recorded when it is let go.
  const [draft, setDraft] = useState<{ part: "lens" | "pin"; to: number }>();

  const bench = useMemo(
    () => (handle ? replay(pinsBenchProjection, handle.attempt, handle.events) : undefined),
    [handle],
  );
  const prediction = useMemo(() => {
    const e = handle?.events.findLast((x) => x.kind === "converging-lens-pins.predict");
    const choice = (e?.data as { choice?: string } | null)?.choice;
    return choice === "rise" || choice === "fall" || choice === "same" ? choice : undefined;
  }, [handle]);
  const shown = useMemo(
    () => (bench && draft ? { ...bench, [draft.part]: draft.to } : bench),
    [bench, draft],
  );
  // The view through the lens takes a few milliseconds: worked out only when the bench changes.
  const view = useMemo(() => (shown ? pinsView(shown.world, shown) : undefined), [shown]);
  const eyeViews = useMemo(() => (shown ? pinsEyeView(shown.world, shown) : undefined), [shown]);

  if (!handle || !bench || !shown || !view) {
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

  const act = async (command: PinsBenchCommand) => {
    const d = decidePinsBench(bench, command);
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
  const x = shown.lens - shown.object;
  const atFirstX = Math.abs(bench.lens - bench.object - FIRST_X) < 0.0005;
  const level = (h: number) => Math.abs(h) < MM / 2;
  const tipsLevel = level(bench.objectTip) && level(bench.pinTip);

  const readings = state.readings
    .map(asPinsReading)
    .filter((r): r is PinsReading => r !== undefined);
  const procedure = runRules(PINS_PROCEDURE_RULES, { readings });
  // The tips' check on the bench as it stands, as a reading of it would judge it.
  const tipFinding =
    view.kind === "image"
      ? runRules(
          PINS_PROCEDURE_RULES.filter((r) => r.id === "pins-tips-off-axis"),
          {
            readings: [
              {
                id: "bench",
                x: 0,
                y: 0,
                s: 0,
                at: 0,
                atOnAxis: 0,
                left: 0,
                eye: 0,
                tipGap: view.tipGap,
                readFrom: "centre",
              },
            ],
          },
        )
      : [];

  // Help levels, as in the other labs (master plan, "Assist levels").
  const levelFor = (skill: Skill): HelpLevel =>
    coachIsOn(state) ? helpLevelFor(state, skill) : "on-my-own";
  const measureMarks = levelFor("measurement") !== "on-my-own";

  const takeReading = async () => {
    const rng = createRng((handle.attempt.seed ^ (readings.length + 1)) >>> 0);
    const read = (m: number) => recordedPosition(readPosition(m, { rng }));
    const lensAt = read(bench.lens);
    const data = pinsReadingData(bench, {
      x: Number((lensAt - read(bench.object)).toFixed(1)),
      y: Number((read(bench.pin) - lensAt).toFixed(1)),
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

  const clear = view.kind === "image" && view.clear && view.tipGap <= E.tipTolerance;
  const description = t(`${P}.bench`, {
    object: cm(shown.object),
    lens: cm(shown.lens),
    pin: cm(shown.pin),
    image: t(
      view.kind !== "image"
        ? `${P}.bench.none`
        : clear
          ? `${P}.bench.clear`
          : `${P}.bench.parallax`,
    ),
  });
  const sides = ["left", "centre", "right"] as const;
  const viewLabel = (i: number) => {
    const w = eyeViews?.[i];
    const where = t(`${P}.eye.${sides[i]!}`);
    if (!w) return t(`${P}.eye.none`, { where });
    return Math.abs(w.across) < 1 && Math.abs(w.up) < 1
      ? t(`${P}.eye.together`, { where })
      : t(w.across > 0 ? `${P}.eye.toLeft` : `${P}.eye.toRight`, { where });
  };

  const slider = (part: "lens" | "pin") => {
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

  const tipControl = (pin: "object" | "search") => {
    const h = pin === "object" ? bench.objectTip : bench.pinTip;
    return (
      <div className="flex flex-col gap-2 border border-border bg-background p-3.5">
        <span className="flex justify-between text-sm text-muted-foreground">
          {t(`${P}.build.${pin}Tip`)}
          <span className="font-mono text-foreground">
            {level(h)
              ? t(`${P}.build.tipOn`)
              : t(h > 0 ? `${P}.build.tipAbove` : `${P}.build.tipBelow`, {
                  mm: Math.round(Math.abs(h) / MM),
                })}
          </span>
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => void act({ type: "set-tip", pin, to: Number((h + MM).toFixed(4)) })}
          >
            {t(`${P}.build.raise.${pin}`)}
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => void act({ type: "set-tip", pin, to: Number((h - MM).toFixed(4)) })}
          >
            {t(`${P}.build.lower.${pin}`)}
          </Button>
        </div>
      </div>
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
              {HELP_LEVELS.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {t(`lab.helpLevel.${lvl}` as MessageKey)}
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
              <PinsBench
                className="block h-auto w-full"
                label={description}
                object={shown.object}
                lens={shown.lens}
                pin={shown.pin}
                objectTip={shown.objectTip}
                pinTip={shown.pinTip}
                eye={shown.eye}
                image={
                  view.kind === "image"
                    ? { at: view.at, magnification: view.magnification }
                    : undefined
                }
              />
            </div>
            <div className="flex w-full max-w-[760px] flex-wrap items-stretch gap-4">
              <div className="flex flex-col gap-2 border border-border bg-surface p-3">
                <span className="text-xs text-muted-foreground">{t(`${P}.measure.through`)}</span>
                <div className="flex gap-2">
                  {sides.map((side, i) => (
                    <div
                      key={side}
                      className={
                        looking === i - 1
                          ? "flex flex-col items-center gap-1 outline-2 outline-primary"
                          : "flex flex-col items-center gap-1"
                      }
                    >
                      <EyeView
                        apart={
                          eyeViews?.[i]
                            ? { across: eyeViews[i]!.across, up: eyeViews[i]!.up }
                            : undefined
                        }
                        label={viewLabel(i)}
                      />
                      <span className="text-xs text-muted-foreground">{t(`${P}.eye.${side}`)}</span>
                    </div>
                  ))}
                </div>
                <span
                  className={
                    clear
                      ? "self-start border border-ok px-2 py-0.5 text-xs text-ok"
                      : "self-start border border-warn px-2 py-0.5 text-xs text-warn"
                  }
                >
                  {t(
                    view.kind !== "image"
                      ? `${P}.measure.noImage`
                      : clear
                        ? `${P}.measure.clear`
                        : `${P}.measure.parallax`,
                  )}
                </span>
              </div>
              <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-3 border border-border bg-surface p-3.5">
                {slider("lens")}
                {slider("pin")}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() =>
                      void act({
                        type: "move",
                        part: "pin",
                        to: Number((bench.pin - PIN_STEP).toFixed(4)),
                      })
                    }
                  >
                    {t(`${P}.measure.towards`)}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() =>
                      void act({
                        type: "move",
                        part: "pin",
                        to: Number((bench.pin + PIN_STEP).toFixed(4)),
                      })
                    }
                  >
                    {t(`${P}.measure.away`)}
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    aria-pressed={looking === -1}
                    onClick={() => setLooking(looking === -1 ? 0 : -1)}
                  >
                    {t(`${P}.measure.left`)}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    aria-pressed={looking === 1}
                    onClick={() => setLooking(looking === 1 ? 0 : 1)}
                  >
                    {t(`${P}.measure.right`)}
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
                              { kind: "converging-lens-pins.predict", data: { choice: c } },
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
                      <CheckItem n={1} state={atFirstX ? "done" : "current"}>
                        {t(`${P}.build.x`)}
                      </CheckItem>
                      <CheckItem n={2} state={tipsLevel ? "done" : atFirstX ? "current" : "todo"}>
                        {t(`${P}.build.level`)}
                      </CheckItem>
                    </div>
                    {tipControl("object")}
                    {tipControl("search")}
                    {adviceCards}
                    <Button
                      onClick={() =>
                        void finishChecked(
                          tipFinding,
                          `build:${bench.objectTip}:${bench.pinTip}:${bench.lens - bench.object}`,
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
                    {tipFinding.map((f) => findingCard(f))}
                    {!atFirstX && (
                      <p className="text-soft">
                        {t(`${P}.check.x`, { x: cm(bench.lens - bench.object) })}
                      </p>
                    )}
                    {tipFinding.length === 0 && atFirstX && (
                      <p className="text-soft">{t(`${P}.check.right`)}</p>
                    )}
                    {(tipFinding.length > 0 || !atFirstX) && (
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
                        <span className="font-sans text-xs text-muted-foreground">x</span>
                        {cm(x)} cm
                      </span>
                      <span className="flex flex-col">
                        <span className="font-sans text-xs text-muted-foreground">y</span>
                        {view.kind === "image" ? `${cm(view.y)} cm` : t(`${P}.measure.noImage`)}
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
                              {t(`${P}.measure.reading`, { x: r.x.toFixed(1), y: r.y.toFixed(1) })}
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <span className="text-sm text-soft">{t(`${P}.measure.none`)}</span>
                      )}
                    </div>
                    <Button
                      disabled={!readings.length}
                      onClick={() => void finishChecked(procedure, `measure:${readings.length}`)}
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
                        (state.step === "check" && (tipFinding.length > 0 || !atFirstX))
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
                  <span className="text-center font-mono text-[22px]">xy = f (x + y)</span>
                  <div className="grid grid-cols-[32px_minmax(0,1fr)] gap-x-2.5 gap-y-1 text-sm text-soft">
                    {(["x", "y", "f"] as const).map((s) => (
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
            STEPS.indexOf(s) <= Math.min(STEPS.indexOf("measure"), STEPS.indexOf(frontier(state)))
          }
          onGo={(s) => void handle.dispatch({ type: "go-to-step", step: s })}
        />
      </div>
    </div>
  );
}
