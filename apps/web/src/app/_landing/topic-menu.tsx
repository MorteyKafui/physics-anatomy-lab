"use client";

import type { Topic } from "@pa/ui";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

/**
 * One topic in the header: its practicals, each opening its lab, and the practicals page filtered
 * to it. A topic with no practicals yet has no `all` and shows `soon` instead.
 */
export interface MenuTopic {
  topic: Topic;
  name: string;
  /** "All heat practicals": /experiments filtered to this topic. */
  all?: { href: string; label: string };
  /** "Coming soon", for a topic with no practicals yet. */
  soon: string;
  practicals: { id: string; title: string; href: string }[];
}

const focus =
  "focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[var(--pa-accent)]";

const Swatch = ({ topic, dim = false }: { topic: Topic; dim?: boolean }) => (
  <span
    aria-hidden="true"
    className={`inline-block size-2 shrink-0 ${dim ? "opacity-50" : ""}`}
    style={{ background: `var(--pa-topic-${topic})` }}
  />
);

/**
 * One topic's menu in the topic bar: a button that opens a list of its practicals on hover or
 * click. Escape, a click elsewhere or moving away closes it. `end` opens it leftwards, for the
 * last topics in the bar, so it stays on screen.
 */
function TopicDropdown({ t: topic, end }: { t: MenuTopic; end: boolean }) {
  const [open, setOpen] = useState(false);
  const panel = useId();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  // A mouse has already opened the menu by hovering, so its click keeps it open rather than
  // toggling it shut; touch and keyboard toggle.
  const byMouse = useRef(false);
  const empty = topic.practicals.length === 0;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div
      ref={root}
      className="relative"
      onPointerEnter={(e) => e.pointerType === "mouse" && setOpen(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setOpen(false)}
      onBlur={(e) => {
        if (!root.current?.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={panel}
        onPointerDown={(e) => {
          byMouse.current = e.pointerType === "mouse";
        }}
        onClick={() => {
          // Read the flag now: React runs the updater later, after it has been reset.
          const mouse = byMouse.current;
          byMouse.current = false;
          setOpen((o) => (mouse ? true : !o));
        }}
        className={`flex cursor-pointer items-center gap-1.5 whitespace-nowrap border-0 bg-transparent px-2.5 py-1.5 text-sm hover:text-[var(--pa-text)] ${
          open ? "text-[var(--pa-text)]" : "text-[var(--pa-text-soft)]"
        } ${focus}`}
      >
        <Swatch topic={topic.topic} dim={empty} />
        {topic.name}
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          aria-hidden="true"
          className={`transition-transform duration-200 motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
        >
          <path d="M1 3l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>
      {/* pt-1 bridges the gap so the pointer can travel from the button to the list. */}
      <div
        id={panel}
        hidden={!open}
        className={`absolute top-full z-50 pt-1 ${end ? "right-0" : "left-0"}`}
      >
        <ul className="m-0 flex w-max min-w-[240px] max-w-[min(340px,calc(100vw-32px))] list-none flex-col border border-[var(--pa-dash-chip-grey-line)] bg-[var(--pa-ink-950)] p-1.5 shadow-[0_18px_36px_-20px_color-mix(in_srgb,var(--pa-ink-1000)_90%,transparent)]">
          {empty && (
            <li className="px-3 py-2.5 text-sm text-[var(--pa-text-soft)]">{topic.soon}</li>
          )}
          {topic.practicals.map((p) => (
            <li key={p.id}>
              <Link
                prefetch={false}
                href={p.href}
                onClick={() => setOpen(false)}
                className={`block px-3 py-2.5 text-[15px] text-[var(--pa-text)] no-underline hover:bg-[var(--pa-dash-hover)] ${focus}`}
              >
                {p.title}
              </Link>
            </li>
          ))}
          {topic.all && (
            <li className="mt-1 border-t border-[var(--pa-line)] pt-1">
              <Link
                prefetch={false}
                href={topic.all.href}
                onClick={() => setOpen(false)}
                className={`block px-3 py-2.5 text-sm text-[var(--pa-text-soft)] no-underline hover:bg-[var(--pa-dash-hover)] hover:text-[var(--pa-text)] ${focus}`}
              >
                {topic.all.label}
              </Link>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

/** The topic bar: the second row of the wide header, one menu per topic (after oPhysics). */
export function TopicBar({ topics, label }: { topics: MenuTopic[]; label: string }) {
  return (
    <nav aria-label={label} className="hidden flex-wrap items-center gap-0.5 min-[1024px]:flex">
      {topics.map((tp, i) => (
        <TopicDropdown key={tp.topic} t={tp} end={i >= topics.length - 2} />
      ))}
    </nav>
  );
}

/** The topics as headed lists, for the small-screen menu. */
export function TopicList({ topics, onPick }: { topics: MenuTopic[]; onPick: () => void }) {
  return (
    <div className="grid grid-cols-1 gap-x-4 min-[560px]:grid-cols-2">
      {topics.map((tp) => (
        <div key={tp.topic} className="flex flex-col border-b border-[var(--pa-line)] py-2">
          <span className="flex items-center gap-2 px-3 py-1.5 text-[13px] text-[var(--pa-text-soft)]">
            <Swatch topic={tp.topic} dim={tp.practicals.length === 0} />
            {tp.name}
            {tp.practicals.length === 0 && <span className="ml-auto text-xs">{tp.soon}</span>}
          </span>
          {tp.practicals.map((p) => (
            <Link
              key={p.id}
              prefetch={false}
              href={p.href}
              onClick={onPick}
              className={`py-2.5 pl-7 pr-3 text-[15px] text-[var(--pa-text)] no-underline ${focus}`}
            >
              {p.title}
            </Link>
          ))}
        </div>
      ))}
    </div>
  );
}
