"use client";

import { t } from "@pa/i18n";
import "@pa/i18n/landing";
import { topicHue } from "@pa/ui";
import Link from "next/link";
import { useId, useRef, useState, useSyncExternalStore } from "react";

import { PRACTICALS, practicalShort, practicalTitle, useChosenPractical } from "./practicals";

/** The page's origin never changes, so there is nothing to subscribe to. */
const noSubscription = () => () => {};

const focus =
  "focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[var(--pa-accent)]";

/**
 * The orange band (Landing.dc.html; it was the sign-up band before accounts were switched off,
 * ADR 0047): every practical for students, and for teachers the link to the practical the hero
 * shows, to send to a class or put on a projector.
 */
export function OpenBand() {
  const { practical } = useChosenPractical();
  // Which link was copied: choosing another practical shows "Copy link" again.
  const [copiedHref, setCopiedHref] = useState<string | null>(null);
  const copied = copiedHref === practical.href;
  const field = useRef<HTMLInputElement>(null);
  const label = useId();
  // The origin is known only in the browser; the server renders the path alone, so hydration agrees.
  const origin = useSyncExternalStore(
    noSubscription,
    () => window.location.origin,
    () => "",
  );
  const link = `${origin}${practical.href}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiedHref(practical.href);
    } catch {
      // No clipboard (an insecure origin, or permission refused): select the link to copy by hand.
      field.current?.select();
    }
  };

  return (
    <>
      <nav
        aria-label={t("landing.open.students")}
        className="flex min-w-0 flex-[1_1_340px] flex-col gap-1.5 bg-[var(--pa-ink-950)] p-7 text-[var(--pa-text)]"
      >
        <span className="mb-2 text-[22px] font-semibold">{t("landing.open.students")}</span>
        {PRACTICALS.map((p) => (
          <Link
            key={p.id}
            prefetch={false}
            href={p.href}
            className={`flex items-center gap-3 border-b border-[var(--pa-dash-press)] py-[11px] text-base text-[var(--pa-text)] no-underline hover:text-[var(--pa-accent)] ${focus}`}
          >
            <span className="size-2.5 flex-none" style={{ background: topicHue[p.topic] }} />
            <span className="flex-1">{practicalTitle(p.id)}</span>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
        ))}
      </nav>
      <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-3.5 bg-[var(--pa-paper)] p-7 text-[var(--pa-on-paper)]">
        <span className="text-[22px] font-semibold">{t("landing.open.teachers")}</span>
        <p className="m-0 text-[var(--pa-on-paper-muted)]">{t("landing.open.share")}</p>
        <label htmlFor={label} className="text-sm text-[var(--pa-on-paper-muted)]">
          {t("landing.open.link", { name: practicalShort(practical.id) })}
        </label>
        <div className="flex">
          <input
            id={label}
            ref={field}
            type="text"
            readOnly
            value={link}
            onFocus={(e) => e.currentTarget.select()}
            className={`h-12 min-w-0 flex-1 border border-r-0 border-[var(--pa-on-paper)] bg-white px-3.5 font-mono text-[15px] ${focus}`}
          />
          <button
            type="button"
            onClick={() => void copy()}
            className={`h-12 border border-[var(--pa-ink-950)] bg-[var(--pa-ink-950)] px-[18px] text-[15px] font-semibold text-[var(--pa-paper)] ${focus}`}
          >
            <span aria-live="polite">
              {copied ? t("landing.open.copied") : t("landing.open.copy")}
            </span>
          </button>
        </div>
        <span className="text-[13px] text-[var(--pa-on-paper-muted)]">
          {t("landing.open.hint")}
        </span>
      </div>
    </>
  );
}
