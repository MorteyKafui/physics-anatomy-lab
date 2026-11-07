"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export const SPEEDS = [1, 2, 0.5] as const;
export type Speed = (typeof SPEEDS)[number];

/**
 * The bench's own time, in seconds: it runs while playing, at the chosen speed, and stops when
 * paused. The stopwatch and the swing both run on it, so slowing the bench slows both together.
 * With reduced motion preferred, the bench starts paused.
 *
 * The time is not React state: each frame it reaches only the parts that show it (the bench, the
 * stopwatch, the count-along) through `subscribe`, so the rest of the lab is not drawn again 60
 * times a second (master plan, "Performance budgets": 30 fps on the benchmark phone).
 */
export function useBenchClock() {
  const [playing, setPlaying] = useState(
    () =>
      typeof window === "undefined" ||
      !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
  );
  const [speed, setSpeed] = useState<Speed>(1);
  const timeRef = useRef(0);
  const listeners = useRef(new Set<() => void>());
  const notify = useCallback(() => listeners.current.forEach((l) => l()), []);

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      // Cap a step at 0.1 s so a tab coming back from the background does not jump the swing.
      const dt = Math.min(0.1, (now - last) / 1000) * speed;
      last = now;
      timeRef.current += dt;
      notify();
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, speed, notify]);

  /** The bench time right now. */
  const now = useCallback(() => timeRef.current, []);

  /** Be told at every tick of the bench clock. */
  const subscribe = useCallback((listener: () => void) => {
    listeners.current.add(listener);
    return () => {
      listeners.current.delete(listener);
    };
  }, []);

  const reset = useCallback(() => {
    timeRef.current = 0;
    notify();
  }, [notify]);

  const nextSpeed = useCallback(
    () => setSpeed((s) => SPEEDS[(SPEEDS.indexOf(s) + 1) % SPEEDS.length]!),
    [],
  );

  return { now, subscribe, playing, setPlaying, speed, nextSpeed, reset };
}

export type BenchClock = ReturnType<typeof useBenchClock>;

/** The bench time, read in a component that redraws with it. */
export function useClockTime(clock: Pick<BenchClock, "now" | "subscribe">) {
  return useSyncExternalStore(clock.subscribe, clock.now, () => 0);
}

/** Draw something that moves with the bench clock, without drawing the rest again. */
export function Clocked({
  clock,
  children,
}: {
  clock: Pick<BenchClock, "now" | "subscribe">;
  children: (time: number) => ReactNode;
}) {
  return <>{children(useClockTime(clock))}</>;
}
