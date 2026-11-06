"use client";

import { parseFormula, type Expr } from "@pa/analysis";
import { symbolFacts, type FormulaCard, type PendulumSymbol } from "@pa/experiments";
import { t, type MessageKey } from "@pa/i18n";
import { cn } from "@pa/ui";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "@pa/ui/components/popover";
import type { ReactNode } from "react";

const msg = (key: string, params?: Record<string, string | number>) => t(key as MessageKey, params);

/*
 * Formulas are typeset with MathML, which browsers draw natively and offline (rule 5), from the
 * same formula language the table and calculator use, so a formula is written once.
 */

const PRECEDENCE = { "+": 1, "-": 1, "*": 2, "/": 2, "^": 3 } as const;

function render(e: Expr, key = "0"): ReactNode {
  switch (e.type) {
    case "number":
      return e.raw === "π" ? <mi key={key}>π</mi> : <mn key={key}>{e.raw ?? String(e.value)}</mn>;
    case "symbol":
      return <mi key={key}>{e.name}</mi>;
    case "unary":
      return (
        <mrow key={key}>
          <mo>−</mo>
          {wrap(e.arg, 2, `${key}a`)}
        </mrow>
      );
    case "call":
      return e.fn === "sqrt" ? (
        <msqrt key={key}>{render(e.arg, `${key}a`)}</msqrt>
      ) : (
        <mrow key={key}>
          <mi>{e.fn}</mi>
          <mo>(</mo>
          {render(e.arg, `${key}a`)}
          <mo>)</mo>
        </mrow>
      );
    case "binary": {
      if (e.op === "/")
        return (
          <mfrac key={key}>
            {render(e.left, `${key}l`)}
            {render(e.right, `${key}r`)}
          </mfrac>
        );
      if (e.op === "^")
        return (
          <msup key={key}>
            {wrap(e.left, 4, `${key}l`)}
            {render(e.right, `${key}r`)}
          </msup>
        );
      const p = PRECEDENCE[e.op];
      // Side-by-side multiplication, as the book writes 2πl; × only between two numbers.
      const op =
        e.op === "*" ? (
          e.left.type === "number" && e.right.type === "number" && e.right.raw !== "π" ? (
            <mo>×</mo>
          ) : (
            <mo>&#x2062;</mo>
          )
        ) : (
          <mo>{e.op === "-" ? "−" : "+"}</mo>
        );
      return (
        <mrow key={key}>
          {wrap(e.left, p, `${key}l`)}
          {op}
          {wrap(e.right, e.op === "-" ? p + 1 : p, `${key}r`)}
        </mrow>
      );
    }
  }
}

/** Brackets where the book would put them: around a lower-precedence part. */
function wrap(e: Expr, outer: number, key: string): ReactNode {
  const inner = e.type === "binary" && e.op !== "/" ? PRECEDENCE[e.op] : 5;
  return inner < outer ? (
    <mrow key={key}>
      <mo>(</mo>
      {render(e, `${key}i`)}
      <mo>)</mo>
    </mrow>
  ) : (
    render(e, key)
  );
}

/** A formula, typeset: "T = 2π sqrt(l / g)" as the book prints it. */
export function Formula({
  lhs,
  rhs,
  symbols,
  className,
}: {
  lhs: string;
  rhs: string;
  symbols: readonly string[];
  className?: string;
}) {
  const left = parseFormula(lhs, symbols);
  const right = parseFormula(rhs, symbols);
  if (!left.ok || !right.ok) return <code className={className}>{`${lhs} = ${rhs}`}</code>;
  return (
    <math
      display="block"
      aria-label={t("lab.formula.label", { text: `${lhs} = ${rhs}` })}
      className={cn("text-[22px]", className)}
    >
      <mrow>
        {render(left.expr, "l")}
        <mo>=</mo>
        {render(right.expr, "r")}
      </mrow>
    </math>
  );
}

/**
 * A symbol that opens its card on click or tap: name, meaning, SI unit, typical size, and where
 * it comes from (master plan, "Formulas, symbols and units, everywhere they appear").
 */
export function Sym({
  id,
  g,
  children,
  className,
}: {
  id: PendulumSymbol;
  /** The room's field strength, for the typical sizes the card quotes. */
  g: number;
  children?: ReactNode;
  className?: string;
}) {
  const facts = symbolFacts(g)[id];
  return (
    <Popover>
      <PopoverTrigger
        aria-label={t("lab.symbol.open", { symbol: id })}
        className={cn(
          "cursor-help font-mono underline decoration-dotted underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring",
          className,
        )}
      >
        {children ?? id}
      </PopoverTrigger>
      <PopoverContent>
        <PopoverTitle>
          <span className="font-mono">{id}</span> · {msg(`symbols.${id}.name`)}
        </PopoverTitle>
        <PopoverDescription>{msg(`symbols.${id}.meaning`)}</PopoverDescription>
        <dl className="grid gap-1.5 text-sm">
          <div>
            <dt className="sr-only">{t("lab.symbol.unit", { unit: "" })}</dt>
            <dd className="font-mono">{t("lab.symbol.unit", { unit: facts.unit })}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t("lab.symbol.typical")}</dt>
            <dd>{msg(`symbols.${id}.typical`, facts.typical)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t("lab.symbol.origin")}</dt>
            <dd className="text-soft">{msg(`symbols.${id}.origin`)}</dd>
          </div>
        </dl>
      </PopoverContent>
    </Popover>
  );
}

/** A formula with its legend underneath: each symbol, what it is, its unit, and its card. */
export function FormulaBox({
  card,
  g,
  legend,
  note,
}: {
  card: FormulaCard;
  g: number;
  /** The legend's words for each symbol, where the experiment says more than its name. */
  legend?: Partial<Record<PendulumSymbol, string>>;
  note?: ReactNode;
}) {
  const facts = symbolFacts(g);
  return (
    <div className="flex flex-col gap-2.5 border border-border bg-background p-4">
      <Formula lhs={card.lhs} rhs={card.rhs} symbols={card.symbols} />
      <dl
        aria-label={t("lab.formula.legend")}
        className="grid grid-cols-[32px_minmax(0,1fr)] gap-x-2.5 gap-y-1 text-sm text-soft"
      >
        {card.symbols.map((s) => (
          <div key={s} className="contents">
            <dt className="text-foreground">
              <Sym id={s} g={g} />
            </dt>
            <dd>
              {legend?.[s] ?? (
                <>
                  {msg(`symbols.${s}.name`)} · <span className="font-mono">{facts[s].unit}</span>
                </>
              )}
            </dd>
          </div>
        ))}
      </dl>
      {note}
    </div>
  );
}
