/**
 * Formulas a student writes for a derived column ("t / 20", "T²", "4π²l / T²"). A small
 * recursive-descent parser: numbers, + − × ÷ (also * and /), powers (^ or a superscript ² or ³),
 * brackets, π, sqrt, log (base ten) and ln, and the symbols of the table's other columns.
 * Multiplication may be written by placing things side by side, as in "4π²l". Nothing is
 * evaluated with eval, so a formula can never run code.
 *
 * Powers may also be written as superscripts with a sign (m⁻¹, s⁻²), which the calculator
 * (step 8, quantity.ts) uses to read units the way a textbook writes them.
 */

export type Expr =
  /** A number, with the text it was written as, so its significant figures can be read. */
  | { type: "number"; value: number; raw?: string }
  | { type: "symbol"; name: string }
  | { type: "unary"; op: "-"; arg: Expr }
  | { type: "binary"; op: "+" | "-" | "*" | "/" | "^"; left: Expr; right: Expr }
  | { type: "call"; fn: FunctionName; arg: Expr };

export const FUNCTIONS = ["sqrt", "log", "ln"] as const;
export type FunctionName = (typeof FUNCTIONS)[number];

/** Why a formula could not be read: a message key under table.formula. */
export type FormulaProblem = "empty" | "unexpected" | "unclosed" | "unknown-symbol";

export type ParseResult =
  | { ok: true; expr: Expr; symbols: string[] }
  | { ok: false; problem: FormulaProblem; at: number; near?: string | undefined };

type Token =
  | { kind: "number"; value: number; raw: string; at: number }
  | { kind: "name"; value: string; at: number }
  | { kind: "op"; value: string; at: number }
  /** A superscript power: ² is 2, ⁻¹ is −1. */
  | { kind: "power"; value: number; at: number };

