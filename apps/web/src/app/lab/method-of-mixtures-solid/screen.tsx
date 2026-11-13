"use client";

import { HotSolidBench } from "@pa/apparatus";
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
  asSolidReading,
  decideSolid,
  hotSolid,
  methodOfMixtures,
  MIXTURES_THERMOMETER,
  SOLID_PROCEDURE_RULES,
  solidProjection,
  solidReadingData,
  solidThermometer,
  solidWaterCarried,
  type SolidBench,
  type SolidCommand,
  type SolidReading,
  type Weighing,
} from "@pa/experiments";
import { hasMessage, t, type MessageKey } from "@pa/i18n";
// The mixtures copy, the hot solid's with it, is kept apart from the shared messages.
import "@pa/i18n/method-of-mixtures";
import { parallaxShift, quantise } from "@pa/instruments";
import { Button } from "@pa/ui/components/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@pa/ui/components/tabs";
import { ChevronLeftIcon, TriangleAlertIcon } from "@pa/ui/icons";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { CheckItem, Rail, StepStrip } from "../parts";
import { useAttempt } from "../use-attempt";

const H = hotSolid;
const P = "experiments.method-of-mixtures-solid";
const PREDICT = "method-of-mixtures-solid.predict";
const LIFTED = "method-of-mixtures-solid.lifted";
const READ = "method-of-mixtures-solid.read";
const msg = (key: string, params?: Record<string, string | number>) =>
  hasMessage(key) ? t(key as MessageKey, params) : key;
const stepName = (s: Step) => t(`lab.steps.${s}` as MessageKey);
const deg = (c: number) => c.toFixed(1);
const grams = (g: number) => `${g.toFixed(1)} g`;
/** Where the eye is when reading the thermometer: above it looks down, below it looks up, degrees. */
const EYE = { above: 20, level: 0, below: -20 } as const;
type Eye = keyof typeof EYE;
const EYES = Object.keys(EYE) as Eye[];
/** A toggle pressed in is drawn light, as on the board. */
const pressed = (on: boolean) =>
  on
    ? "flex-1 border-foreground bg-foreground text-background hover:bg-foreground/90 hover:text-background dark:border-foreground dark:bg-foreground dark:hover:bg-foreground/90"
    : "flex-1";

/**
 * The method of mixtures with a hot solid (the approved board "The method of mixtures: a hot solid,
 * read every minute"): the same lab as the others, with the balance, the beaker of boiling water and
 * the calorimeter, and a clock that runs on the events' own times, so the move across and the
 * minutes since the solid went in carry on across a reload. Steps 1 to 5 are built here.
 */
