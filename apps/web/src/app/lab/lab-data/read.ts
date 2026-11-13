import { strFromU8, unzipSync } from "fflate";

/**
 * Reading a student's file into rows of cells, in the browser, with nothing sent anywhere (data
 * templates brief, decision 3). CSV or XLSX only, at most 1 MB. An XLSX file's first sheet is
 * read for its saved cell values; formulas are never run, macros never opened.
 */

/** The largest file read, bytes. */
export const MAX_FILE_BYTES = 1024 * 1024;
/** The most an XLSX file's parts may unpack to, bytes: a guard against a zip that balloons. */
export const MAX_UNPACKED_BYTES = 8 * 1024 * 1024;

export type ReadProblem =
  | { code: "too-large"; limit: number }
  | { code: "wrong-type"; name: string }
  | { code: "macros" }
  | { code: "unreadable"; kind: "CSV" | "XLSX" };

export type ReadResult = { ok: true; cells: string[][] } | { ok: false; problem: ReadProblem };

export function readCells(name: string, bytes: Uint8Array): ReadResult {
  if (bytes.byteLength > MAX_FILE_BYTES) {
    return { ok: false, problem: { code: "too-large", limit: MAX_FILE_BYTES / (1024 * 1024) } };
  }
  const ext = name.toLowerCase().split(".").pop() ?? "";
  if (ext === "xlsm" || ext === "xlsb") return { ok: false, problem: { code: "macros" } };
  if (ext === "csv" || ext === "txt") {
    try {
      const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      return { ok: true, cells: csvCells(text) };
    } catch {
      return { ok: false, problem: { code: "unreadable", kind: "CSV" } };
    }
  }
  if (ext === "xlsx") {
    try {
      return { ok: true, cells: xlsxCells(bytes) };
    } catch {
      return { ok: false, problem: { code: "unreadable", kind: "XLSX" } };
    }
  }
  return { ok: false, problem: { code: "wrong-type", name } };
}

/**
 * CSV as written by a spreadsheet: quoted cells may hold commas, quotes ("") and line breaks.
 * The separator is the comma, or the semicolon or tab a spreadsheet uses in a country that writes
 * decimals with a comma, whichever the first lines use most.
 */
export function csvCells(text: string): string[][] {
  const body = text.replace(/^﻿/, "");
  const sample = body.split(/\r?\n/).slice(0, 20);
  const count = (sep: string) => sample.filter((line) => line.includes(sep)).length;
  const sep = [",", ";", "\t"].reduce((best, s) => (count(s) > count(best) ? s : best), ",");

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i]!;
    if (quoted) {
      if (ch === '"') {
        if (body[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += ch;
    } else if (ch === '"' && cell === "") quoted = true;
    else if (ch === sep) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && body[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

const decode = (s: string) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, "&");

/** Every <t> in a string item or inline string, joined: rich text is several runs. */
const texts = (xml: string) =>
  [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => decode(m[1]!)).join("");

const columnIndex = (ref: string) => {
  const letters = /^[A-Z]+/.exec(ref)?.[0] ?? "A";
  return [...letters].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;
};

/** A saved number as a spreadsheet shows it: 35.98, not 35.979999999999997. */
const shownNumber = (v: string) => {
  const n = Number(v);
  return Number.isFinite(n) ? String(Number(n.toPrecision(15))) : v;
};

const attr = (tag: string, name: string) => new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1];

export function xlsxCells(bytes: Uint8Array): string[][] {
  let unpacked = 0;
  const files = unzipSync(bytes, {
    filter: (f) => {
      unpacked += f.originalSize;
      if (unpacked > MAX_UNPACKED_BYTES) throw new RangeError("Too large unpacked.");
      return (f.name.startsWith("xl/") && f.name.endsWith(".xml")) || f.name.endsWith(".rels");
    },
  });
  const part = (path: string) => {
    const f = files[path];
    return f ? strFromU8(f) : undefined;
  };

  // The first sheet in the workbook's order, found through its relationship.
  const workbook = part("xl/workbook.xml");
  if (!workbook) throw new Error("No workbook.");
  const sheetTag = /<sheet\s[^>]*>/.exec(workbook)?.[0];
  const rid = sheetTag && (attr(sheetTag, "r:id") ?? attr(sheetTag, "id"));
  const rels = part("xl/_rels/workbook.xml.rels") ?? "";
  const relTag = [...rels.matchAll(/<Relationship\s[^>]*>/g)]
    .map((m) => m[0])
    .find((tag) => attr(tag, "Id") === rid);
  const target = relTag ? attr(relTag, "Target") : "worksheets/sheet1.xml";
  const sheetPath = target!.startsWith("/") ? target!.slice(1) : `xl/${target}`;
  const sheet = part(sheetPath);
  if (!sheet) throw new Error("No sheet.");

  const shared = [...(part("xl/sharedStrings.xml") ?? "").matchAll(/<si>([\s\S]*?)<\/si>/g)].map(
    (m) => texts(m[1]!),
  );

  const rows: string[][] = [];
  for (const rowMatch of sheet.matchAll(/<row(?:\s[^>]*?)?(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    const r = Number(attr(rowMatch[0], "r") ?? rows.length + 1) - 1;
    const row: string[] = [];
    for (const c of (rowMatch[1] ?? "").matchAll(/<c(\s[^>]*?)?(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const tag = c[1] ?? "";
      const inner = c[2] ?? "";
      const type = attr(tag, "t");
      const v = /<v>([\s\S]*?)<\/v>/.exec(inner)?.[1];
      let value = "";
      if (type === "s") value = v !== undefined ? (shared[Number(v)] ?? "") : "";
      else if (type === "inlineStr") value = texts(inner);
      else if (type === "str" || type === "e") value = v !== undefined ? decode(v) : "";
      else if (type === "b") value = v === "1" ? "TRUE" : v === "0" ? "FALSE" : "";
      else value = v !== undefined ? shownNumber(v) : "";
      const ref = attr(tag, "r");
      const ci = ref ? columnIndex(ref) : row.length;
      while (row.length < ci) row.push("");
      row[ci] = value;
    }
    while (rows.length < r) rows.push([]);
    rows[r] = row;
  }
  return rows;
}
