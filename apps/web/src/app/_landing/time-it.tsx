"use client";

import { bobAngle, simplePendulum } from "@pa/experiments";
import { t } from "@pa/i18n";
import "@pa/i18n/landing";
import { gFromPeriod, periodExact, recordedPeriod } from "@pa/physics";
import { colour } from "@pa/ui";
import { useEffect, useRef, useState } from "react";

import { stillPage } from "./use-lite";

/** The lab's room: the accepted g the visitor's value is compared with. */
const G = 9.81;
const L = simplePendulum.length;
const SWINGS = simplePendulum.swings;
/** The first precaution in the lab: keep the swing below about 10°. */
const SMALL_SWING_DEG = 10;
/** Furthest the bob can be pulled, radians (60°). */
const MAX_PULL = 1.05;
/** Arrow keys move the bob by this much, radians (1°). */
const KEY_STEP = Math.PI / 180;

const CANVAS_HEIGHT = 300;
const PIVOT_Y = 28;
const THREAD_PX = 220;

export interface Reading {
  /** Largest angle of the swing, whole degrees. */
  swingDeg: number;
  /** The period the visitor's count gives, s. */
  period: number;
  /** g from that period and the 0.800 m length. */
  g: number;
}

/**
 * What the visitor reads off (landing page brief, decision 4): the exact period of this swing from
 * packages/physics, what counting from zero or from one makes of it over the lab's 20 swings, and
 * the g that period gives. Nothing here is typed in.
 */
export function reading(amplitude: number, countFrom: 0 | 1): Reading {
  const exact = periodExact({ length: L, g: G, amplitude: Math.max(amplitude, 1e-6) });
  const period = recordedPeriod(exact, SWINGS, countFrom);
  return { swingDeg: Math.round((amplitude * 180) / Math.PI), period, g: gFromPeriod(L, period) };
}

/** The coach's line for a reading, as the lab would say it. */
export function coachLine(r: Reading, countFrom: 0 | 1): { text: string; good: boolean } {
  if (countFrom === 1) {
    const right = reading((r.swingDeg * Math.PI) / 180, 0);
    const percent = Math.round((r.g / right.g - 1) * 100);
    return {
      text: t("landing.timeIt.coach.fromOne", { timed: SWINGS - 1, swings: SWINGS, percent }),
      good: false,
    };
  }
  if (r.swingDeg > SMALL_SWING_DEG)
    return {
      text: t("landing.timeIt.coach.wide", { deg: r.swingDeg, limit: SMALL_SWING_DEG }),
      good: false,
    };
  const off = Math.max(0.1, (Math.abs(r.g - G) / G) * 100);
  return { text: t("landing.timeIt.coach.good", { percent: off.toFixed(1) }), good: true };
}

/**
 * "Time it yourself" (Main.dc.html): a pendulum the visitor pulls aside and lets go, by pointer or
 * by keyboard. It swings with the exact period from packages/physics and the lab's own motion
 * (bobAngle). Off screen it stops; in Lite mode or with reduced motion it hangs still until the
 * visitor lets it go.
 */
