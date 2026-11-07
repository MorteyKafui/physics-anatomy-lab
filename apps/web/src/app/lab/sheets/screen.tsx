"use client";

import { simplePendulum } from "@pa/experiments";
import { t, type MessageKey } from "@pa/i18n";
import { cn, Logo } from "@pa/ui";
import { Button } from "@pa/ui/components/button";
import { CheckIcon } from "@pa/ui/icons";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { pngBytes, save, svgText } from "../snapshot-export";
import { loadFonts, type Paper } from "../report/pdf";
import { SHEET_KINDS, sheetContent, type SheetKind } from "./content";
import { SHEET_BENCH, SHEET_GRAPH, SHEET_STEPS, SheetBench, SheetGraph } from "./figures";
import { sheetPdf, type Picture } from "./pdf";

const E = simplePendulum;
/** Print resolution for the figures: about 300 dpi at the size they print. */
const SCALE = 3;

/**
 * The simple pendulum's print sheets (master plan, "Print sheets", from the Anatomy print
 * pipeline, D7): the poster, the explained drawing and the explainer, made on this device from the
 * lab's own bench and numbers worked out from the physics.
 */
export function SheetsScreen() {
  const content = useMemo(() => sheetContent(), []);
  const [kind, setKind] = useState<SheetKind>("poster");
  const [paper, setPaper] = useState<Paper>("a4");
  // The sheet drawn last, and which sheet and paper it was drawn for: a choice the student has
  // just changed is never downloaded or shown under the new name.
  const [made, setMade] = useState<{
    kind: SheetKind;
    paper: Paper;
    url: string;
    pages: number;
    bytes: Uint8Array;
  }>();
  const preview = made && made.kind === kind && made.paper === paper ? made : undefined;
  const [toast, setToast] = useState<string>();
  const main = useRef<SVGSVGElement>(null);
  const stills = useRef<(SVGSVGElement | null)[]>([]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(undefined), 6000);
    return () => clearTimeout(id);
  }, [toast]);

  // Make the chosen sheet whenever the choice changes, and show the PDF itself as the preview.
  useEffect(() => {
    let cancelled = false;
    let url: string | undefined;
    void (async () => {
      const draw = async (el: SVGSVGElement | null, size: { width: number; height: number }) =>
        ({
          png: await pngBytes(svgText(el!), size.width, size.height, SCALE),
          ...size,
        }) satisfies Picture;
      const images = {
        main: await draw(main.current, SHEET_BENCH),
        steps: await Promise.all(
          SHEET_STEPS.map((s, i) =>
            draw(stills.current[i] ?? null, s.id === "plot" ? SHEET_GRAPH : SHEET_BENCH),
          ),
        ),
      };
      const pdf = await sheetPdf(kind, content, images, await loadFonts(), paper);
      if (cancelled) return;
      url = URL.createObjectURL(new Blob([new Uint8Array(pdf.bytes)], { type: "application/pdf" }));
      setMade({ kind, paper, url, pages: pdf.pages, bytes: pdf.bytes });
    })();
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [kind, paper, content]);

  const name = t(`sheets.format.${kind}` as MessageKey);
  const download = () => {
    if (!preview) return;
    save(preview.bytes, `${E.id}-${kind}-${paper}.pdf`, "application/pdf");
    setToast(
      preview.pages === 1
        ? t("sheets.made.one", { name })
        : t("sheets.made", { name, pages: preview.pages }),
    );
  };

  return (
    <main className="flex min-h-dvh flex-col gap-3.5 bg-[var(--pa-ink-1000)] p-3.5 text-foreground">
      <header className="flex flex-wrap items-center gap-x-3.5 gap-y-2.5 border border-border bg-[var(--pa-ink-900)] px-4 py-3">
        <Link
          href="/"
          aria-label={t("lab.rail.home")}
          className="flex size-[30px] items-center justify-center bg-foreground text-background"
        >
          <Logo size={20} />
        </Link>
        <nav
          aria-label={t("review.back")}
          className="flex items-center gap-2 text-muted-foreground"
        >
          <Link href={`/lab/${E.id}`} className="hover:text-foreground">
            {t("experiments.simple-pendulum.title")}
          </Link>
          <span aria-hidden>›</span>
          <h1 className="text-foreground" aria-current="page">
            {t("sheets.title")}
          </h1>
        </nav>
        <span className="border border-input px-2 py-0.5 text-xs text-soft">{content.number}</span>
      </header>

      <div className="flex flex-wrap items-start gap-3.5">
        <aside
          aria-label={t("sheets.formats")}
          className="flex min-w-0 flex-[1_1_280px] flex-col gap-4 border border-border bg-[var(--pa-ink-900)] px-4 py-3.5 lg:max-w-[340px]"
        >
          <p className="text-sm text-soft">{t("sheets.intro")}</p>
          <fieldset className="m-0 flex flex-col gap-1.5 border-0 p-0">
            <legend className="mb-1.5 text-xs text-muted-foreground">{t("sheets.formats")}</legend>
            {SHEET_KINDS.map((k) => (
              <label
                key={k}
                className={cn(
                  "flex cursor-pointer items-center gap-2.5 border px-2.5 py-2 text-sm",
                  kind === k ? "border-foreground bg-surface" : "border-input",
                )}
              >
                <input
                  type="radio"
                  name="sheet-kind"
                  className="size-3.5 accent-primary"
                  checked={kind === k}
                  onChange={() => setKind(k)}
                />
                <span className="flex flex-col">
                  <span>{t(`sheets.format.${k}` as MessageKey)}</span>
                  <span className="text-xs text-muted-foreground">
                    {t(`sheets.sub.${k}` as MessageKey)}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>
          <label className="flex items-center justify-between gap-3 text-sm">
            {t("report.paper")}
            <select
              value={paper}
              onChange={(e) => setPaper(e.target.value as Paper)}
              className="h-9 border border-input bg-surface px-2 text-sm text-foreground"
            >
              <option value="a4">{t("report.paper.a4")}</option>
              <option value="letter">{t("report.paper.letter")}</option>
            </select>
          </label>
          <Button className="h-[38px] font-semibold" disabled={!preview} onClick={download}>
            {t("sheets.download", { name })}
          </Button>
          <span className="text-xs text-muted-foreground">{t("report.offline")}</span>
        </aside>

        <section
          aria-label={t("sheets.preview")}
          className="flex min-h-[70dvh] min-w-0 flex-[999_1_560px] flex-col border border-border bg-surface"
        >
          {preview ? (
            <object
              data={preview.url}
              type="application/pdf"
              title={t("sheets.previewTitle", { name })}
              className="min-h-[70dvh] w-full flex-1"
            >
              <p className="p-6 text-soft">{t("sheets.noPreview")}</p>
            </object>
          ) : (
            <p className="p-6 text-muted-foreground" aria-busy="true">
              {t("sheets.making")}
            </p>
          )}
        </section>
      </div>

      {/* The figures the sheets are made from, kept out of sight. */}
      <div hidden>
        <SheetBench pins ref={main} />
        {SHEET_STEPS.map((s, i) =>
          s.id === "plot" ? (
            <SheetGraph
              key={s.id}
              sheet={content.model}
              ref={(el) => {
                stills.current[i] = el;
              }}
            />
          ) : (
            <SheetBench
              key={s.id}
              assembly={s.assembly}
              focus={s.focus}
              angle={s.angle}
              ref={(el) => {
                stills.current[i] = el;
              }}
            />
          ),
        )}
      </div>

      <div
        role="status"
        className="pointer-events-none fixed right-4 bottom-4 z-40 md:right-7 md:bottom-7"
      >
        {toast && (
          <div className="flex max-w-[380px] items-start gap-3 bg-foreground px-3.5 py-3 text-background">
            <span className="flex size-[18px] shrink-0 items-center justify-center rounded-full bg-[var(--pa-ok)]">
              <CheckIcon className="size-[11px]" strokeWidth={3.5} aria-hidden />
            </span>
            <span className="flex-1 text-[13px]">{toast}</span>
          </div>
        )}
      </div>
    </main>
  );
}