const SUPERSCRIPT_DIGITS = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const SUPERSCRIPT = /^⁻?[⁰¹²³⁴⁵⁶⁷⁸⁹]+/;
const superscriptValue = (text: string) => {
  const digits = [...text.replace("⁻", "")].map((d) => SUPERSCRIPT_DIGITS.indexOf(d)).join("");
  return (text.startsWith("⁻") ? -1 : 1) * Number(digits);
};
// An unknown symbol is one letter (Latin or Greek) with any subscript digits, primes or an
// underscore suffix: l, t₁, θ, T_1, v'. So "lT" is l times T, as a student means it.
const NAME = /^[\p{L}][₀-₉']*(?:_[\p{L}\d]+)?/u;

function tokenise(text: string, known: readonly string[]): Token[] | { at: number } {
  // Known column symbols and function names are matched first, longest first, so a symbol
  // such as "T²" or "Δθ" is read whole.
  const words = [...known, ...FUNCTIONS, "pi"].sort((a, b) => b.length - a.length);
  const tokens: Token[] = [];
  let i = 0;
  while (i < text.length) {
    const c = text[i]!;
    if (/\s/.test(c)) {
      i += 1;
      continue;
    }
    const num = /^(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/.exec(text.slice(i));
    if (num) {
      tokens.push({ kind: "number", value: Number(num[0]), raw: num[0], at: i });
      i += num[0].length;
      continue;
    }
    if (c === "π") {
      tokens.push({ kind: "name", value: "π", at: i });
      i += 1;
      continue;
    }
    const word = words.find((w) => w !== "" && text.startsWith(w, i));
    if (word) {
      tokens.push({ kind: "name", value: word, at: i });
      i += word.length;
      continue;
    }
    const name = NAME.exec(text.slice(i));
    if (name) {
      tokens.push({ kind: "name", value: name[0], at: i });
      i += name[0].length;
      continue;
    }
    const sup = SUPERSCRIPT.exec(text.slice(i));
    if (sup) {
      tokens.push({ kind: "power", value: superscriptValue(sup[0]), at: i });
      i += sup[0].length;
      continue;
    }
    const op = { "×": "*", "·": "*", "÷": "/", "⁄": "/", "−": "-", "–": "-" }[c] ?? c;
    if ("+-*/^()".includes(op)) {
      tokens.push({ kind: "op", value: op, at: i });
      i += 1;
      continue;
    }
    return { at: i };
  }
  return tokens;
}

/** Parse a formula. `known` lists the symbols it may use (the other columns'). */
export function parseFormula(text: string, known: readonly string[] = []): ParseResult {
  const tokens = tokenise(text, known);
  if (!Array.isArray(tokens))
    return { ok: false, problem: "unexpected", at: tokens.at, near: text[tokens.at] };
  if (tokens.length === 0) return { ok: false, problem: "empty", at: 0 };

  let pos = 0;
  const symbols = new Set<string>();
  const peek = () => tokens[pos];
  const fail = (problem: FormulaProblem, t = peek()): never => {
    throw { problem, at: t?.at ?? text.length, near: t ? String(t.value) : undefined };
  };

  // expr   := term (("+" | "-") term)*
  // term   := unary (("*" | "/") unary | implicit unary)*
  // unary  := "-" unary | power
  // power  := atom ("^" unary | "²" | "³")*
  // atom   := number | name | name "(" expr ")" | "(" expr ")"
  const startsAtom = (t: Token | undefined) =>
    t !== undefined && (t.kind === "number" || t.kind === "name" || t.value === "(");

  function expr(): Expr {
    let left = term();
    for (let t = peek(); t?.kind === "op" && (t.value === "+" || t.value === "-"); t = peek()) {
      pos += 1;
      left = { type: "binary", op: t.value, left, right: term() };
    }
    return left;
  }

  function term(): Expr {
    let left = unary();
    for (;;) {
      const t = peek();
      if (t?.kind === "op" && (t.value === "*" || t.value === "/")) {
        pos += 1;
        left = { type: "binary", op: t.value, left, right: unary() };
      } else if (startsAtom(t)) {
        left = { type: "binary", op: "*", left, right: unary() };
      } else return left;
    }
  }

  function unary(): Expr {
    const t = peek();
    if (t?.kind === "op" && t.value === "-") {
      pos += 1;
      return { type: "unary", op: "-", arg: unary() };
    }
    return power();
  }

  function power(): Expr {
    let base = atom();
    for (;;) {
      const t = peek();
      if (t?.kind === "op" && t.value === "^") {
        pos += 1;
        base = { type: "binary", op: "^", left: base, right: unary() };
      } else if (t?.kind === "power") {
        pos += 1;
        base = { type: "binary", op: "^", left: base, right: { type: "number", value: t.value } };
      } else return base;
    }
  }

  function atom(): Expr {
    const t = peek();
    if (!t) return fail("unexpected");
    if (t.kind === "number") {
      pos += 1;
      return { type: "number", value: t.value, raw: t.raw };
    }
    if (t.kind === "name") {
      pos += 1;
      if ((FUNCTIONS as readonly string[]).includes(t.value) && peek()?.value === "(") {
        pos += 1;
        const arg = expr();
        if (peek()?.value !== ")") fail("unclosed");
        pos += 1;
        return { type: "call", fn: t.value as FunctionName, arg };
      }
      if (t.value === "π" || t.value === "pi") return { type: "number", value: Math.PI, raw: "π" };
      if (!known.includes(t.value)) fail("unknown-symbol", t);
      symbols.add(t.value);
      return { type: "symbol", name: t.value };
    }
    if (t.value === "(") {
      pos += 1;
      const inner = expr();
      if (peek()?.value !== ")") fail("unclosed");
      pos += 1;
      return inner;
    }
    return fail("unexpected");
  }

  try {
    const result = expr();
    if (pos < tokens.length) fail("unexpected");
    return { ok: true, expr: result, symbols: [...symbols] };
  } catch (e) {
    const err = e as { problem: FormulaProblem; at: number; near?: string };
    return { ok: false, problem: err.problem, at: err.at, near: err.near };
  }
}

/** Work a parsed formula out. Returns NaN when a value is missing or the maths is undefined. */
export function evaluate(expr: Expr, values: Readonly<Record<string, number>>): number {
  switch (expr.type) {
    case "number":
      return expr.value;
    case "symbol":
      return values[expr.name] ?? Number.NaN;
    case "unary":
      return -evaluate(expr.arg, values);
    case "call": {
      const x = evaluate(expr.arg, values);
      if (expr.fn === "sqrt") return x < 0 ? Number.NaN : Math.sqrt(x);
      if (x <= 0) return Number.NaN;
      return expr.fn === "log" ? Math.log10(x) : Math.log(x);
    }
    case "binary": {
      const a = evaluate(expr.left, values);
      const b = evaluate(expr.right, values);
      switch (expr.op) {
        case "+":
          return a + b;
        case "-":
          return a - b;
        case "*":
          return a * b;
        case "/":
          return b === 0 ? Number.NaN : a / b;
        case "^":
          return a ** b;
      }
    }
  }
}
