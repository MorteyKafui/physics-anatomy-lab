"use client";

import {
  BENCH_VIEWBOX,
  Magnifier,
  PendulumBench,
  slotPoint,
  type PendulumBenchProps,
} from "@pa/apparatus";
import {
  PENDULUM_PARTS,
  readySlots,
  waitsFor,
  type Assembly,
  type PendulumPart,
  type PendulumSlot,
} from "@pa/experiments";
import { t, type MessageKey } from "@pa/i18n";
import { cn } from "@pa/ui";
import { Button } from "@pa/ui/components/button";
import { CheckIcon } from "@pa/ui/icons";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";

const P = "experiments.simple-pendulum";
export const partName = (p: PendulumPart) => t(`${P}.parts.${p}.name` as MessageKey);
export const partThe = (p: PendulumPart) => t(`${P}.parts.${p}.the` as MessageKey);
export const slotPhrase = (s: PendulumSlot) => t(`${P}.slots.${s}` as MessageKey);

/** "the base plate, the rod and the bob" */
export function listParts(parts: readonly PendulumPart[]): string {
  const names = parts.map(partThe);
  if (names.length < 2) return names.join("");
  return `${names.slice(0, -1).join(", ")} ${t("lab.build.and")} ${names.at(-1)}`;
}

/** What the bench holds, for screen readers (master plan: a text description of the bench). */
export function benchDescription(a: Assembly): string {
  const on = PENDULUM_PARTS.filter((p) => a[p] !== undefined);
  return on.length ? t("lab.build.benchState", { list: listParts(on) }) : t("lab.build.benchEmpty");
}

/** A part being dragged from the tray, at a point on the screen. */
export interface Drag {
  part: PendulumPart;
  x: number;
  y: number;
  moved: boolean;
}

/**
 * Drag from the tray to the bench with any pointer. A press that does not move is left to the
 * button's click, so tapping a part and then a slot works the same as dragging it.
 */
export function useDragPart(onDrop: (part: PendulumPart, x: number, y: number) => void) {
  const [drag, setDrag] = useState<Drag>();
  const suppressClick = useRef(false);

  const start = useCallback(
    (part: PendulumPart, e: ReactPointerEvent) => {
      if (e.button !== 0) return;
      const origin = { x: e.clientX, y: e.clientY };
      let current: Drag = { part, ...origin, moved: false };
      const move = (ev: PointerEvent) => {
        const moved = current.moved || Math.hypot(ev.clientX - origin.x, ev.clientY - origin.y) > 6;
        current = { part, x: ev.clientX, y: ev.clientY, moved };
        if (moved) setDrag(current);
      };
      const up = (ev: PointerEvent) => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", up);
        setDrag(undefined);
        if (current.moved && ev.type === "pointerup") {
          // The browser may follow a drag with a click on the part; ignore that one only.
          suppressClick.current = true;
          setTimeout(() => (suppressClick.current = false), 0);
          onDrop(part, ev.clientX, ev.clientY);
        }
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", up);
    },
    [onDrop],
  );

  /** True once, for the click that ends a drag. */
  const takeSuppressedClick = () => {
    const was = suppressClick.current;
    suppressClick.current = false;
    return was;
  };

  return { drag, start, takeSuppressedClick };
}

export function DragGhost({ drag }: { drag: Drag | undefined }) {
  if (!drag?.moved) return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2 border border-primary bg-raised px-3 py-2 text-sm font-medium shadow-lg"
      style={{ left: drag.x, top: drag.y }}
    >
      {partName(drag.part)}
    </div>
  );
}

/** Where a point on the screen falls in the bench drawing's units. */
export function toFigure(box: HTMLElement, x: number, y: number) {
  const r = box.getBoundingClientRect();
  return {
    x: ((x - r.left) / r.width) * BENCH_VIEWBOX.width,
    y: ((y - r.top) / r.height) * BENCH_VIEWBOX.height,
  };
}

const pct = (v: number, of: number) => `${(v / of) * 100}%`;

/**
 * The bench with what the student has built, the slots the held part can go to (as buttons, so
 * a keyboard or a tap can place it), and the magnifier.
 */
