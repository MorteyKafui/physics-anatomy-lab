"use client";

import {
  calculate,
  checkAnswer,
  checkQuote,
  formatQuantity,
  readingDecimals,
  type Finding,
  type Quantity,
  type Sheet,
  type SlopeTriangle,
} from "@pa/analysis";
import type { AnswersState, WrittenAnswer } from "@pa/engine";
import { gFromSlope, slopeOf, typedQuantity, type PendulumAnswer } from "@pa/experiments";
import { t, type MessageKey } from "@pa/i18n";
import { cn } from "@pa/ui";
import { Button } from "@pa/ui/components/button";
import { CheckIcon, TriangleAlertIcon } from "@pa/ui/icons";
import { useState, type ReactNode } from "react";

import { showUncertainty } from "./table-panel";

const msg = (key: string, params?: Record<string, string | number>) => t(key as MessageKey, params);

/** One answer the student writes: its value and unit, each with its own box, then the marks. */
export function AnswerLine({
  id,
  lead,
  written,
  expected,
  assist,
  marks,
  flagged,
  onWrite,
  unit,
}: {
  id: string;
  /** The unit to show a worked-out answer in, when SI base units would read badly ("A V⁻¹"). */
  unit?: string;
  lead: string;
  written: WrittenAnswer | undefined;
  expected: Quantity | undefined;
  assist: boolean;
  marks: boolean;
  flagged: readonly Finding[];
  onWrite: (answer: WrittenAnswer) => void;
}) {
  // The student's own copy, kept after each save: a unit typed straight after a value builds
  // on that value, not on the answer as last saved, which may not have caught up yet.
  const [mine, setMine] = useState<WrittenAnswer>();
  const [dirty, setDirty] = useState(false);
  const shown = mine ?? written ?? { value: "", unit: "" };
  const name = msg(`lab.analyse.name.${id}`);
  const edit = (next: WrittenAnswer) => {
    setMine(next);
    setDirty(true);
  };
  const commit = () => {
    if (!dirty) return;
    setDirty(false);
    onWrite({ value: shown.value.trim(), unit: shown.unit.trim() });
  };
  const check = expected && (shown.value || shown.unit) ? checkAnswer(shown, expected) : undefined;
  const field =
    "h-9 border border-input bg-background px-2 font-mono text-sm text-foreground aria-invalid:border-warn";

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
      <span>{lead}</span>
      {assist ? (
        <span className="font-semibold" data-answer={id}>
          {expected ? formatQuantity(expected, 3, unit) : "…"}
        </span>
      ) : (
        <>
          <input
            aria-label={t("lab.analyse.value", { name })}
            data-answer={`${id}-value`}
            inputMode="decimal"
            autoComplete="off"
            maxLength={40}
            className={cn(field, "w-24")}
            aria-invalid={flagged.some((f) => f.rule !== "analysis-unit") || undefined}
            value={shown.value}
            onChange={(e) => edit({ ...shown, value: e.target.value })}
            onBlur={commit}
            onKeyDown={(e) => e.key === "Enter" && commit()}
          />
          <input
            aria-label={t("lab.analyse.unit", { name })}
            data-answer={`${id}-unit`}
            autoComplete="off"
            maxLength={40}
            className={cn(field, "w-28")}
            aria-invalid={flagged.some((f) => f.rule === "analysis-unit") || undefined}
            value={shown.unit}
            onChange={(e) => edit({ ...shown, unit: e.target.value })}
            onBlur={commit}
            onKeyDown={(e) => e.key === "Enter" && commit()}
          />
          {marks && check && (
            <span className="flex flex-wrap gap-x-2 font-sans text-xs">
              {(
                [
                  ["value", check.value === "ok"],
                  ["sigFigs", check.sigFigs === "ok"],
                  ["unit", check.unit === "ok"],
                ] as const
              ).map(([part, good]) => (
                <span
                  key={part}
                  className={cn("flex items-center gap-1", good ? "text-ok" : "text-warn")}
                >
                  {good ? (
                    <CheckIcon className="size-3.5" aria-hidden />
                  ) : (
                    <TriangleAlertIcon className="size-3.5" aria-hidden />
                  )}
                  <span>{msg(`lab.analyse.mark.${part}`)}</span>
                </span>
              ))}
            </span>
          )}
        </>
      )}
    </div>
  );
}

