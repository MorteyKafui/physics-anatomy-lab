import { t } from "@pa/i18n";
import "@pa/i18n/landing";
import "@pa/i18n/people";
import { Logo } from "@pa/ui";
import Link from "next/link";

import type { NavLink } from "./header";
import { StatusLight } from "./status-light";

/**
 * The large-type footer with a live status light (Main.dc.html, after efferd Footer 14). Only
 * pages that exist are linked (landing page brief, decision 7); Help joins when its pages do.
 */
export function LandingFooter({ product }: { product: NavLink[] }) {
  return (
    <footer
      aria-label={t("landing.footer.label")}
      className="overflow-hidden bg-[var(--pa-ink-950)] text-[var(--pa-text-soft)] [contain-intrinsic-size:auto_420px] [content-visibility:auto]"
    >
      <div className="mx-auto flex max-w-[1280px] flex-col gap-12 px-4 pt-[72px] sm:px-8">
        <div className="flex flex-wrap justify-between gap-10">
          <div className="flex max-w-[360px] flex-[1_1_280px] flex-col gap-4">
            <span className="flex items-center gap-2.5 text-[var(--pa-text)]">
              <Logo size={28} />
              <span className="font-display text-lg font-bold">Physics Anatomy</span>
            </span>
            <span className="text-[15px]">{t("landing.footer.tagline")}</span>
            <StatusLight />
          </div>
          <nav
            aria-label={t("landing.footer.product")}
            className="flex flex-col gap-2.5 text-[15px]"
          >
            <span className="font-semibold text-[var(--pa-text)]">
              {t("landing.footer.product")}
            </span>
            {product.map((l) => (
              <Link
                prefetch={false}
                key={l.href}
                href={l.href}
                className="text-[var(--pa-text-soft)] no-underline hover:text-[var(--pa-text)]"
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <nav aria-label={t("people.footer.about")} className="flex flex-col gap-2.5 text-[15px]">
            <span className="font-semibold text-[var(--pa-text)]">{t("people.footer.about")}</span>
            {[
              { href: "/about", label: t("people.footer.team") },
              { href: "/partners", label: t("people.footer.partners") },
              { href: "/contribute", label: t("people.footer.contribute") },
              { href: "/donate", label: t("people.footer.donate") },
            ].map((l) => (
              <Link
                key={l.href}
                prefetch={false}
                href={l.href}
                className="text-[var(--pa-text-soft)] no-underline hover:text-[var(--pa-text)]"
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <nav aria-label={t("landing.footer.legal")} className="flex flex-col gap-2.5 text-[15px]">
            <span className="font-semibold text-[var(--pa-text)]">{t("landing.footer.legal")}</span>
            {[
              { href: "/terms", label: t("landing.footer.terms") },
              { href: "/privacy", label: t("landing.footer.privacy") },
            ].map((l) => (
              <Link
                key={l.href}
                prefetch={false}
                href={l.href}
                className="text-[var(--pa-text-soft)] no-underline hover:text-[var(--pa-text)]"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex flex-wrap justify-between gap-3 border-t border-[var(--pa-dash-press)] pt-[18px] text-[13px] text-[var(--pa-text-faint)]">
          <span>{t("landing.footer.copyright", { year: new Date().getFullYear() })}</span>
        </div>
      </div>
      {/* Decoration only, as faint as the board draws it: generated content, so it is not text a
          screen reader or a contrast check reads. */}
      <div
        aria-hidden="true"
        data-word="Physics Anatomy"
        className="mb-[-0.12em] whitespace-nowrap pt-8 text-center font-display text-[clamp(56px,12.6vw,182px)] font-extrabold leading-[0.78] tracking-[-0.05em] text-[var(--pa-dash-hover)] before:content-[attr(data-word)]"
      />
    </footer>
  );
}
