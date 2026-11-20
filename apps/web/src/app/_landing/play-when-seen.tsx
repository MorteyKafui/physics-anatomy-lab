"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { stillPage } from "./use-lite";

/**
 * Runs its children's CSS loops only while they are on screen, and never in Lite mode or with
 * reduced motion (landing page brief, decision 2): it sets data-playing and data-still, which
 * landing.css reads.
 */
export function PlayWhenSeen({ children, className }: { children: ReactNode; className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    if (stillPage()) {
      el.dataset.still = "true";
      return;
    }
    const seen = new IntersectionObserver(([entry]) => {
      el.dataset.playing = String(entry?.isIntersecting ?? false);
    });
    seen.observe(el);
    return () => seen.disconnect();
  }, []);
  return (
    <div ref={box} data-playing="false" className={className}>
      {children}
    </div>
  );
}
