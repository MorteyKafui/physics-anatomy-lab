"use client";

import { t } from "@pa/i18n";
import "@pa/i18n/catalogue";
import "@pa/i18n/landing";
import { Logo } from "@pa/ui";
import Link from "next/link";
import { useId, useState } from "react";

import { type MenuTopic, TopicBar, TopicList } from "../_landing/topic-menu";

const focus =
  "focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[var(--pa-accent)]";

/** The lab a visitor lands in from "Open the lab": the first practical. */
export const FIRST_LAB = "/lab/simple-pendulum";

/**
 * The public pages' dark header (Practicals.dc.html): the practicals, about and "Open the lab",
 * with a second row of topic menus (after oPhysics). Below 1024px all of it is in the menu. No account links (ADR 0047). `current` is "page" on /experiments itself and
 * "true" on an experiment's page, which is inside the practicals.
 */
export function SiteHeader({ current, topics }: { current: "page" | "true"; topics: MenuTopic[] }) {
  const [open, setOpen] = useState(false);
  const menu = useId();
  const links = [
    { href: "/experiments", label: t("practicals.nav.practicals"), current },
    { href: "/about", label: t("practicals.nav.about") },
  ];
  const link = (l: (typeof links)[number], small = false) => (
    <Link
      key={l.href}
      prefetch={false}
      href={l.href}
      aria-current={l.current}
      onClick={small ? () => setOpen(false) : undefined}
      className={`${small ? "p-3" : "px-3 py-2"} no-underline hover:text-[var(--pa-text)] ${
        l.current
          ? "text-[var(--pa-text)] shadow-[inset_0_-2px_0_var(--pa-accent)]"
          : "text-[var(--pa-text-soft)]"
      } ${focus}`}
    >
      {l.label}
    </Link>
  );

  return (
    <header className="bg-[var(--pa-ink-950)] text-[var(--pa-text)]">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-8 py-3.5 max-[520px]:gap-2 max-[520px]:px-4">
        <Link
          prefetch={false}
          href="/"
          aria-label={t("landing.home")}
          className={`flex min-w-0 items-center gap-2.5 text-[var(--pa-text)] no-underline max-[400px]:gap-2 [&>svg]:shrink-0 ${focus}`}
        >
          <Logo size={28} />
          <span className="whitespace-nowrap font-display text-lg font-bold max-[400px]:text-[15px] max-[359px]:hidden">
            Physics Anatomy
          </span>
        </Link>
        <nav
          aria-label={t("practicals.nav.main")}
          className="hidden items-center gap-1 text-[15px] min-[1024px]:flex"
        >
          {links.map((l) => link(l))}
        </nav>
        <div className="flex items-center gap-1.5">
          <Link
            prefetch={false}
            href={FIRST_LAB}
            className={`whitespace-nowrap bg-[var(--pa-accent)] px-3.5 py-[9px] text-[15px] font-semibold max-[400px]:px-2.5 text-[var(--pa-ink-950)] no-underline ${focus}`}
          >
            {t("practicals.open")}
          </Link>
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
        </div>
      </div>
      <div className="mx-auto hidden max-w-[1280px] border-t border-[var(--pa-line)] px-[22px] py-1 min-[1024px]:block">
        <TopicBar topics={topics} label={t("landing.nav.topics")} />
      </div>
      {open && (
        <nav
          id={menu}
          aria-label={t("landing.nav.small")}
          className="flex flex-col border-t border-[var(--pa-line)] px-4 pb-3 text-[15px] min-[1024px]:hidden"
        >
          {link(links[0]!, true)}
          <TopicList topics={topics} onPick={() => setOpen(false)} />
          {links.slice(1).map((l) => link(l, true))}
        </nav>
      )}
    </header>
  );
}
