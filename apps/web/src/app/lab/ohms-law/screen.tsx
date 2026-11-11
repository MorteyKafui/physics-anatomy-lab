"use client";

import { CIRCUIT_VIEWBOX, CircuitBench, terminalPoint, TERMINAL_POINTS } from "@pa/apparatus";
import { runRules } from "@pa/analysis";
import { coach, replay, STEPS, type Advice, type Step } from "@pa/engine";
import {
  benchProjection,
  CORRECT_LEADS,
  decideBench,
  keyIntervalsAt,
  meterReadings,
  netsOf,
  ohmsLaw,
  polarisationAt,
  PROCEDURE_RULES,
  recorded,
  TERMINALS,
  WIRING_RULES,
  wrongTerminals,
  type BenchCommand,
  type Lead,
  type Terminal,
} from "@pa/experiments";
import { createRng } from "@pa/instruments";
import { hasMessage, t, type MessageKey } from "@pa/i18n";
import { cn } from "@pa/ui";
import { Button } from "@pa/ui/components/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@pa/ui/components/tabs";
import { ChevronLeftIcon, TriangleAlertIcon } from "@pa/ui/icons";
import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { CheckItem, Rail, StepStrip } from "../parts";
import { useAttempt } from "../use-attempt";

const E = ohmsLaw;
const P = "experiments.ohms-law";
const msg = (key: string, params?: Record<string, string | number>) =>
  hasMessage(key) ? t(key, params) : key;
const stepName = (s: Step) => t(`lab.steps.${s}` as MessageKey);
const terminalName = (x: Terminal) => t(`${P}.terminals.${x}` as MessageKey);
const leadKey = (l: Lead) => `${l[0]}~${l[1]}`;

/**
 * The Ohm's law lab (the approved board "Ohm's law: wiring and measuring"): the same lab as the
 * pendulum's, with the circuit bench. Steps 1 to 5 are built here; tabulating, plotting, the
 * analysis and the report come in the next pull request.
 */