export function BenchStage({
  box,
  bench,
  slots,
  held,
  onPlace,
  magnifier,
  onMagnifier,
  className,
}: {
  box: RefObject<HTMLDivElement | null>;
  bench: PendulumBenchProps;
  /** Slot buttons to show: where the held part can go. */
  slots: readonly PendulumSlot[];
  held: PendulumPart | undefined;
  onPlace: (slot: PendulumSlot) => void;
  magnifier: { x: number; y: number } | undefined;
  onMagnifier: (at: { x: number; y: number }) => void;
  className?: string;
}) {
  const firstSlot = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (held) firstSlot.current?.focus();
  }, [held]);

  const onKey = (e: ReactKeyboardEvent) => {
    if (!magnifier) return;
    const step = 10;
    const d = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    }[e.key];
    if (!d) return;
    e.preventDefault();
    onMagnifier({
      x: Math.min(BENCH_VIEWBOX.width, Math.max(0, magnifier.x + d[0]!)),
      y: Math.min(BENCH_VIEWBOX.height, Math.max(0, magnifier.y + d[1]!)),
    });
  };

  return (
    <div
      ref={box}
      className={cn("relative w-full max-w-[600px] outline-offset-4", className)}
      tabIndex={magnifier ? 0 : undefined}
      role={magnifier ? "group" : undefined}
      aria-label={magnifier ? t("lab.magnifier.on") : undefined}
      onKeyDown={onKey}
      onPointerMove={(e) => {
        if (magnifier && box.current) onMagnifier(toFigure(box.current, e.clientX, e.clientY));
      }}
    >
      <PendulumBench {...bench} className="block h-auto w-full" />
      {held &&
        slots.map((s, i) => {
          const p = slotPoint(s, bench.assembly);
          return (
            <button
              key={s}
              ref={i === 0 ? firstSlot : undefined}
              type="button"
              data-bench-slot={s}
              aria-label={t("lab.build.place", { part: partThe(held), slot: slotPhrase(s) })}
              className="absolute size-11 -translate-x-1/2 -translate-y-1/2 focus-visible:outline-2 focus-visible:outline-ring"
              style={{
                left: pct(p.x, BENCH_VIEWBOX.width),
                top: pct(p.y, BENCH_VIEWBOX.height),
              }}
              onClick={() => onPlace(s)}
            />
          );
        })}
      {magnifier && (
        <Magnifier at={magnifier} figure={BENCH_VIEWBOX}>
          {(viewBox) => (
            <PendulumBench {...bench} label={undefined} viewBox={viewBox} className="size-full" />
          )}
        </Magnifier>
      )}
    </div>
  );
}

/** The parts tray: every part, what it does, and whether it is on the bench. */
export function PartsTray({
  assembly,
  held,
  lit,
  locked,
  status,
  whatParams,
  onPick,
  onPointerDown,
  onRemove,
}: {
  assembly: Assembly;
  held: PendulumPart | undefined;
  /** The part to touch next, gently lit (master plan, "Centre: the bench"). */
  lit: PendulumPart | undefined;
  locked: boolean;
  status: string | undefined;
  whatParams: Record<string, string | number>;
  onPick: (part: PendulumPart) => void;
  onPointerDown: (part: PendulumPart, e: ReactPointerEvent) => void;
  onRemove: (part: PendulumPart) => void;
}) {
  return (
    <section
      aria-label={t("lab.build.tray")}
      className="flex w-full max-w-[1040px] flex-col gap-2.5 border border-border bg-surface p-3"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="font-semibold">{t("lab.build.tray")}</h2>
        <p className="text-xs text-muted-foreground">{t("lab.build.trayHint")}</p>
      </div>
      <ul className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-7">
        {PENDULUM_PARTS.map((part) => {
          const placed = assembly[part] !== undefined;
          const needs = waitsFor(assembly, part);
          return (
            <li
              key={part}
              data-part={part}
              className={cn(
                "flex min-h-16 border bg-background",
                part === lit && !placed ? "border-primary" : "border-border",
                held === part && "border-primary bg-accent-wash",
              )}
            >
              {placed ? (
                <div className="flex flex-1 flex-col justify-between gap-0.5 py-2 pl-2.5">
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    <CheckIcon className="size-3.5 text-ok" aria-hidden />
                    {partName(part)}
                  </span>
                  <span className="text-xs text-muted-foreground">{t("lab.build.onBench")}</span>
                  <span>
                    {!locked && (
                      <Button
                        variant="link"
                        size="xs"
                        className="-my-2.5 -ml-2.5 h-11 px-2.5"
                        aria-label={t("lab.build.takeOffPart", { part: partThe(part) })}
                        onClick={() => onRemove(part)}
                      >
                        {t("lab.build.takeOff")}
                      </Button>
                    )}
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={locked}
                  aria-pressed={held === part}
                  aria-describedby={`what-${part}`}
                  className="flex flex-1 touch-none flex-col justify-between gap-0.5 px-2.5 py-2 text-left focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60"
                  onPointerDown={(e) => !locked && onPointerDown(part, e)}
                  onClick={() => onPick(part)}
                >
                  <span className="text-sm font-medium">{partName(part)}</span>
                  <span className="text-xs text-muted-foreground">
                    {needs ? t("lab.build.waitsFor", { part: partThe(needs) }) : " "}
                  </span>
                </button>
              )}
              {!placed && (
                <span id={`what-${part}`} className="sr-only">
                  {t(`${P}.parts.${part}.what` as MessageKey, whatParams)}
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <p role="status" className="min-h-5 text-sm text-soft">
        {status}
      </p>
    </section>
  );
}

/** Slots a part can go to now. */
export const slotsFor = (a: Assembly, part: PendulumPart | undefined) =>
  part ? readySlots(a, part) : [];
