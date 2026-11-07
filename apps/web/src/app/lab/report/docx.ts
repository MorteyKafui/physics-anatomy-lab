import { t } from "@pa/i18n";
import { zipSync } from "fflate";

import type { ReportContent, ReportSection } from "./content";
import type { ReportImages, ReportOptions } from "./pdf";

/**
 * The report as a Word file (.docx) the student can keep editing, made in the browser. A .docx is a
 * ZIP of XML parts; this writes the few a report needs: the text with headings and lists, Table 1,
 * the two figures, and page numbers in the footer.
 */

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const run = (text: string, bold = false, size?: number) =>
  `<w:r><w:rPr>${bold ? "<w:b/>" : ""}${size ? `<w:sz w:val="${size}"/>` : ""}</w:rPr><w:t xml:space="preserve">${esc(text)}</w:t></w:r>`;

const para = (body: string, style?: string, extra = "") =>
  `<w:p><w:pPr>${style ? `<w:pStyle w:val="${style}"/>` : ""}${extra}</w:pPr>${body}</w:p>`;

/** EMUs per CSS pixel at 96 dpi. */
const EMU = 9525;
/** The text width of A4 with 2 cm margins, in EMUs (about 17 cm). */
const MAX_WIDTH = 6120000;

function image(rId: string, id: number, w: number, h: number, maxFraction: number, name: string) {
  const scale = Math.min(1, (MAX_WIDTH * maxFraction) / (w * EMU));
  const cx = Math.round(w * EMU * scale);
  const cy = Math.round(h * EMU * scale);
  return para(
    `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${id}" name="${esc(name)}" descr="${esc(name)}"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${id}" name="${esc(name)}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`,
    undefined,
    '<w:jc w:val="center"/>',
  );
}

function table(headings: string[], rows: string[][]) {
  if (!headings.length) return "";
  const border = (v: string) => `<w:${v} w:val="single" w:sz="4" w:space="0" w:color="141414"/>`;
  const cell = (text: string, bold: boolean) =>
    `<w:tc><w:tcPr><w:tcW w:w="${Math.floor(9638 / headings.length)}" w:type="dxa"/></w:tcPr>${para(run(text, bold))}</w:tc>`;
  const row = (cells: string[], bold: boolean) =>
    `<w:tr>${cells.map((c) => cell(c, bold)).join("")}</w:tr>`;
  return `<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblBorders>${["top", "left", "bottom", "right", "insideH", "insideV"].map(border).join("")}</w:tblBorders></w:tblPr><w:tblGrid>${headings.map(() => `<w:gridCol w:w="${Math.floor(9638 / headings.length)}"/>`).join("")}</w:tblGrid>${row(headings, true)}${rows.map((r) => row(r, false)).join("")}</w:tbl>${para("")}`;
}

/** A section's text: a dash starts a list item. */
function body(text: string) {
  return text
    .split("\n")
    .map((line) => {
      const item = /^\s*[-•]\s+/.exec(line);
      return item
        ? para(run(`• ${line.slice(item[0].length)}`), undefined, '<w:ind w:left="360"/>')
        : para(run(line));
    })
    .join("");
}

/** The report as .docx bytes. */
export function reportDocx(
  content: ReportContent,
  images: ReportImages,
  options: Omit<ReportOptions, "paper"> & { paper: "a4" | "letter" },
): Uint8Array {
  const parts: string[] = [];
  const media: Record<string, Uint8Array> = {};
  const rels: string[] = [];
  let next = 10;
  const addImage = (key: "bench" | "graph", fraction: number, name: string) => {
    const img = images[key];
    if (!img) return "";
    const rId = `rId${next}`;
    media[`word/media/${key}.png`] = img.png;
    rels.push(
      `<Relationship Id="${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${key}.png"/>`,
    );
    next += 1;
    return image(rId, next, img.width, img.height, fraction, name);
  };

  parts.push(para(run(content.title), "Title"));
  parts.push(para(run(content.date)));
  if (options.mark) parts.push(para(run("Physics Anatomy", true, 18)));

  const section = (s: ReportSection) => {
    parts.push(para(run(s.title), "Heading1"));
    if (s.figure === "bench") parts.push(addImage("bench", 0.6, s.title));
    if (s.figure === "graph") parts.push(addImage("graph", 0.8, s.title));
    const showText = !s.figure || options.captions || s.id === "observations";
    if (s.figure === "table" && s.id !== "observations") {
      if (showText && s.text) parts.push(body(s.text));
      parts.push(table(content.table.headings, content.table.rows));
      return;
    }
    if (s.text.trim() === "") parts.push(para(run(t("report.toDo"))));
    else if (showText) parts.push(body(s.text));
    if (s.id === "observations" && s.figure === "table")
      parts.push(table(content.table.headings, content.table.rows));
  };
  content.sections.forEach(section);
  if (options.notes && content.notes.length) {
    parts.push(para(run(t("report.notes")), "Heading1"));
    content.notes.forEach((n) => parts.push(para(run(n))));
  }

  const page =
    options.paper === "letter"
      ? '<w:pgSz w:w="12240" w:h="15840"/>'
      : '<w:pgSz w:w="11906" w:h="16838"/>';
  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><w:body>${parts.join("")}<w:sectPr><w:footerReference w:type="default" r:id="rId2"/>${page}<w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr></w:body></w:document>`;

  const footer = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>1</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p></w:ftr>`;

  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="22"/><w:lang w:val="en-GB"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="80" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="60"/></w:pPr><w:rPr><w:b/><w:sz w:val="32"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="60"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:sz w:val="24"/></w:rPr></w:style></w:styles>`;

  const docRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>${rels.join("")}</Relationships>`;

  const types = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`;

  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`;

  const core = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${esc(content.title)}</dc:title><dc:creator>Physics Anatomy</dc:creator><dc:language>en-GB</dc:language></cp:coreProperties>`;

  const enc = (s: string) => new TextEncoder().encode(s);
  return zipSync({
    "[Content_Types].xml": enc(types),
    "_rels/.rels": enc(rootRels),
    "docProps/core.xml": enc(core),
    "word/document.xml": enc(document),
    "word/styles.xml": enc(styles),
    "word/footer1.xml": enc(footer),
    "word/_rels/document.xml.rels": enc(docRels),
    ...media,
  });
}
