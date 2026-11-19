"use client";
// The pendulum's What if panel (design/mockups/AI.dc.html, "What if"; ai-tutor-brief.md
// decision 6). Offline and signed out too: every number comes from packages/experiments'
// scenario model on packages/physics, never from the AI. Loaded the first time it opens.
import { streamAi } from "@pa/api-client";
import {
  asSet,
  checkScenario,
  PENDULUM_LIMITS,
  PENDULUM_PLACES,
  predictPendulum,
  type PendulumScenario,
} from "@pa/experiments";
import { t, type MessageKey } from "@pa/i18n";
import "@pa/i18n/what-if";
import { placeById } from "@pa/physics";
import { cn } from "@pa/ui";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@pa/ui/components/sheet";
import { Button } from "@pa/ui/components/button";
import { Input } from "@pa/ui/components/input";
import { useRef, useState, type FormEvent, type ReactNode } from "react";

import { tutorContext, type TutorInput } from "../tutor/context";

const period = (s: number) => t("lab.whatIf.period", { t: s.toFixed(2) });

function Slider({
  label,
  shown,
  value,
  limits,
  onChange,
}: {
  label: string;
  shown: string;
  value: number;
  limits: { min: number; max: number; step: number };
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm text-soft">
      <span className="flex justify-between">
        {label} <span className="font-mono text-foreground">{shown}</span>
      </span>
      <input
        type="range"
        className="w-full accent-primary"
        min={limits.min}
        max={limits.max}
        step={limits.step}
        value={value}
        aria-valuetext={shown}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

function Row({ name, value, accent }: { name: string; value: string; accent?: boolean }) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3">
      <span>{name}</span>
      <span className={cn("font-mono", accent && "text-accent-text")}>{value}</span>
    </div>
  );
}

/** What the AI sent, checked again here against the model's limits before it is used. */
type Asked =
  | {
      readonly kind: "scenario" | "declined";
      readonly title: string;
      readonly reason: string;
      readonly scenario: PendulumScenario;
    }
  | { readonly kind: "working" }
  | { readonly kind: "failed"; readonly message: string };

function fromItem(
  item: Readonly<Record<string, unknown>>,
  base: PendulumScenario,
): Asked | undefined {
  const { kind, title, reason, changes } = item;
  if ((kind !== "scenario" && kind !== "declined") || typeof title !== "string") return undefined;
  if (typeof reason !== "string" || typeof changes !== "object" || changes === null)
    return undefined;
  const scenario = checkScenario({ ...base, ...changes });
  return scenario ? { kind, title, reason, scenario } : undefined;
}

