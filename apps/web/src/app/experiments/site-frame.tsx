import { t } from "@pa/i18n";
import "@pa/i18n/catalogue";
import "@pa/i18n/landing";
import Link from "next/link";
import type { ReactNode } from "react";

import "../_landing/landing.css";
import { SiteHeader } from "./site-header";

/**
 * The practicals' header and footer (Practicals.dc.html), around /experiments and each
 * experiment's page: the dark header, and the footer with its giant wordmark.
 */
export function SiteFrame({
  children,
  current = "true",
}: {
  children: ReactNode;
  /** "page" on /experiments itself; an experiment's page is inside the practicals. */
  current?: "page" | "true";
}) {
  return (
    <div className="bg-[var(--pa-paper)] text-[var(--pa-on-paper)]">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:bg-[var(--pa-on-paper)] focus:px-4 focus:py-2 focus:text-[var(--pa-paper)]"
      >
        {t("landing.skip")}
      </a>
      <SiteHeader current={current} />
      <main id="content">{children}</main>
      <footer
        aria-label={t("landing.footer.label")}
        className="overflow-hidden bg-[var(--pa-ink-950)] text-[var(--pa-text-soft)]"
      >
        <div className="mx-auto flex max-w-[1280px] flex-wrap justify-between gap-4 px-8 pt-12 text-sm max-[520px]:px-4">
          <span>{t("practicals.footer.made", { year: new Date().getFullYear() })}</span>
          <span className="flex gap-5">
            {[
              { href: "/terms", label: t("landing.footer.terms") },
              { href: "/privacy", label: t("landing.footer.privacy") },
            ].map((l) => (
              <Link
                key={l.href}
                prefetch={false}
                href={l.href}
                className="text-[var(--pa-text-soft)] hover:text-[var(--pa-text)]"
              >
                {l.label}
              </Link>
            ))}
          </span>
        </div>
        {/* Decoration only, as faint as the board draws it: generated content, so it is not text a
            screen reader or a contrast check reads. */}
        <div
          aria-hidden="true"
          data-word="Physics Anatomy"
          className="mb-[-0.12em] whitespace-nowrap pt-8 text-center font-display text-[clamp(56px,12.6vw,182px)] font-extrabold leading-[0.78] tracking-[-0.05em] text-[var(--pa-dash-hover)] before:content-[attr(data-word)]"
        />
      </footer>
    </div>
  );
}
