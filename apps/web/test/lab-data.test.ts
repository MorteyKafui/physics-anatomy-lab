import { describe, expect, test } from "bun:test";
import { strToU8, zipSync } from "fflate";

import { labDataJson, LAB_DATA_FORMAT } from "../src/app/lab/lab-data/json";
import { completeRows, matchTemplate, MAX_ROWS, splitHeading } from "../src/app/lab/lab-data/match";
import { problemText } from "../src/app/lab/lab-data/problems";
import { csvCells, MAX_FILE_BYTES, readCells, xlsxCells } from "../src/app/lab/lab-data/read";
import {
  templateCsv,
  templateFileName,
  templateRows,
  templateXlsx,
  type DataTemplate,
} from "../src/app/lab/lab-data/template";

// A template shaped like the pendulum's, for the shared parts; each experiment's own template is
// built from packages/experiments in its own pull request.
const TEMPLATE: DataTemplate = {
  experiment: "example",
  version: 1,
  title: "An example pendulum",
  note: "Time 20 swings at each length.",
  values: [{ id: "r", label: "Bob radius r", kind: "length", unit: "cm", optional: true }],
  columns: [
    { id: "l", symbol: "l", kind: "length", unit: "m", role: "setting" },
    { id: "t", symbol: "t", kind: "time", unit: "s", role: "reading" },
  ],
  settings: [[0.5], [0.6], [0.7]],
};

/** The template's rows with the student's readings filled in, as they would be in a lab. */
const filled = (times: readonly string[]) => {
  const rows = templateRows(TEMPLATE);
  const head = rows.findIndex((r) => r[0] === "l / m");
  times.forEach((time, i) => (rows[head + 1 + i]![1] = time));
  return rows;
};

const enc = (s: string) => new TextEncoder().encode(s);

describe("the data template", () => {
  test("holds the settings and the headings with their units, nothing worked out", () => {
    const rows = templateRows(TEMPLATE);
    expect(rows[0]![0]).toBe("Physics Anatomy data template");
    expect(rows).toContainEqual(["l / m", "t / s"]);
    expect(rows).toContainEqual(["0.5", ""]);
    expect(rows).toContainEqual(["Bob radius r / cm", ""]);
    expect(rows.flat().join(" ")).not.toContain("T²");
  });

  test("reads back from its own CSV and XLSX unchanged", () => {
    const empty = matchTemplate(readCellsOk("t.csv", enc(templateCsv(TEMPLATE))), TEMPLATE);
    expect(empty.problems).toEqual([]);
    expect(empty.rows).toEqual([]);
    const fromXlsx = matchTemplate(readCellsOk("t.xlsx", templateXlsx(TEMPLATE)), TEMPLATE);
    expect(fromXlsx.problems).toEqual([]);
    expect(templateFileName(TEMPLATE, "xlsx")).toBe("example-data-template.xlsx");
  });

  test("filled in, gives the readings in the template's units", () => {
    const rows = filled(["28.42", "31.03", "33.69"]);
    const csv = templateCsvFrom(rows);
    const data = matchTemplate(readCellsOk("readings.csv", enc(csv)), TEMPLATE);
    expect(data.problems).toEqual([]);
    expect(data.rows.map((r) => r.values)).toEqual([
      { l: 0.5, t: 28.42 },
      { l: 0.6, t: 31.03 },
      { l: 0.7, t: 33.69 },
    ]);
  });
});

describe("reading a file", () => {
  test("refuses a file over 1 MB, another type, and macros", () => {
    expect(readCells("a.csv", new Uint8Array(MAX_FILE_BYTES + 1))).toEqual({
      ok: false,
      problem: { code: "too-large", limit: 1 },
    });
    expect(readCells("a.pdf", enc("x"))).toEqual({
      ok: false,
      problem: { code: "wrong-type", name: "a.pdf" },
    });
    expect(readCells("a.xlsm", enc("x"))).toEqual({ ok: false, problem: { code: "macros" } });
    expect(readCells("a.xlsx", enc("not a zip"))).toEqual({
      ok: false,
      problem: { code: "unreadable", kind: ".xlsx" },
    });
  });

  test("CSV: quotes, line breaks in a cell, semicolons and a byte order mark", () => {
    expect(csvCells('﻿a,"b, c","say ""hi"""\r\n1,"two\nlines",3')).toEqual([
      ["a", "b, c", 'say "hi"'],
      ["1", "two\nlines", "3"],
    ]);
    expect(csvCells("l / m;t / s\n0,5;28,42\n")).toEqual([
      ["l / m", "t / s"],
      ["0,5", "28,42"],
    ]);
  });

  test("XLSX: shared strings, rich text, inline strings and saved formula values", () => {
    const sheet = `<worksheet><sheetData>
      <row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row>
      <row r="3"><c r="A3"><v>0.5</v></c><c r="B3"><f>A3*56.84</f><v>28.419999999999998</v></c></row>
      <row r="4"><c r="A4" t="inlineStr"><is><t>0.6</t></is></c><c r="C4"><v>1</v></c></row>
    </sheetData></worksheet>`;
    const shared = `<sst><si><t>l / m</t></si><si><r><t>t</t></r><r><t xml:space="preserve"> / s</t></r></si></sst>`;
    const cells = xlsxCells(book(sheet, shared));
    expect(cells).toEqual([["l / m", "t / s"], [], ["0.5", "28.42"], ["0.6", "", "1"]]);
  });

  test("XLSX: a file that unpacks to far more than it weighs is refused", () => {
    const big = zipSync({ "xl/worksheets/sheet1.xml": new Uint8Array(9 * 1024 * 1024) });
    expect(big.byteLength).toBeLessThan(MAX_FILE_BYTES);
    expect(readCells("big.xlsx", big)).toEqual({
      ok: false,
      problem: { code: "unreadable", kind: ".xlsx" },
    });
  });
});

