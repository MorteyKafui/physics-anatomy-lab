"use client";

import { t } from "@pa/i18n";
import "@pa/i18n/landing";
import { Logo } from "@pa/ui";
import Link from "next/link";
import { Fragment, useEffect, useId, useState } from "react";

import { type MenuTopic, TopicBar, TopicList } from "./topic-menu";

export interface NavLink {
  href: string;
  label: string;
}

const focus =
  "focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[var(--pa-accent)]";

/**
 * The sticky header that turns into a floating bar once the page scrolls (Main.dc.html, after
 * efferd Header 4). `links` are only sections and pages that exist (landing page brief,
 * decision 7), so the list grows as the page does. A second row holds the topic menus (after
 * oPhysics). Below 1024px the links and topics are in the menu.
 */
export function LandingHeader({
  links,
  topics = [],
  action,
}: {
  links: NavLink[];
  /** A menu for each topic, in the bar's second row and in the small-screen menu. */
  topics?: MenuTopic[];
  /** The one action in the bar: open the lab (no accounts, ADR 0047). */
  action: NavLink;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const menu = useId();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="sticky top-0 z-50 h-0">
      <div
        className={`transition-[padding] duration-300 max-sm:p-2 ${scrolled ? "px-4 py-2.5" : "px-4 py-3.5"}`}
      >
        <div
          data-scrolled={scrolled}
          className={`mx-auto box-border border transition-[max-width,background-color,border-color,padding] duration-[350ms] ${
            scrolled
              ? "max-w-[1040px] border-[var(--pa-dash-chip-grey-line)] bg-[color-mix(in_srgb,var(--pa-ink-950)_88.0%,transparent)] py-2 pl-4 pr-2.5 shadow-[0_12px_30px_-18px_color-mix(in_srgb,var(--pa-ink-1000)_80%,transparent)] backdrop-blur-[14px]"
              : "max-w-[1280px] border-transparent bg-transparent px-4 py-2"
          }`}
        >
          <div className="flex items-center justify-between gap-4 max-sm:gap-2">
            <a
              href="#top"
              aria-label={t("landing.home")}
              className={`flex min-w-0 items-center gap-2.5 text-[var(--pa-text)] no-underline max-[400px]:gap-2 [&>svg]:shrink-0 ${focus}`}
            >
              <Logo size={28} />
              <span className="whitespace-nowrap font-display text-lg font-bold max-[400px]:text-[15px] max-[359px]:hidden">
                Physics Anatomy
              </span>
            </a>
            {links.length > 0 && (
              <nav
                aria-label={t("landing.nav.main")}
                className="hidden items-center gap-1 text-[15px] min-[1024px]:flex"
              >
                {links.map((l) => (
                  <a
                    key={l.href}
                    href={l.href}
                    className={`px-3 py-2 text-[var(--pa-text-soft)] no-underline hover:text-[var(--pa-text)] ${focus}`}
                  >
                    {l.label}
                  </a>
                ))}
              </nav>
            )}
            <div className="flex items-center gap-1.5">
              <Link
                prefetch={false}
                href={action.href}
                className={`whitespace-nowrap bg-[var(--pa-accent)] px-3.5 py-[9px] text-[15px] max-[400px]:px-2.5 font-semibold text-[var(--pa-ink-950)] no-underline ${focus}`}
              >
                {action.label}
              </Link>
              {(links.length > 0 || topics.length > 0) && (
                <button
                  type="button"
                  aria-expanded={open}
                  aria-controls={menu}
                  aria-label={t("landing.menu")}
                  onClick={() => setOpen((o) => !o)}
                  className={`inline-flex size-10 items-center justify-center border border-[var(--pa-line-strong)] bg-transparent text-[var(--pa-text)] min-[1024px]:hidden ${focus}`}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    aria-hidden="true"
                  >
                    <path d="M4 7h16M4 12h16M4 17h16" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          {topics.length > 0 && (
            <div className="mt-1.5 hidden border-t border-[var(--pa-line)] pt-1.5 min-[1024px]:block">
              <TopicBar topics={topics} label={t("landing.nav.topics")} />
            </div>
          )}
        </div>
        {open && (
          <nav
            id={menu}
            aria-label={t("landing.nav.small")}
            className="mt-1.5 flex max-h-[calc(100dvh-96px)] flex-col overflow-y-auto overscroll-contain border border-[var(--pa-dash-chip-grey-line)] bg-[color-mix(in_srgb,var(--pa-ink-950)_94.0%,transparent)] p-2 min-[1024px]:hidden"
          >
            {links.map((l, i) => (
              <Fragment key={l.href}>
                <a
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className={`p-3 text-[var(--pa-text)] no-underline ${focus}`}
                >
                  {l.label}
                </a>
                {i === 0 && <TopicList topics={topics} onPick={() => setOpen(false)} />}
              </Fragment>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}