/** A calculator line with units: type a calculation, see the answer and how many figures it can carry. */
export function Calculator() {
  const [text, setText] = useState("");
  const [shown, setShown] = useState<string>();
  const result = shown === undefined ? undefined : calculate(shown);
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        setShown(text);
      }}
    >
      <label className="flex flex-col gap-1 text-sm text-muted-foreground">
        {t("lab.analyse.calcLabel")}
        <span className="flex flex-wrap gap-2">
          <input
            className="h-9 min-w-56 flex-1 border border-input bg-background px-2.5 font-mono text-sm text-foreground"
            value={text}
            maxLength={120}
            placeholder="4π² / (4.03 s² m⁻¹)"
            aria-describedby="calc-hint"
            onChange={(e) => setText(e.target.value)}
          />
          <Button type="submit" variant="outline">
            {t("lab.analyse.calcGo")}
          </Button>
        </span>
      </label>
      <span id="calc-hint" className="text-xs text-muted-foreground">
        {t("lab.analyse.calcHint")}
      </span>
      <p role="status" className="min-h-6 font-mono text-[15px]">
        {result === undefined
          ? ""
          : result.ok
            ? t("lab.analyse.calcResult", {
                value: formatQuantity(result.quantity, result.sigFigs ?? 3),
              })
            : msg(`calc.problem.${result.problem}`, { near: result.near ?? "" })}
      </p>
      {result?.ok && result.sigFigs !== undefined && (
        <span className="text-xs text-muted-foreground">
          {t("lab.analyse.calcFigures", { n: result.sigFigs })}
        </span>
      )}
    </form>
  );
}

/** Step 8: the slope from the student's triangle and g from the slope, each answer checked. */
export function AnalysePanel({
  triangle,
  sheet,
  symbols,
  units,
  forG,
  answers,
  expected,
  findings,
  assist,
  marks,
  onWrite,
  onBackToPlot,
  below,
  uncertainty,
}: {
  triangle: SlopeTriangle | undefined;
  sheet: Sheet;
  symbols: { x: string; y: string };
  units: { x: string; y: string };
  /** Whether the graph is T² against l, whose slope gives g. */
  forG: boolean;
  answers: AnswersState;
  expected: Partial<Record<PendulumAnswer, Quantity>>;
  findings: readonly Finding[];
  assist: boolean;
  marks: boolean;
  onWrite: (id: PendulumAnswer, answer: WrittenAnswer) => void;
  onBackToPlot: () => void;
  below: ReactNode;
  /**
   * The uncertainty layer (docs/content/uncertainty-brief.md, decision 6): the slope's
   * least-squares uncertainty and g's, worked from the plotted points, for the student to quote g
   * with its uncertainty.
   */
  uncertainty?: { slope: number; g: number; percent: number } | undefined;
}) {
  const s = triangle && slopeOf(triangle, units);
  const dx = readingDecimals(sheet.x);
  const dy = readingDecimals(sheet.y);
  const slopeUsed = s && (typedQuantity(answers.slope, s.slope) ?? s.slope);
  const flaggedFor = (id: PendulumAnswer) => (marks ? findings.filter((f) => f.column === id) : []);

  return (
    <section aria-label={t("lab.analyse.label")} className="flex w-full min-w-0 flex-col gap-4">
      <div className="flex flex-col gap-3 border border-border bg-surface p-4">
        <h2 className="text-sm text-muted-foreground">{t("lab.analyse.label")}</h2>
        {!triangle || !s ? (
          <div className="flex flex-col items-start gap-3">
            <p className="text-soft">{t("lab.analyse.needTriangle")}</p>
            <Button variant="outline" onClick={onBackToPlot}>
              {t("lab.analyse.backToPlot")}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5 font-mono text-[15px]">
            <span>
              {t("lab.analyse.slopeFormula", {
                yb: triangle.b.y.toFixed(dy),
                ya: triangle.a.y.toFixed(dy),
                yu: units.y,
                xb: triangle.b.x.toFixed(dx),
                xa: triangle.a.x.toFixed(dx),
                xu: units.x,
              })}
            </span>
            <AnswerLine
              id="slope"
              lead={t("lab.analyse.slopeStep", {
                rise: s.rise.toFixed(dy),
                run: s.run.toFixed(dx),
              })}
              written={answers.slope}
              expected={expected.slope}
              assist={assist}
              marks={marks}
              flagged={flaggedFor("slope")}
              onWrite={(a) => onWrite("slope", a)}
            />
            {forG ? (
              <AnswerLine
                id="g"
                lead={t("lab.analyse.gFormula", {
                  fourPiSquared: (4 * Math.PI ** 2).toFixed(2),
                  slope: slopeUsed ? formatQuantity(slopeUsed).split(" ")[0]! : "slope",
                })}
                written={answers.g}
                expected={expected.g ?? (slopeUsed ? gFromSlope(slopeUsed) : undefined)}
                assist={assist}
                marks={marks}
                flagged={flaggedFor("g")}
                onWrite={(a) => onWrite("g", a)}
              />
            ) : (
              <p className="font-sans text-sm text-soft">
                {t("lab.analyse.otherGraph", { x: symbols.x, y: symbols.y })}
              </p>
            )}
            {assist && (
              <span className="font-sans text-xs text-muted-foreground">
                {t("lab.analyse.workedOut")}
              </span>
            )}
            {uncertainty && forG && <QuoteWithUncertainty uncertainty={uncertainty} />}
          </div>
        )}
        <p className="text-sm text-soft">{t("lab.analyse.hidden")}</p>
      </div>
      <div className="flex flex-col gap-2 border border-border bg-surface p-4">
        <h2 className="text-sm text-muted-foreground">{t("lab.analyse.calculator")}</h2>
        <Calculator />
      </div>
      {below}
    </section>
  );
}