export function OhmsLawScreen() {
  const handle = useAttempt(E.id);
  const [tab, setTab] = useState("instructions");
  const [from, setFrom] = useState<Terminal>();
  const [pointer, setPointer] = useState<{ x: number; y: number }>();
  const [refusal, setRefusal] = useState<string>();
  const [advice, setAdvice] = useState<Advice[]>([]);
  const [checked, setChecked] = useState<string>();
  const [over, setOver] = useState(40);
  const [now, setNow] = useState(() => Date.now());
  const stage = useRef<HTMLDivElement>(null);
  const dragged = useRef(false);

  const bench = useMemo(
    () => (handle ? replay(benchProjection, handle.attempt, handle.events) : undefined),
    [handle],
  );
  const prediction = useMemo(() => {
    const e = handle?.events.findLast((x) => x.kind === "ohms-law.predict");
    const choice = (e?.data as { choice?: string } | null)?.choice;
    return choice === "rise" || choice === "fall" || choice === "same" ? choice : undefined;
  }, [handle]);

  // While the key is closed the bench changes with time: the cell polarises and the timer runs.
  const keyClosed = bench?.keyClosed ?? false;
  useEffect(() => {
    if (!keyClosed) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [keyClosed, handle]);

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

  const act = async (command: BenchCommand) => {
    const d = decideBench(bench, command);
    if (!d.ok) {
      setRefusal(
        hasMessage(`lab.ohmsLaw.unsafe.${d.reason}`)
          ? t(`lab.ohmsLaw.unsafe.${d.reason}` as MessageKey)
          : t(`lab.ohmsLaw.refused.${d.reason}` as MessageKey),
      );
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

  // Wiring: choose a terminal, then another; or drag from one to another.
  const join = async (a: Terminal, b: Terminal) => {
    setFrom(undefined);
    setPointer(undefined);
    if (a === b) return;
    await act({ type: "connect", from: a, to: b });
  };
  const choose = (x: Terminal) => {
    if (dragged.current) return;
    if (!from) setFrom(x);
    else void join(from, x);
  };
  const toDrawing = (clientX: number, clientY: number) => {
    const r = stage.current!.getBoundingClientRect();
    return {
      x: ((clientX - r.left) / r.width) * CIRCUIT_VIEWBOX.width,
      y: ((clientY - r.top) / r.height) * CIRCUIT_VIEWBOX.height,
    };
  };
  const startDrag = (x: Terminal, e: ReactPointerEvent) => {
    if (e.button !== 0) return;
    dragged.current = false;
    const origin = { x: e.clientX, y: e.clientY };
    const move = (ev: PointerEvent) => {
      if (!dragged.current && Math.hypot(ev.clientX - origin.x, ev.clientY - origin.y) < 6) return;
      dragged.current = true;
      setFrom(x);
      setPointer(toDrawing(ev.clientX, ev.clientY));
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      if (dragged.current) {
        const under = document
          .elementFromPoint(ev.clientX, ev.clientY)
          ?.closest("[data-terminal-button]");
        const target = under?.getAttribute("data-terminal-button") as Terminal | null;
        if (target) void join(x, target);
        else {
          setFrom(undefined);
          setPointer(undefined);
        }
        // The click that follows a drag is not a choice.
        setTimeout(() => (dragged.current = false), 0);
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const building = state.step === "build";
  const measuring = state.step === "measure";
  // While wiring, the lifted jockey is parked near Q, clear of every terminal's button.
  const parked = building && bench.jockey === undefined ? 0.95 : over / 100;
  const jockey = {
    at: (bench.jockey ?? parked) * world.wireLength,
    pressed: bench.jockey !== undefined,
  };
  // With the key open nothing ticks: the bench is as it was at its last change.
  const at = keyClosed ? Math.max(now, bench.lastAt) : bench.lastAt;
  const live = { ...bench, polarisation: polarisationAt(bench, at) };
  const readings = meterReadings(world, live, {
    rng: createRng((handle.attempt.seed ^ Math.floor(at / 500)) >>> 0),
  });
  const amps = readings ? recorded(readings.ammeter, world.ammeter) : 0;
  const volts = readings ? recorded(readings.voltmeter, world.voltmeter) : 0;
  const net = netsOf(bench.leads);
  const done = (l: Lead) => net(l[0]) === net(l[1]);
  const wrong = state.step === "check" ? wrongTerminals(bench.leads) : [];
  const lit: Terminal[] = from ? TERMINALS.filter((x) => x !== from) : wrong;
  const keySeconds = Math.round(
    keyIntervalsAt(bench, at).reduce(
      (n, k, i, all) => (i === all.length - 1 && keyClosed ? k.to - k.from : n),
      0,
    ),
  );
  const procedure = runRules(PROCEDURE_RULES, {
    world,
    keyIntervals: keyIntervalsAt(bench, at),
    scrapes: bench.scrapes,
  });
  const wiringFindings = runRules(WIRING_RULES, { leads: bench.leads });

  const finishBuilding = async () => {
    const signature = JSON.stringify(bench.leads);
    if (wiringFindings.length && checked !== signature) {
      setChecked(signature);
      const out = coach(handle.state, wiringFindings, "step-exit");
      await handle.record(out.events);
      setAdvice(out.advice);
      if (out.advice.length) return;
    }
    await finishStep();
  };

  const description = t(`${P}.bench`, {
    state: t(`${P}.benchWired`, { count: bench.leads.length }),
    key: t(keyClosed ? `${P}.keyClosed` : `${P}.keyOpen`),
    jockey:
      bench.jockey === undefined
        ? t(`${P}.jockeyLifted`)
        : t(`${P}.jockeyPressed`, { pj: (bench.jockey * 100).toFixed(1) }),
    current: amps.toFixed(2),
    voltage: volts.toFixed(2),
  });

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
            <span aria-hidden className="hidden size-2.5 bg-topic-electricity md:block" />
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
          <span className="border border-border px-2.5 py-1 text-xs text-muted-foreground">
            {t(`${P}.inDevelopment`)}
          </span>
        </header>

        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <div className="relative flex min-w-0 flex-1 items-center justify-center px-6 pt-16 pb-28">
            <div className="absolute top-5 left-6 hidden flex-col gap-0.5 md:flex">
              <span className="text-sm text-muted-foreground">{t(`${P}.figure`)}</span>
              <span className="font-semibold">
                {measuring ? t(`${P}.measure.title`) : t(`${P}.build.title`)}
              </span>
            </div>
            <div
              ref={stage}
              className="relative w-full max-w-[760px]"
              style={{ aspectRatio: `${CIRCUIT_VIEWBOX.width} / ${CIRCUIT_VIEWBOX.height}` }}
            >
              <CircuitBench
                className="absolute inset-0 size-full"
                label={description}
                leads={bench.leads}
                keyClosed={keyClosed}
                jockey={jockey}
                wireLength={world.wireLength}
                ammeter={readings ? readings.ammeter.shown / world.ammeter.scale![1] : 0}
                voltmeter={readings ? readings.voltmeter.shown / world.voltmeter.scale![1] : 0}
                lit={lit}
                {...(from
                  ? {
                      pending: {
                        from,
                        to: pointer ?? terminalPoint(from, jockey, world.wireLength),
                      },
                    }
                  : {})}
                {...(bench.jockey !== undefined
                  ? { pjLabel: `${(bench.jockey * 100).toFixed(1)} cm` }
                  : {})}
              />
              {/* Each terminal is a real button over the drawing: tap, click or Enter to choose it. */}
              {building &&
                TERMINALS.map((x) => {
                  const p =
                    x === "jockey"
                      ? terminalPoint(x, jockey, world.wireLength)
                      : TERMINAL_POINTS[x];
                  return (
                    <button
                      key={x}
                      type="button"
                      data-terminal-button={x}
                      aria-label={terminalName(x)}
                      aria-pressed={from === x}
                      onPointerDown={(e) => startDrag(x, e)}
                      onClick={() => choose(x)}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") setFrom(undefined);
                      }}
                      className="absolute aspect-square -translate-x-1/2 -translate-y-1/2 touch-none rounded-full focus-visible:outline-2 focus-visible:outline-ring"
                      style={{
                        left: `${(p.x / CIRCUIT_VIEWBOX.width) * 100}%`,
                        top: `${(p.y / CIRCUIT_VIEWBOX.height) * 100}%`,
                        // As large as the bench allows: 44 px on a laptop, never under 24 px, and
                        // never overlapping the next terminal's button.
                        width: "clamp(24px, 7%, 44px)",
                      }}
                    />
                  );
                })}
            </div>
            <div role="status" aria-live="polite" className="sr-only">
              {from ? t(`${P}.build.from`, { terminal: terminalName(from) }) : ""}
            </div>
            {refusal && (
              <div
                role="alert"
                className="absolute bottom-6 left-1/2 max-w-[520px] -translate-x-1/2 border border-primary bg-accent-wash px-4 py-3.5"
              >
                {refusal}
              </div>
            )}
            {measuring && !refusal && (
              <div className="absolute bottom-5 left-6 flex items-end gap-6 border border-border bg-surface px-4 py-3">
                {readings &&
                  (["ammeter", "voltmeter"] as const).map((m) => (
                    <div key={m} className="flex flex-col">
                      <span className="text-xs text-muted-foreground">
                        {t(`${P}.measure.${m}`)}
                      </span>
                      <span className="font-mono text-[34px] leading-tight font-medium">
                        {(m === "ammeter" ? amps : volts).toFixed(2)}{" "}
                        <span className="text-base text-muted-foreground">
                          {m === "ammeter" ? "A" : "V"}
                        </span>
                      </span>
                      {readings[m].pinned && (
                        <span className="text-xs text-warn">
                          {t(
                            readings[m].pinned === "low"
                              ? `${P}.measure.pinnedLow`
                              : `${P}.measure.pinnedHigh`,
                          )}
                        </span>
                      )}
                    </div>
                  ))}
                {keyClosed && (
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">
                      {t(`${P}.measure.keyClosedFor`)}
                    </span>
                    <span className="font-mono text-[34px] leading-tight font-medium text-warn">
                      {keySeconds} <span className="text-base text-muted-foreground">s</span>
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

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
                    <Diagram />
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
                            void handle.record([{ kind: "ohms-law.predict", data: { choice: c } }])
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
                    <Diagram />
                    <p className="font-mono text-xs text-muted-foreground">
                      {t(`${P}.build.joined`, {
                        count: CORRECT_LEADS.filter(done).length,
                        total: CORRECT_LEADS.length,
                      })}
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {CORRECT_LEADS.map((l, i) => (
                        <CheckItem key={leadKey(l)} n={i + 1} state={done(l) ? "done" : "todo"}>
                          {t(`${P}.leads.${leadKey(l)}` as MessageKey)}
                        </CheckItem>
                      ))}
                    </div>
                    {bench.leads.length > 0 && (
                      <ul className="flex flex-col gap-1">
                        {bench.leads.map((l) => (
                          <li
                            key={leadKey(l)}
                            className="flex items-center justify-between gap-2 text-sm text-muted-foreground"
                          >
                            <span>
                              {terminalName(l[0])} → {terminalName(l[1])}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label={t(`${P}.build.remove`, {
                                from: terminalName(l[0]),
                                to: terminalName(l[1]),
                              })}
                              onClick={() => void act({ type: "disconnect", from: l[0], to: l[1] })}
                            >
                              {t(`${P}.build.removeShort`)}
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {from && (
                      <Button variant="outline" onClick={() => setFrom(undefined)}>
                        {t(`${P}.build.cancel`)}
                      </Button>
                    )}
                    {advice.map((a) => findingCard(a.finding, a.level === "demonstrate"))}
                  </>
                )}
                {state.step === "check" && (
                  <>
                    <h2 className="font-display text-2xl leading-tight font-bold">
                      {t(`${P}.check.title`)}
                    </h2>
                    {wiringFindings.length ? (
                      wiringFindings.map((f) => findingCard(f))
                    ) : (
                      <p className="text-soft">{t(`${P}.check.right`)}</p>
                    )}
                    {wiringFindings.length > 0 && (
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
                    <Button
                      onClick={() => void act({ type: keyClosed ? "open-key" : "close-key" })}
                    >
                      {keyClosed ? t(`${P}.measure.openKey`) : t(`${P}.measure.closeKey`)}
                    </Button>
                    <label className="flex flex-col gap-1.5 text-sm">
                      <span className="flex justify-between">
                        {t(`${P}.measure.position`)}
                        <span className="font-mono">
                          {(bench.jockey !== undefined ? bench.jockey * 100 : over).toFixed(1)} cm
                        </span>
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={0.5}
                        value={bench.jockey !== undefined ? bench.jockey * 100 : over}
                        onChange={(e) => {
                          const cm = Number(e.target.value);
                          if (bench.jockey !== undefined)
                            void act({ type: "slide-jockey", to: cm / 100 });
                          else setOver(cm);
                        }}
                        className="accent-[var(--pa-accent)]"
                      />
                    </label>
                    <Button
                      variant="outline"
                      onClick={() =>
                        void act(
                          bench.jockey !== undefined
                            ? { type: "lift-jockey" }
                            : { type: "press-jockey", at: over / 100 },
                        )
                      }
                    >
                      {bench.jockey !== undefined
                        ? t(`${P}.measure.lift`)
                        : t(`${P}.measure.press`)}
                    </Button>
                    {procedure.map((f) => findingCard(f))}
                    <p className="text-sm text-muted-foreground">{t(`${P}.measure.recordNext`)}</p>
                  </>
                )}
                {(state.step === "question" ||
                  state.step === "predict" ||
                  state.step === "check") &&
                  next && (
                    <Button
                      disabled={state.step === "predict" && !prediction}
                      onClick={() => void finishStep()}
                    >
                      {t("lab.steps.continue", { step: stepName(next) })}
                    </Button>
                  )}
                {building && (
                  <Button onClick={() => void finishBuilding()}>
                    {t("lab.steps.finishBuilding")}
                  </Button>
                )}
              </TabsContent>

              <TabsContent value="explanation" className="flex flex-col gap-3.5 p-5">
                <h2 className="font-display text-2xl leading-tight font-bold">
                  {t(`${P}.explain.title`)}
                </h2>
                <p className="text-soft">{t(`${P}.explain.text`)}</p>
                <div className="flex flex-col gap-2.5 border border-border bg-background p-4">
                  <span className="text-center font-mono text-[22px]">V = E − I r</span>
                  <div className="grid grid-cols-[32px_minmax(0,1fr)] gap-x-2.5 gap-y-1 text-sm text-soft">
                    {(["V", "E", "I", "r"] as const).map((s) => (
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

/** The circuit diagram from the question, as on the board. */
function Diagram() {
  return (
    <div className={cn("border border-border bg-background p-3.5")}>
      <svg
        viewBox="0 0 300 150"
        role="img"
        aria-label={t(`${P}.build.diagram`)}
        className="block w-full"
      >
        <g stroke="currentColor" strokeWidth={1.5} fill="none">
          <path d="M30,30 H110" />
          <path d="M124,30 H180" />
          <rect x={180} y={22} width={36} height={16} />
          <path d="M216,30 H236" />
          <circle cx={250} cy={30} r={14} />
          <path d="M264,30 H280 V120 H262" />
          <path d="M30,30 V120 H40" />
          <path d="M262,120 H40" />
          <path d="M110,18 V42" />
          <path d="M118,24 V36" />
          <path d="M60,30 V70" />
          <circle cx={60} cy={80} r={10} />
          <path d="M60,90 V100" />
          <path d="M30,96 H48" />
          <path d="M52,90 L60,96" />
          <path d="M40,120 C70,140 150,140 170,126" />
        </g>
        <polygon points="170,120 165,130 175,130" fill="currentColor" />
        <g fill="currentColor" fontSize={11}>
          <text x={112} y={14} textAnchor="middle">
            E
          </text>
          <text x={198} y={16} textAnchor="middle">
            R
          </text>
          <text x={250} y={34} textAnchor="middle">
            A
          </text>
          <text x={60} y={84} textAnchor="middle">
            V
          </text>
          <text x={38} y={112}>
            P
          </text>
          <text x={286} y={124}>
            Q
          </text>
          <text x={172} y={146} textAnchor="middle">
            J
          </text>
          <text x={22} y={100}>
            K
          </text>
        </g>
      </svg>
    </div>
  );
}