export function MethodOfMixturesSolidScreen() {
  const handle = useAttempt(H.id);
  const [tab, setTab] = useState("instructions");
  const [refusal, setRefusal] = useState<string>();
  const [advice, setAdvice] = useState<Advice[]>([]);
  const [checked, setChecked] = useState<string>();
  // How the student moves the solid across, chosen before they put it in.
  const [shaken, setShaken] = useState(false);
  const [gently, setGently] = useState(false);
  const [eye, setEye] = useState<Eye>("level");
  const [now, setNow] = useState(() => Date.now());

  const bench = useMemo(
    () => (handle ? replay(solidProjection, handle.attempt, handle.events) : undefined),
    [handle],
  );
  const prediction = useMemo(() => {
    const e = handle?.events.findLast((x) => x.kind === PREDICT);
    const choice = (e?.data as { choice?: string } | null)?.choice;
    return choice === "solid" || choice === "water" || choice === "same" ? choice : undefined;
  }, [handle]);
  // Since the calorimeter was last emptied: when the solid was lifted out, when it went in, and
  // the readings taken since, from the events.
  const run = useMemo(() => {
    const events = handle?.events ?? [];
    const since = events.findLastIndex((e) => e.kind === "calorimeter.empty");
    const after = events.slice(since + 1);
    const inAt = after.findLast((e) => e.kind === "solid.transfer")?.at;
    return {
      lifted: after.findLast((e) => e.kind === LIFTED)?.at,
      inAt,
      reads: after
        .filter((e) => e.kind === READ)
        .map((e) => e.data as { t: number; reading: number })
        .filter((d) => typeof d.t === "number" && typeof d.reading === "number"),
    };
  }, [handle]);

  const inside = bench?.transfer !== null && bench?.transfer !== undefined;
  const ticking = inside || run.lifted !== undefined;
  useEffect(() => {
    if (!ticking) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [ticking]);

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

  const act = async (command: SolidCommand) => {
    const d = decideSolid(bench, command);
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
  const w = bench.weighed;
  const allWeighed = w.solid !== undefined && w.empty !== undefined && w.filled !== undefined;
  const setUpRight = allWeighed && bench.covered;
  // The last mass weighed, as the balance shows it.
  const lastWeighed = handle.events.findLast((e) => e.kind === "balance.weigh")?.data as
    { what?: Weighing } | undefined;
  const balance = lastWeighed?.what ? w[lastWeighed.what] : undefined;

  const t0 = inside && run.inAt !== undefined ? Math.max(0, (now - run.inAt) / 1000) : 0;
  const second = Math.floor(t0);
  const inAir = !inside && run.lifted !== undefined ? Math.max(0, (now - run.lifted) / 1000) : 0;

  const readings = state.readings
    .map(asSolidReading)
    .filter((r): r is SolidReading => r !== undefined);
  const procedure = runRules(SOLID_PROCEDURE_RULES, { readings });

  // Help levels, as in the other labs (master plan, "Assist levels").
  const levelFor = (skill: Skill): HelpLevel =>
    coachIsOn(state) ? helpLevelFor(state, skill) : "on-my-own";
  const measureMarks = levelFor("measurement") !== "on-my-own";

  // What the thermometer shows the student, read from where their eye is, to 0.1 °C.
  const shownAt = (b: SolidBench, at: number) =>
    quantise(
      solidThermometer(b, at) + parallaxShift(MIXTURES_THERMOMETER.pointerHeight ?? 0, EYE[eye]),
      MIXTURES_THERMOMETER.resolution,
    );
  const shown = shownAt(bench, t0);
  const start = shownAt({ ...bench, transfer: null }, 0);
  const highestRead = run.reads.reduce<{ t: number; reading: number } | undefined>(
    (a, r) => (a === undefined || r.reading > a.reading ? r : a),
    undefined,
  );
  const fallen =
    run.reads.length >= 2 &&
    highestRead !== undefined &&
    run.reads.at(-1)!.reading < highestRead.reading;

  // The live warning for boiling water carried in, as a reading of this run would judge it.
  const asRun = (b: SolidBench): SolidReading | undefined =>
    b.transfer && b.water !== null
      ? {
          id: "bench",
          solid: H.solidMass,
          empty: methodOfMixtures.calorimeter.mass * 1000,
          filled: methodOfMixtures.calorimeter.mass * 1000 + b.water,
          start: methodOfMixtures.room,
          highest: methodOfMixtures.room,
          t: 0,
          last: 0,
          c: b.world.metal.c,
          water: b.water,
          covered: b.covered,
          stirring: b.stirring,
          after: b.transfer.after,
          shaken: b.transfer.shaken,
          gently: b.transfer.gently,
          thermometerAngle: 0,
        }
      : undefined;
  const live = asRun(bench);
  const wet = live && !live.shaken ? solidWaterCarried.check({ readings: [live] })[0] : undefined;

  const takeReading = async () => {
    const best = highestRead ?? { t: t0, reading: shown };
    const data = solidReadingData(bench, {
      start,
      highest: best.reading,
      t: Number(best.t.toFixed(1)),
      last: Number(Math.max(t0, ...run.reads.map((r) => r.t)).toFixed(1)),
      thermometerAngle: EYE[eye],
    });
    if (!data) {
      setRefusal(t(`${P}.measure.weighFirst`));
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
        <span className="text-muted-foreground">{msg(`${f.key}.demonstrate`, f.params)}</span>
      )}
    </div>
  );
  const adviceCards = advice.map((a) => findingCard(a.finding, a.level === "demonstrate"));

  const where = inside ? "calorimeter" : run.lifted !== undefined ? "air" : "beaker";
  const description = t(`${P}.bench`, {
    balance: balance === undefined ? "0.0" : balance.toFixed(1),
    where: t(`${P}.bench.${where}`),
    water: bench.water ?? 0,
    reading: deg(shown),
  });

  const weighButton = (what: Weighing) => (
    <Button
      key={what}
      variant="outline"
      className="flex-1"
      onClick={() => void act({ type: "weigh", what })}
    >
      {t(`${P}.weigh.${what}`)}
    </Button>
  );

  const balanceCard = (
    <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-3 border border-border bg-surface p-3.5">
      <span className="flex justify-between text-sm text-muted-foreground">
        {t(`${P}.balance.title`)}
        <span className="font-mono text-foreground">
          {balance === undefined ? "0.0 g" : grams(balance)}
        </span>
      </span>
      <div className="flex flex-wrap gap-2">
        {(["solid", "empty", "filled"] as const).map(weighButton)}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => void act({ type: "fill", to: H.water })}
        >
          {t(`${P}.fill`)}
        </Button>
        <Button variant="outline" className="flex-1" onClick={() => void act({ type: "empty" })}>
          {t(`${P}.empty`)}
        </Button>
      </div>
      <span className="text-xs text-muted-foreground">{t(`${P}.balance.note`)}</span>
    </div>
  );

  const transferCard = (
    <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-2.5 border border-border bg-surface p-3.5">
      <span className="text-xs text-muted-foreground">{t(`${P}.move.title`)}</span>
      {run.lifted === undefined ? (
        <Button
          className="self-start"
          disabled={bench.water === null}
          onClick={() => void handle.record([{ kind: LIFTED, data: {} }])}
        >
          {t(`${P}.move.lift`)}
        </Button>
      ) : (
        <>
          <div className="flex justify-between text-sm text-muted-foreground">
            {t(`${P}.move.inAir`)}
            <span className="font-mono text-foreground">{Math.floor(inAir)} s</span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className={pressed(shaken)}
              aria-pressed={shaken}
              onClick={() => setShaken(!shaken)}
            >
              {t(shaken ? `${P}.move.shaken` : `${P}.move.shake`)}
            </Button>
            <Button
              variant="outline"
              className={pressed(gently)}
              aria-pressed={gently}
              onClick={() => setGently(!gently)}
            >
              {t(`${P}.move.lower`)}
            </Button>
          </div>
          <Button
            onClick={() =>
              void act({
                type: "transfer",
                after: Math.max(0, (Date.now() - run.lifted!) / 1000),
                shaken,
                gently,
              })
            }
          >
            {t(`${P}.move.putIn`)}
          </Button>
          <span className="text-xs text-muted-foreground">{t(`${P}.move.note`)}</span>
        </>
      )}
    </div>
  );

  const minutesCard = (
    <div className="flex min-w-0 flex-[1_1_280px] flex-col gap-2.5 border border-border bg-surface p-3.5">
      <span className="text-xs text-muted-foreground">{t(`${P}.minutes.title`)}</span>
      <table className="border-collapse font-mono text-sm">
        <thead>
          <tr>
            <th
              scope="col"
              className="border-b border-border px-2 py-1 text-left font-sans text-xs font-medium text-muted-foreground"
            >
              t / min
            </th>
            <th
              scope="col"
              className="border-b border-border px-2 py-1 text-right font-sans text-xs font-medium text-muted-foreground"
            >
              θ / °C
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="px-2 py-1">0.0</td>
            <td className="px-2 py-1 text-right">{deg(start)}</td>
          </tr>
          {run.reads.map((r) => (
            <tr key={r.t} className={highestRead === r ? "bg-accent-wash" : undefined}>
              <td className="px-2 py-1">{(r.t / 60).toFixed(1)}</td>
              <td className="px-2 py-1 text-right">{deg(r.reading)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Button
        variant="outline"
        className="self-start"
        onClick={() =>
          void handle.record([{ kind: READ, data: { t: Number(t0.toFixed(1)), reading: shown } }])
        }
      >
        {t(`${P}.minutes.read`)}
      </Button>
    </div>
  );

  const thermometerCard = (
    <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-2.5 border border-border bg-surface p-3.5">
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-muted-foreground">{t(`${P}.thermometer`)}</span>
        <span className="font-mono text-[28px] leading-none">{deg(shown)} °C</span>
      </div>
      {inside && (
        <div className="flex justify-between text-sm text-muted-foreground">
          {t(`${P}.since`)}
          <span className="font-mono text-foreground">
            {t(`${P}.clock`, {
              m: Math.floor(second / 60),
              s: String(second % 60).padStart(2, "0"),
            })}
          </span>
        </div>
      )}
      <div className="flex gap-2">
        <Button
          variant="outline"
          className={pressed(bench.stirring)}
          aria-pressed={bench.stirring}
          disabled={inside}
          onClick={() => void act({ type: "stir", on: !bench.stirring })}
        >
          {t(bench.stirring ? `${P}.stirring` : `${P}.stir`)}
        </Button>
        <Button
          variant="outline"
          className={pressed(bench.covered)}
          aria-pressed={bench.covered}
          disabled={inside}
          onClick={() => void act({ type: "cover", on: !bench.covered })}
        >
          {t(bench.covered ? `${P}.lid.on` : `${P}.lid.off`)}
        </Button>
      </div>
      <div
        role="group"
        aria-label={t(`${P}.eye`)}
        className="flex gap-0.5 border border-border bg-surface p-0.5"
      >
        {EYES.map((e) => (
          <button
            key={e}
            type="button"
            aria-pressed={eye === e}
            onClick={() => setEye(e)}
            className={
              eye === e
                ? "h-8 flex-1 bg-foreground px-3 text-sm font-medium text-background"
                : "h-8 flex-1 px-3 text-sm font-medium text-soft"
            }
          >
            {t(`${P}.eye.${e}`)}
          </button>
        ))}
      </div>
      <span className="text-xs text-muted-foreground">{t(`${P}.eyeLevel`)}</span>
    </div>
  );

  const masses = (
    <div className="grid grid-cols-2 gap-x-6 gap-y-2 border border-border bg-background px-3.5 py-3 font-mono">
      {(
        [
          ["solid", w.solid],
          ["empty", w.empty],
          ["filled", w.filled],
        ] as const
      ).map(([what, g]) => (
        <span key={what} className="flex flex-col">
          <span className="font-sans text-xs text-muted-foreground">{t(`${P}.mass.${what}`)}</span>
          {g === undefined ? "—" : grams(g)}
        </span>
      ))}
      <span className="flex flex-col">
        <span className="font-sans text-xs text-muted-foreground">{t(`${P}.mass.start`)}</span>
        {deg(start)} °C
      </span>
    </div>
  );

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
            <span aria-hidden className="hidden size-2.5 bg-topic-heat md:block" />
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
            <div className="flex w-full max-w-[760px] flex-col">
              <span className="text-xs text-muted-foreground">{t(`${P}.fig.label`)}</span>
              <span className="font-semibold">{t(`${P}.fig.${where}`)}</span>
            </div>
            <div className="w-full max-w-[760px]">
              <HotSolidBench
                className="block h-auto w-full"
                label={description}
                balance={balance}
                solid={where}
                wet={bench.transfer ? !bench.transfer.shaken : !shaken && run.lifted !== undefined}
                water={bench.water ?? 0}
                covered={bench.covered}
                stirring={bench.stirring}
                thermometer={solidThermometer(bench, t0)}
              />
            </div>
            <div className="flex w-full max-w-[760px] flex-wrap items-stretch gap-4">
              {building && balanceCard}
              {measuring && !inside && transferCard}
              {measuring && inside && minutesCard}
              {(building || measuring) && thermometerCard}
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
                      {(["solid", "water", "same"] as const).map((c) => (
                        <Button
                          key={c}
                          variant={prediction === c ? "default" : "outline"}
                          aria-pressed={prediction === c}
                          onClick={() =>
                            void handle.record([{ kind: PREDICT, data: { choice: c } }])
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
                      <CheckItem n={1} state={w.solid !== undefined ? "done" : "current"}>
                        {t(`${P}.build.solid`)}
                      </CheckItem>
                      <CheckItem
                        n={2}
                        state={
                          w.empty !== undefined
                            ? "done"
                            : w.solid !== undefined
                              ? "current"
                              : "todo"
                        }
                      >
                        {t(`${P}.build.empty`)}
                      </CheckItem>
                      <CheckItem
                        n={3}
                        state={
                          w.filled !== undefined
                            ? "done"
                            : w.empty !== undefined
                              ? "current"
                              : "todo"
                        }
                      >
                        {t(`${P}.build.filled`)}
                      </CheckItem>
                      <CheckItem
                        n={4}
                        state={bench.covered ? "done" : allWeighed ? "current" : "todo"}
                      >
                        {t(`${P}.build.lid`)}
                      </CheckItem>
                    </div>
                    {masses}
                    {adviceCards}
                    <Button onClick={() => void finishStep()}>
                      {t("lab.steps.finishBuilding")}
                    </Button>
                  </>
                )}
                {state.step === "check" && (
                  <>
                    <h2 className="font-display text-2xl leading-tight font-bold">
                      {t(`${P}.check.title`)}
                    </h2>
                    {masses}
                    {!allWeighed && <p className="text-soft">{t(`${P}.check.weigh`)}</p>}
                    {allWeighed && !bench.covered && (
                      <p className="text-soft">{t(`${P}.build.lid`)}</p>
                    )}
                    {setUpRight && (
                      <p className="text-soft">
                        {t(`${P}.check.right`, { water: deg((w.filled ?? 0) - (w.empty ?? 0)) })}
                      </p>
                    )}
                    {!setUpRight && (
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
                      {t(
                        inside
                          ? wet && measureMarks
                            ? `${P}.measure.wetTitle`
                            : `${P}.measure.readTitle`
                          : `${P}.measure.moveTitle`,
                      )}
                    </h2>
                    <p className="text-soft">
                      {t(inside ? `${P}.measure.readText` : `${P}.measure.moveText`)}
                    </p>
                    <div className="flex flex-col gap-1.5">
                      <CheckItem n={1} state="done">
                        {t(`${P}.measure.step1`)}
                      </CheckItem>
                      <CheckItem n={2} state={inside ? "done" : "current"}>
                        {t(`${P}.measure.step2`)}
                      </CheckItem>
                      <CheckItem n={3} state={inside ? "current" : "todo"}>
                        {t(`${P}.measure.step3`)}
                      </CheckItem>
                    </div>
                    {masses}
                    {inside && measureMarks && fallen && highestRead && (
                      <div
                        role="status"
                        className="flex flex-col gap-2.5 border border-border bg-background p-3.5"
                      >
                        <span className="font-semibold">{t(`${P}.measure.fallen.title`)}</span>
                        <span className="text-soft">
                          {t(`${P}.measure.fallen.detail`, { highest: deg(highestRead.reading) })}
                        </span>
                      </div>
                    )}
                    {inside &&
                      measureMarks &&
                      wet &&
                      findingCard({ key: `${P}.measure.wet`, params: wet.params ?? {} })}
                    {inside && (
                      <Button className="self-start" onClick={() => void takeReading()}>
                        {t(`${P}.measure.take`)}
                      </Button>
                    )}
                    {measureMarks && procedure.map((f) => findingCard(f))}
                    {adviceCards}
                    {inside && (
                      <Button variant="outline" onClick={() => void act({ type: "empty" })}>
                        {t(`${P}.measure.again`)}
                      </Button>
                    )}
                    <div className="flex flex-col gap-1">
                      <span className="text-sm text-muted-foreground">
                        {t(`${P}.measure.runs`)}
                      </span>
                      {readings.length ? (
                        <ol className="flex flex-col gap-0.5 font-mono text-sm">
                          {readings.map((r, i) => (
                            <li key={r.id}>
                              {t(`${P}.measure.run`, {
                                n: i + 1,
                                start: deg(r.start),
                                highest: deg(r.highest),
                              })}
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
                        (state.step === "check" && !setUpRight)
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
                  <span className="text-center font-mono text-[18px]">
                    m_s c_s (T_s − T) = (m_c c_c + m_w c_w)(T − T₀)
                  </span>
                </div>
                <p className="text-soft">{t(`${P}.explain.given`)}</p>
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
