"use client";

import { t } from "@pa/i18n";
import "@pa/i18n/landing";
import { colour, topicHue } from "@pa/ui";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { landing, SCENES, sceneAria, sceneName } from "./scenes";
import { stillPage } from "./use-lite";

/**
 * It draws 30 times a second, not 60: a background needs no more, and a low-cost phone keeps the
 * time for the page. Each draw drops 140 particles (the board's 70 a frame at 60 fps); every
 * eighth draw dims the old ones, as much as the board's dimming of 0.4% a frame adds up to.
 */
const DRAW_MS = 1000 / 30;
const PER_DRAW = 140;
const DIM_EVERY = 8;
const DIM = 1 - Math.pow(1 - 0.004, 2 * DIM_EVERY);
/** The one finished pattern drawn when still. */
const FINISHED = 9000;
/** Draws spent fading the old pattern when the scene changes, and how much each fades. */
const FADE_DRAWS = 23;
const FADE = 1 - Math.pow(1 - 0.09, 2);

const rgba = (hex: string, a: number) =>
  `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${a})`;

/**
 * The hero, around its server-rendered text. Its background (design/mockups/Main.dc.html; landing page brief, decision 1): particles
 * land one at a time and build the pattern of the slits in front of them. It starts only after the
 * page has loaded and the browser is idle, pauses off screen and in a hidden tab, and in Lite mode
 * or with reduced motion draws one finished pattern and stops.
 */
export function HeroStage({ children }: { children: ReactNode }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [scene, setScene] = useState(0);
  const sceneRef = useRef(0);

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const g = el.getContext("2d");
    if (!g) return;
    const still = stillPage();
    let w = 0;
    let h = 0;
    let fade = 0;
    let raf = 0;
    let running = false;
    let visible = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const size = () => {
      const dpr = Math.min(1.5, window.devicePixelRatio || 1);
      w = el.clientWidth;
      h = el.clientHeight;
      el.width = Math.round(w * dpr);
      el.height = Math.round(h * dpr);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.fillStyle = colour.ink950;
      g.fillRect(0, 0, w, h);
    };

    const drop = (n: number) => {
      const s = SCENES[sceneRef.current]!;
      const hue = topicHue[s.topic];
      for (let k = 0; k < n; k++) {
        const x = w / 2 + landing(s) * w * 0.49;
        const y = Math.random() * (h - 8) + 4;
        g.fillStyle = Math.random() < 0.18 ? rgba(colour.text, 0.75) : rgba(hue, 0.95);
        g.fillRect(x - 1.2, y - 1.2, 2.4, 2.4);
      }
    };

    let last = 0;
    let draws = 0;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (now - last < DRAW_MS - 2) return;
      last = now;
      if (fade > 0) {
        g.fillStyle = rgba(colour.ink950, FADE);
        g.fillRect(0, 0, w, h);
        fade--;
        return;
      }
      if (++draws % DIM_EVERY === 0) {
        g.fillStyle = rgba(colour.ink950, DIM);
        g.fillRect(0, 0, w, h);
      }
      drop(PER_DRAW);
    };

    const sync = () => {
      const go = visible && document.visibilityState === "visible";
      if (go && !running) raf = requestAnimationFrame(frame);
      if (!go && running) cancelAnimationFrame(raf);
      running = go;
    };

    const nextScene = () => {
      let n = sceneRef.current;
      while (n === sceneRef.current) n = Math.floor(Math.random() * SCENES.length);
      sceneRef.current = n;
      setScene(n);
      fade = FADE_DRAWS;
      timer = setTimeout(nextScene, 9000 + Math.random() * 5000);
    };

    size();
    if (still) {
      drop(FINISHED);
      return;
    }

    const seen = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
      sync();
    });
    const resized = new ResizeObserver(() => {
      if (el.clientWidth !== w || el.clientHeight !== h) size();
    });
    let idle = 0;
    const begin = () => {
      const start = () => {
        seen.observe(el);
        resized.observe(el);
        document.addEventListener("visibilitychange", sync);
        sync();
        timer = setTimeout(nextScene, 10000);
      };
      const ric = window.requestIdleCallback as typeof window.requestIdleCallback | undefined;
      idle = ric ? ric(start, { timeout: 2000 }) : window.setTimeout(start, 200);
    };
    if (document.readyState === "complete") begin();
    else window.addEventListener("load", begin, { once: true });

    return () => {
      window.removeEventListener("load", begin);
      window.cancelIdleCallback?.(idle);
      clearTimeout(idle);
      clearTimeout(timer);
      cancelAnimationFrame(raf);
      seen.disconnect();
      resized.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  const s = SCENES[scene]!;
  return (
    <section
      id="top"
      aria-label={t("landing.hero.label")}
      className="relative flex min-h-[640px] items-center overflow-hidden bg-[var(--pa-ink-950)] md:min-h-[840px]"
    >
      <canvas
        ref={canvas}
        role="img"
        aria-label={t(sceneAria(s))}
        data-scene={s.id}
        width={1}
        height={1}
        className="absolute inset-0 block size-full [mask-image:linear-gradient(90deg,#000_0%,#000_20%,transparent_33%,transparent_67%,#000_80%,#000_100%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(13,13,13,0)_0%,rgba(13,13,13,.6)_22%,rgba(13,13,13,.97)_34%,rgba(13,13,13,.97)_66%,rgba(13,13,13,.6)_78%,rgba(13,13,13,0)_100%)]"
      />
      <div className="relative mx-auto box-border flex w-full max-w-[1080px] flex-col items-center gap-[26px] px-4 pb-[120px] pt-[140px] text-center sm:px-8">
        <span className="inline-flex items-center gap-2.5 border border-[var(--pa-dash-chip-grey-line)] bg-[rgba(13,13,13,.85)] px-3 py-[7px] text-sm text-[var(--pa-text-soft)]">
          <span
            className="pa-pulse size-2 shrink-0 rounded-full"
            style={{ background: `var(--pa-topic-${s.topic})` }}
          />
          <span>{t("landing.hero.behind", { scene: t(sceneName(s)) })}</span>
        </span>
        {children}
      </div>
    </section>
  );
}