/**
 * g quoted with its uncertainty, and the checks on it (decision 6). The accepted value stays hidden
 * until the student has read their feedback, as it does for g itself, so agreement with it is
 * left to the report.
 */
function QuoteWithUncertainty({
  uncertainty,
}: {
  uncertainty: { slope: number; g: number; percent: number };
}) {
  const [value, setValue] = useState("");
  const [u, setU] = useState("");
  const typed = value.trim() !== "" && u.trim() !== "";
  const check = typed ? checkQuote({ value, uncertainty: u }, uncertainty.g) : undefined;
  const lines: { ok: boolean; text: string }[] = check
    ? [
        {
          ok: check.uncertainty,
          text: check.uncertainty
            ? t("lab.analyse.uncertainty.right", { percent: uncertainty.percent.toFixed(2) })
            : t("lab.analyse.uncertainty.wrong", {
                worked: showUncertainty(uncertainty.g).replace("± ", ""),
                percent: uncertainty.percent.toFixed(2),
              }),
        },
        {
          ok: check.figures && check.decimals,
          text: t(
            check.figures && check.decimals
              ? "lab.analyse.uncertainty.quoted"
              : "lab.analyse.uncertainty.figures",
          ),
        },
      ]
    : [];
  return (
    <div className="flex flex-col gap-2 font-sans" data-uncertainty="g">
      <span className="font-mono text-sm text-soft">
        {t("lab.analyse.uncertainty.slope", { u: showUncertainty(uncertainty.slope) })}
      </span>
      <div className="flex flex-wrap items-center gap-2 font-mono">
        <span>g =</span>
        <input
          aria-label={t("lab.analyse.uncertainty.value")}
          inputMode="decimal"
          className="h-9 w-24 border border-input bg-background px-2 text-right"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <span>±</span>
        <input
          aria-label={t("lab.analyse.uncertainty.label")}
          inputMode="decimal"
          className="h-9 w-20 border border-input bg-background px-2 text-right"
          value={u}
          onChange={(e) => setU(e.target.value)}
        />
        <span>m s⁻²</span>
      </div>
      {lines.map((l) => (
        <span key={l.text} role="status" className="flex items-baseline gap-2 text-sm">
          <span
            aria-hidden
            className={cn(
              "inline-flex size-5 items-center justify-center border-[1.5px] text-xs font-semibold",
              l.ok ? "border-ok text-ok" : "border-warn text-warn",
            )}
          >
            {l.ok ? "✓" : "!"}
          </span>
          <span className="text-soft">{l.text}</span>
        </span>
      ))}
    </div>
  );
}