describe("matching a file to the template", () => {
  test("finds the columns by their headings in any order, and converts units", () => {
    const cells = [
      ["notes", "t (ms)", "l/cm"],
      ["", "28420", "50.0"],
      ["", "31030", "60.0"],
    ];
    const data = matchTemplate(cells, TEMPLATE);
    expect(data.problems).toEqual([]);
    expect(data.rows.map((r) => r.values)).toEqual([
      { l: 0.5, t: 28.42 },
      { l: 0.6, t: 31.03 },
    ]);
  });

  test("names a comma decimal, keeps the other readings, and leaves out rows not done", () => {
    const data = matchTemplate(
      [
        ["l / m", "t / s"],
        ["0.5", "28.42"],
        ["0.6", "31,03"],
        ["0.7", "33.69"],
        ["0.8", ""],
      ],
      TEMPLATE,
    );
    expect(data.problems).toEqual([
      { code: "comma", row: 2, column: "t", value: "31,03", suggestion: "31.03" },
    ]);
    expect(problemText(data.problems[0]!)).toBe(
      "Row 2, t: it reads “31,03”. Use a full stop for the decimal point, 31.03.",
    );
    expect(data.rows).toHaveLength(3);
    expect(completeRows(data, TEMPLATE).map((r) => r.row)).toEqual([1, 3]);
  });

  test("a missing heading, a wrong unit, a word for a number and an empty setting", () => {
    expect(matchTemplate([["l / m", "T / s"]], TEMPLATE).problems).toEqual([
      { code: "no-headings", headings: "l / m, t / s" },
    ]);
    const data = matchTemplate(
      [
        ["l / kg", "t / s"],
        ["0.5", "about 28"],
        ["", "31.03"],
      ],
      TEMPLATE,
    );
    expect(data.problems).toEqual([
      { code: "unit", heading: "l / kg", unit: "kg" },
      { code: "not-a-number", row: 1, column: "t" },
    ]);
    const empty = matchTemplate(
      [
        ["l / m", "t / s"],
        ["", "31.03"],
      ],
      TEMPLATE,
    );
    expect(empty.problems).toEqual([{ code: "missing", row: 1, column: "l" }]);
  });

  test("an apparatus value is read by its label, in its unit", () => {
    const data = matchTemplate(
      [["Bob radius r / mm", "12"], [], ["l / m", "t / s"], ["0.5", "28.42"]],
      TEMPLATE,
    );
    expect(data.values.r).toBeCloseTo(1.2, 12);
    const word = matchTemplate(
      [
        ["Bob radius r / cm", "big"],
        ["l / m", "t / s"],
      ],
      TEMPLATE,
    );
    expect(word.problems).toEqual([{ code: "value-not-a-number", label: "Bob radius r / cm" }]);
  });

  test("keeps only the first 200 rows", () => {
    const cells = [
      ["l / m", "t / s"],
      ...Array.from({ length: MAX_ROWS + 5 }, () => ["0.5", "28.42"]),
    ];
    const data = matchTemplate(cells, TEMPLATE);
    expect(data.rows).toHaveLength(MAX_ROWS);
    expect(data.problems).toEqual([{ code: "too-many-rows", limit: MAX_ROWS }]);
  });

  test("splits headings written three ways", () => {
    expect(splitHeading(" t /  s ")).toEqual({ name: "t", unit: "s" });
    expect(splitHeading("T²/s²")).toEqual({ name: "T²", unit: "s²" });
    expect(splitHeading("θ₁ (°C)")).toEqual({ name: "θ₁", unit: "°C" });
    expect(splitHeading("notes")).toEqual({ name: "notes" });
  });
});

test("lab data as JSON is its own format, with every unit", () => {
  const data = matchTemplate(
    [
      ["l / m", "t / s"],
      ["0.5", "28.42"],
    ],
    TEMPLATE,
  );
  const json = JSON.parse(labDataJson(data, TEMPLATE));
  expect(json.format).toBe(LAB_DATA_FORMAT);
  expect(json.events).toBeUndefined();
  expect(json.columns).toEqual([
    { id: "l", symbol: "l", unit: "m" },
    { id: "t", symbol: "t", unit: "s" },
  ]);
  expect(json.rows).toEqual([{ row: 1, l: 0.5, t: 28.42 }]);
  expect(json.values).toEqual([{ id: "r", label: "Bob radius r", unit: "cm", value: null }]);
});

function readCellsOk(name: string, bytes: Uint8Array) {
  const r = readCells(name, bytes);
  if (!r.ok) throw new Error(`Could not read ${name}: ${r.problem.code}`);
  return r.cells;
}

function templateCsvFrom(rows: string[][]) {
  return rows.map((r) => r.join(",")).join("\r\n");
}

function book(sheet: string, shared: string) {
  return zipSync({
    "xl/workbook.xml": strToU8(
      `<workbook xmlns:r="r"><sheets><sheet name="S" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    ),
    "xl/_rels/workbook.xml.rels": strToU8(
      `<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>`,
    ),
    "xl/worksheets/sheet1.xml": strToU8(sheet),
    "xl/sharedStrings.xml": strToU8(shared),
  });
}
