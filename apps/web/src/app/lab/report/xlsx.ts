import { zipSync } from "fflate";

/**
 * A table as an Excel workbook (.xlsx), made in the browser: one sheet, headings with their
 * units in the first row ("T²/s²"), numbers as numbers so a spreadsheet can work with them.
 */

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const column = (i: number) => {
  let n = i + 1;
  let s = "";
  while (n > 0) {
    s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
};

export function tableXlsx(
  name: string,
  headings: readonly string[],
  rows: readonly (readonly string[])[],
) {
  return sheetXlsx(name, [headings, ...rows]);
}

/** Any rows of cells as a one-sheet workbook; numbers as numbers, the rest as text. */
export function sheetXlsx(name: string, rows: readonly (readonly string[])[]) {
  const cell = (v: string, r: number, c: number) => {
    const ref = `${column(c)}${r}`;
    const n = v.trim() === "" ? NaN : Number(v.trim());
    return Number.isFinite(n)
      ? `<c r="${ref}"><v>${n}</v></c>`
      : `<c r="${ref}" t="inlineStr"><is><t>${esc(v)}</t></is></c>`;
  };
  const sheetRows = rows
    .map((r, i) => `<row r="${i + 1}">${r.map((v, c) => cell(v, i + 1, c)).join("")}</row>`)
    .join("");
  const enc = (s: string) => new TextEncoder().encode(s);
  return zipSync({
    "[Content_Types].xml": enc(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`,
    ),
    "_rels/.rels": enc(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    ),
    "xl/workbook.xml": enc(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${esc(name.slice(0, 31))}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    ),
    "xl/_rels/workbook.xml.rels": enc(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
    ),
    "xl/worksheets/sheet1.xml": enc(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRows}</sheetData></worksheet>`,
    ),
  });
}