export function PendulumWhatIf({
  open,
  onOpenChange,
  benchLength,
  ai,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The length the bench is set to, m: the experiment as set starts from it. */
  benchLength: number;
  /** Ask what if (online): shown only when AI is on for this person. */
  ai?: { readonly on: boolean; readonly input: Omit<TutorInput, "question" | "thread"> };
}) {
  const [scenario, setScenario] = useState<PendulumScenario>(() => asSet(benchLength));
  const [question, setQuestion] = useState("");
  const [asked, setAsked] = useState<Asked>();
  const stop = useRef<AbortController>(undefined);
  const ask = async (e: FormEvent) => {
    e.preventDefault();
    const q = question.trim();
    if (!q || !ai?.on || asked?.kind === "working") return;
    stop.current?.abort();
    const controller = new AbortController();
    stop.current = controller;
    setAsked({ kind: "working" });
    let got: Asked = { kind: "failed", message: t("lab.whatIf.ask.unusable") };
    for await (const event of streamAi(
      "/ai/what-if",
      tutorContext({ ...ai.input, question: q, thread: [] }),
      { signal: controller.signal },
    )) {
      if (event.type === "item") got = fromItem(event.item, asSet(benchLength)) ?? got;
      else if (event.type === "refused" || event.type === "error")
        got = { kind: "failed", message: event.message };
    }
    if (controller.signal.aborted) return;
    setAsked(got);
    if (got.kind === "scenario") setScenario(got.scenario);
  };
  const set = (change: Partial<PendulumScenario>) => setScenario((s) => ({ ...s, ...change }));
  const base = predictPendulum(asSet(benchLength));
  const yours = predictPendulum(scenario);
  const place = placeById(scenario.place);
  const notes: ReactNode[] = [
    yours.smallAngle
      ? t("lab.whatIf.smallAngle")
      : t("lab.whatIf.exact", { percent: (yours.beyondSmallAngle * 100).toFixed(1) }),
  ];
  if (scenario.massG !== asSet().massG) notes.push(t("lab.whatIf.mass.none"));
  if (scenario.place === "earth") notes.push(t("lab.whatIf.earthNote"));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto p-0 sm:max-w-md">
        <div className="flex flex-col gap-4 p-5">
          <SheetTitle className="font-display text-2xl font-bold">
            {t("lab.whatIf.title")}
          </SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground">
            {t("lab.whatIf.intro")}
          </SheetDescription>

          {ai?.on && (
            <form onSubmit={(e) => void ask(e)} className="flex flex-col gap-1.5">
              <label htmlFor="what-if-question" className="text-xs text-muted-foreground">
                {t("lab.whatIf.ask.label")}
              </label>
              <div className="flex gap-2">
                <Input
                  id="what-if-question"
                  maxLength={2000}
                  value={question}
                  placeholder={t("lab.whatIf.ask.placeholder")}
                  onChange={(e) => setQuestion(e.target.value)}
                />
                <Button type="submit" disabled={!question.trim() || asked?.kind === "working"}>
                  {t("lab.whatIf.ask.try")}
                </Button>
              </div>
            </form>
          )}
          <div aria-live="polite" className="flex flex-col gap-2">
            {asked?.kind === "working" && (
              <p className="text-xs text-muted-foreground">{t("lab.whatIf.ask.working")}</p>
            )}
            {asked?.kind === "scenario" && (
              <div
                role="status"
                className="flex flex-col gap-1 border border-border bg-surface p-3"
              >
                <span className="text-xs text-muted-foreground">{t("lab.whatIf.ask.from")}</span>
                <span className="font-semibold">{asked.title}</span>
                <span className="text-xs text-muted-foreground">{asked.reason}</span>
              </div>
            )}
            {asked?.kind === "declined" && (
              <div
                role="status"
                className="flex flex-col gap-2 border border-warn bg-warn-wash p-3"
              >
                <span className="font-semibold text-warn">{t("lab.whatIf.ask.declined")}</span>
                <span>{asked.reason}</span>
                <Button className="self-start" onClick={() => setScenario(asked.scenario)}>
                  {t("lab.whatIf.ask.nearest", { title: asked.title })}
                </Button>
              </div>
            )}
            {asked?.kind === "failed" && (
              <div role="status" className="border border-warn bg-warn-wash p-3">
                {asked.message}
              </div>
            )}
          </div>
          <Slider
            label={t("lab.whatIf.length")}
            shown={`${scenario.length.toFixed(2)} m`}
            value={scenario.length}
            limits={PENDULUM_LIMITS.length}
            onChange={(length) => set({ length })}
          />
          <div className="flex flex-col gap-1.5 text-sm text-soft">
            <span id="what-if-gravity">{t("lab.whatIf.gravity")}</span>
            <div
              role="radiogroup"
              aria-labelledby="what-if-gravity"
              className="flex flex-wrap gap-1.5"
            >
              {PENDULUM_PLACES.map((id) => (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={scenario.place === id}
                  onClick={() => set({ place: id })}
                  className={cn(
                    "min-h-9 border px-3 text-foreground",
                    scenario.place === id
                      ? "border-primary bg-primary/15"
                      : "border-border hover:bg-muted",
                  )}
                >
                  {t(`lab.whatIf.place.${id}` as MessageKey)}
                </button>
              ))}
            </div>
            <span className="text-xs text-muted-foreground">
              {t("lab.whatIf.gravitySource", { g: String(place.g), source: place.source })}
            </span>
          </div>
          <Slider
            label={t("lab.whatIf.amplitude")}
            shown={`${String(scenario.amplitudeDeg)}°`}
            value={scenario.amplitudeDeg}
            limits={PENDULUM_LIMITS.amplitudeDeg}
            onChange={(amplitudeDeg) => set({ amplitudeDeg })}
          />
          <Slider
            label={t("lab.whatIf.mass")}
            shown={`${String(scenario.massG)} g`}
            value={scenario.massG}
            limits={PENDULUM_LIMITS.massG}
            onChange={(massG) => set({ massG })}
          />

          <section
            aria-live="polite"
            className="flex flex-col gap-2 border border-border bg-surface p-3.5"
          >
            <h3 className="text-xs text-muted-foreground">{t("lab.whatIf.predicts")}</h3>
            <Row name={t("lab.whatIf.asSet")} value={period(base.period)} />
            <Row name={t("lab.whatIf.yours")} value={period(yours.period)} accent />
            {notes.map((note, i) => (
              <p key={i} className="text-xs text-muted-foreground">
                {note}
              </p>
            ))}
            <p className="text-xs text-muted-foreground">{t("lab.whatIf.model")}</p>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