export function TimeIt() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [amplitude, setAmplitude] = useState((simplePendulum.amplitudeDeg * Math.PI) / 180);
  const [countFrom, setCountFrom] = useState<0 | 1>(0);
  const wake = useRef<() => void>(() => {});
  const state = useRef({
    angle: (simplePendulum.amplitudeDeg * Math.PI) / 180,
    amplitude: (simplePendulum.amplitudeDeg * Math.PI) / 180,
    /** +1 when let go on the right, -1 on the left. */
    side: 1,
    releasedAt: 0,
    held: false,
    swinging: false,
  });

  useEffect(() => {
    const el = canvas.current;
    const g = el?.getContext("2d");
    if (!el || !g) return;
    const s = state.current;
    let raf = 0;
    let visible = false;
    let w = 0;

    const draw = () => {
      const dpr = Math.min(1.5, window.devicePixelRatio || 1);
      if (el.clientWidth !== w) {
        w = el.clientWidth;
        el.width = Math.round(w * dpr);
        el.height = Math.round(CANVAS_HEIGHT * dpr);
      }
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, w, CANVAS_HEIGHT);
      g.strokeStyle = colour.ink800;
      g.lineWidth = 1;
      for (let x = 0; x < w; x += 20) {
        g.beginPath();
        g.moveTo(x, 0);
        g.lineTo(x, CANVAS_HEIGHT);
        g.stroke();
      }
      const px = w / 2;
      const bx = px + THREAD_PX * Math.sin(s.angle);
      const by = PIVOT_Y + THREAD_PX * Math.cos(s.angle);
      g.fillStyle = colour.lineStrong;
      g.fillRect(px - 40, PIVOT_Y - 8, 80, 8);
      g.strokeStyle = colour.textSoft;
      g.lineWidth = 1.4;
      g.beginPath();
      g.moveTo(px, PIVOT_Y);
      g.lineTo(bx, by);
      g.stroke();
      g.fillStyle = colour.accent;
      g.beginPath();
      g.arc(bx, by, 14, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = colour.accentSoft;
      g.beginPath();
      g.arc(bx - 4, by - 4, 4, 0, Math.PI * 2);
      g.fill();
    };

    const frame = (now: number) => {
      if (s.swinging && !s.held) {
        const period = periodExact({ length: L, g: G, amplitude: s.amplitude });
        const deg = (s.amplitude * 180) / Math.PI;
        // bobAngle starts at the far left; a bob let go on the right starts mirrored.
        s.angle = -s.side * bobAngle((now - s.releasedAt) / 1000, period, deg);
      }
      draw();
      // Only a swinging bob needs the next frame; a held or still one is drawn when it moves.
      raf = visible && s.swinging && !s.held ? requestAnimationFrame(frame) : 0;
    };

    const kick = () => {
      if (visible && !raf) raf = requestAnimationFrame(frame);
    };
    wake.current = kick;

    s.swinging = !stillPage();
    s.releasedAt = performance.now();
    draw();
    const seen = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? false;
      if (visible) kick();
    });
    seen.observe(el);
    return () => {
      seen.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  const kick = () => wake.current();

  const hold = (angle: number) => {
    const s = state.current;
    s.held = true;
    s.angle = Math.max(-MAX_PULL, Math.min(MAX_PULL, angle));
    kick();
  };
  const letGo = () => {
    const s = state.current;
    if (!s.held) return;
    s.held = false;
    s.amplitude = Math.max(Math.abs(s.angle), 1e-3);
    s.side = s.angle >= 0 ? 1 : -1;
    s.releasedAt = performance.now();
    s.swinging = true;
    setAmplitude(s.amplitude);
    kick();
  };
  const angleAt = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return Math.atan2(e.clientX - r.left - r.width / 2, e.clientY - r.top - PIVOT_Y);
  };

  const r = reading(amplitude, countFrom);
  const coach = coachLine(r, countFrom);
  const pill = (on: boolean) =>
    `px-3.5 py-1.5 text-sm font-medium ${on ? "bg-[var(--pa-text)] text-[var(--pa-ink-950)]" : "bg-transparent text-[var(--pa-text-soft)]"} focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[var(--pa-accent)]`;

  return (
    <figure className="m-0 flex min-w-0 max-w-[460px] flex-[1_1_380px] flex-col overflow-hidden border border-[var(--pa-dash-chip-grey-line)] bg-[var(--pa-ink-850)]">
      <div className="flex items-center justify-between border-b border-[var(--pa-line)] px-4 py-3 text-[13px] text-[var(--pa-text-muted)]">
        <span>{t("landing.timeIt.figure")}</span>
        <span className="font-mono">l = {L.toFixed(3)} m</span>
      </div>
      <canvas
        ref={canvas}
        tabIndex={0}
        role="slider"
        aria-label={t("landing.timeIt.canvas")}
        aria-valuemin={-60}
        aria-valuemax={60}
        aria-valuenow={r.swingDeg}
        aria-valuetext={t("landing.timeIt.valueText", { deg: r.swingDeg })}
        width={460}
        height={CANVAS_HEIGHT}
        className="block h-[300px] w-full cursor-grab touch-none focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--pa-accent)]"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          hold(angleAt(e));
        }}
        onPointerMove={(e) => state.current.held && hold(angleAt(e))}
        onPointerUp={letGo}
        onPointerCancel={letGo}
        onKeyDown={(e) => {
          const s = state.current;
          if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
            e.preventDefault();
            const from = s.held ? s.angle : s.side * s.amplitude;
            hold(from + (e.key === "ArrowRight" ? KEY_STEP : -KEY_STEP));
          } else if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            letGo();
          }
        }}
      />
      <div className="grid grid-cols-3 border-t border-[var(--pa-line)]">
        <Readout label={t("landing.timeIt.swing")} value={`${r.swingDeg}°`} />
        <Readout label={t("landing.timeIt.period")} value={`${r.period.toFixed(3)} s`} border />
        <Readout
          label={t("landing.timeIt.g")}
          value={r.g.toFixed(2)}
          border
          tone={coach.good ? "var(--pa-dash-chip-green-fg)" : "var(--pa-dash-chip-amber-fg)"}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2.5 border-t border-[var(--pa-line)] px-4 py-3 text-sm">
        <span id="count-from" className="text-[var(--pa-text-muted)]">
          {t("landing.timeIt.countFrom")}
        </span>
        <div
          role="group"
          aria-labelledby="count-from"
          className="inline-flex overflow-hidden border border-[var(--pa-line-strong)]"
        >
          <button
            type="button"
            aria-pressed={countFrom === 0}
            onClick={() => setCountFrom(0)}
            className={pill(countFrom === 0)}
          >
            {t("landing.timeIt.zero")}
          </button>
          <button
            type="button"
            aria-pressed={countFrom === 1}
            onClick={() => setCountFrom(1)}
            className={pill(countFrom === 1)}
          >
            {t("landing.timeIt.one")}
          </button>
        </div>
      </div>
      <p
        role="status"
        data-coach={coach.good ? "good" : "warn"}
        className={`m-0 border-t border-[var(--pa-line)] px-4 py-3.5 text-sm leading-[1.45] ${
          coach.good
            ? "bg-[var(--pa-dash-chip-green-bg)] text-[var(--pa-dash-chip-green-fg)]"
            : "bg-[var(--pa-dash-chip-amber-bg)] text-[var(--pa-dash-chip-amber-fg)]"
        }`}
      >
        <b className="font-semibold">{t("landing.timeIt.coach")} </b>
        {coach.text}
      </p>
    </figure>
  );
}

function Readout({
  label,
  value,
  border,
  tone,
}: {
  label: string;
  value: string;
  border?: boolean;
  tone?: string;
}) {
  return (
    <div
      className={`flex flex-col px-3.5 py-2.5 ${border ? "border-l border-[var(--pa-line)]" : ""}`}
    >
      <span className="text-xs text-[var(--pa-text-muted)]">{label}</span>
      <span className="font-mono text-xl" style={tone ? { color: tone } : undefined}>
        {value}
      </span>
    </div>
  );
}
