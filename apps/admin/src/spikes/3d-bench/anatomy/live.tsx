"use client";

import { useEffect, useRef, useState } from "react";
import { TURN } from "../../anatomy-kit/turn.mjs";
import { prefersStill, swingDegrees, TURN_PER_KEY, TURN_PER_PX } from "../swing";
import "../../anatomy-kit/iso.css";
import "./tones.css";

interface Controller {
  set(values: Record<string, number>): unknown;
  destroy(): void;
}

/**
 * The live Anatomy figure. The server sends the stage (the rest pose, already drawn) and the
 * runtime data; this mounts the kit's runtime on it and owns the loop, as the kit asks: each
 * frame it sets the bench's turn and the swing, and the runtime re-projects and re-shades the
 * parts and solves their painting order.
 */
export function AnatomyLive({ stage, data, css }: { stage: string; data: unknown; css: string }) {
  const host = useRef<HTMLDivElement>(null);
  const turn = useRef(0);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const el = host.current?.querySelector<HTMLElement>(".iso-stage");
    if (!el) return;
    const controller = (TURN.mount as (s: HTMLElement, d: unknown, o: object) => Controller)(
      el,
      data,
      {},
    );
    const still = prefersStill();
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = (now - start) / 1000;
      controller.set({ bench: turn.current, swing: still ? 0 : swingDegrees(t) });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      controller.destroy();
    };
  }, [data]);

  const turnBy = (deg: number) => {
    turn.current = (((turn.current + deg) % 360) + 360) % 360;
    setShown(Math.round(turn.current));
  };

  return (
    <div
      ref={host}
      className="pa-turn iso touch-none select-none outline-none focus-visible:ring-2 focus-visible:ring-ring"
      tabIndex={0}
      role="slider"
      aria-label="Turn the bench"
      aria-valuemin={0}
      aria-valuemax={359}
      aria-valuenow={shown}
      aria-valuetext={`Bench turned ${shown}°`}
      data-turn={shown}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") turnBy(-TURN_PER_KEY);
        else if (e.key === "ArrowRight") turnBy(TURN_PER_KEY);
        else return;
        e.preventDefault();
      }}
      onPointerDown={(e) => {
        const target = e.currentTarget;
        target.setPointerCapture(e.pointerId);
        let x = e.clientX;
        const move = (m: PointerEvent) => {
          turnBy((m.clientX - x) * TURN_PER_PX);
          x = m.clientX;
        };
        const up = () => {
          target.removeEventListener("pointermove", move);
          target.removeEventListener("pointerup", up);
        };
        target.addEventListener("pointermove", move);
        target.addEventListener("pointerup", up);
      }}
    >
      <style>{css}</style>
      {/* No static layer gives the stage its size here (every part turns), so it takes the
          drawing's own proportions. */}
      <div
        className="iso-stage iso-turn relative aspect-[420/460] w-full"
        dangerouslySetInnerHTML={{ __html: stage }}
      />
    </div>
  );
}
