"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const SPEEDS = [1, 2, 0.5] as const;
export type Speed = (typeof SPEEDS)[number];

/**
 * The bench's own time, in seconds: it runs while playing, at the chosen speed, and stops when
 * paused. The stopwatch and the swing both run on it, so slowing the bench slows both together.
 * With reduced motion preferred, the bench starts paused.
 */
export function useBenchClock() {
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(
    () =>
      typeof window === "undefined" ||
      !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
  );
  const [speed, setSpeed] = useState<Speed>(1);
  const timeRef = useRef(0);

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      // Cap a step at 0.1 s so a tab coming back from the background does not jump the swing.
      const dt = Math.min(0.1, (now - last) / 1000) * speed;
      last = now;
      timeRef.current += dt;
      setTime(timeRef.current);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, speed]);

  /** The bench time right now, without waiting for the next render. */
  const now = useCallback(() => timeRef.current, []);

  const reset = useCallback(() => {
    timeRef.current = 0;
    setTime(0);
  }, []);

  const nextSpeed = useCallback(
    () => setSpeed((s) => SPEEDS[(SPEEDS.indexOf(s) + 1) % SPEEDS.length]!),
    [],
  );

  return { time, now, playing, setPlaying, speed, nextSpeed, reset };
}
