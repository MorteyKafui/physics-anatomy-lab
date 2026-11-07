import {
  CORRECT_ASSEMBLY,
  type Assembly,
  type PendulumPart,
  type PendulumSlot,
} from "@pa/experiments";

/**
 * The simple pendulum on a retort stand, as drawn in the approved lab mockup (Fig. 1): an
 * isometric bench, the stand and clamp, the split cork, the thread, the bob, the mark at the
 * bottom of the swing, and a stopwatch on the bench. Colours are the figure tones in
 * packages/ui (--pa-figure-*); the bob is the one lit part.
 *
 * The figure draws a given state. It does no physics: the caller passes the bob's angle from
 * packages/experiments, so what moves is the model, not an animation. While the student builds,
 * only the parts on the bench are drawn, and the slots a part could go to are lit.
 */

export interface PendulumBenchProps {
  /** The bob's angle from the vertical, radians; positive is to the right. */
  angle: number;
  /** The stopwatch's reading, s, which turns its hand (one turn a minute). */
  stopwatchSeconds: number;
  /** Pivot to the centre of the bob, m. The drawing is to scale: 0.800 m is the mockup's thread. */
  length?: number;
  /** Which parts are on the bench, and where. Defaults to the finished set-up. */
  assembly?: Assembly;
  /** Slots to light: where the part being placed can go. */
  lit?: readonly PendulumSlot[];
  /** A count to show beside the mark, for the coach's demonstration. */
  markLabel?: string;
  /** Part of the drawing to show, in its own units; the magnifier uses it to zoom. */
  viewBox?: string;
  /** Accessible description of what the figure shows. Omit for a decorative copy. */
  label?: string;
  className?: string;
  /**
   * Letters to key parts by, as the WASSCE guide asks of a diagram ("A: retort stand"), for
   * labelled exports. Parts not on the bench are not lettered.
   */
  letters?: Partial<Record<PendulumPart, string>>;
  /** Draw the letters as numbered pins (black discs), as a print sheet keys its parts. */
  pins?: boolean;
}

// Geometry from the mockup's 420 × 460 drawing.
export const BENCH_VIEWBOX = { width: 420, height: 460 };
const CORK_PIVOT = { x: 300, y: 148 };
const ARM_TIE = { x: 258, y: 121 };
/** The mockup draws the 0.800 m thread 174 units long. */
const UNITS_PER_METRE = 174 / 0.8;
const THREAD = 174;
const BOB_R = 13;
const FLOOR_Y = 404;
const DIAL = { x: 110, y: 378 };
const ARC_R = 42;

const tone = (name: string) => `var(--pa-figure-${name})`;

/** Where the thread hangs from: the cork, or the clamp arm it was wrongly tied round. */
const pivotOf = (a: Assembly) => (a.thread === "clamp-arm" ? ARM_TIE : CORK_PIVOT);

/** The point each slot sits at in the drawing, for lighting it and snapping a dropped part. */
export function slotPoint(slot: PendulumSlot, a: Assembly = CORRECT_ASSEMBLY) {
  switch (slot) {
    case "bench":
      return { x: 215, y: 362 };
    case "base-socket":
      return { x: 205, y: 345 };
    case "rod":
      return { x: 205, y: 103 };
    case "clamp-jaw":
      return { x: 300, y: 141 };
    case "cork":
      return CORK_PIVOT;
    case "clamp-arm":
      return ARM_TIE;
    case "thread-end": {
      const p = pivotOf(a);
      return { x: p.x, y: p.y + THREAD };
    }
    case "bench-corner":
      return DIAL;
  }
}

/** How close, in drawing units, a dropped part must land to snap into a slot. */
export const SNAP_RADIUS = 48;

/** The nearest of the candidate slots within the snap radius of a point, if any. */
export function snapSlot(
  point: { x: number; y: number },
  candidates: readonly PendulumSlot[],
  a: Assembly,
  radius = SNAP_RADIUS,
): PendulumSlot | undefined {
  let best: PendulumSlot | undefined;
  let bestD = radius;
  for (const s of candidates) {
    const q = slotPoint(s, a);
    const d = Math.hypot(point.x - q.x, point.y - q.y);
    if (d <= bestD) {
      best = s;
      bestD = d;
    }
  }
  return best;
}

export function PendulumBench({
  angle,
  stopwatchSeconds,
  length = 0.8,
  assembly = CORRECT_ASSEMBLY,
  lit = [],
  markLabel,
  viewBox = `0 0 ${BENCH_VIEWBOX.width} ${BENCH_VIEWBOX.height}`,
  label,
  className,
  letters,
  pins = false,
}: PendulumBenchProps) {
  const a = assembly;
  const has = (p: keyof Assembly) => a[p] !== undefined;
  const pivot = pivotOf(a);
  const swing = has("bob") ? angle : 0;
  const thread = length * UNITS_PER_METRE;
  const bob = { x: pivot.x + thread * Math.sin(swing), y: pivot.y + thread * Math.cos(swing) };
  const rest = { x: pivot.x, y: pivot.y + thread };
  const arcEnd = { x: pivot.x + ARC_R * Math.sin(swing), y: pivot.y + ARC_R * Math.cos(swing) };
  const hand = (stopwatchSeconds / 60) * 2 * Math.PI;

  return (
    <svg
      viewBox={viewBox}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={className}
    >
      {/* Bench top with its grid */}
      <polygon
        points="210,300 400,380 210,460 20,380"
        fill={tone("floor")}
        stroke={tone("floor-edge")}
      />
      <g stroke={tone("floor-line")} strokeWidth={1}>
        <line x1={248} y1={316} x2={58} y2={396} />
        <line x1={286} y1={332} x2={96} y2={412} />
        <line x1={324} y1={348} x2={134} y2={428} />
        <line x1={362} y1={364} x2={172} y2={444} />
        <line x1={172} y1={316} x2={362} y2={396} />
        <line x1={134} y1={332} x2={324} y2={412} />
        <line x1={96} y1={348} x2={286} y2={428} />
        <line x1={58} y1={364} x2={248} y2={444} />
      </g>
      {has("base") && (
        <g data-part="base">
          <polygon
            points="200,340 260,365 230,378 170,353"
            fill={tone("base-top")}
            stroke={tone("base-edge")}
          />
          <polygon points="170,353 230,378 230,386 170,361" fill={tone("base-side")} />
          <polygon points="230,378 260,365 260,373 230,386" fill={tone("base-side-dark")} />
        </g>
      )}
      {has("rod") && (
        <g data-part="rod">
          <rect x={202} y={70} width={7} height={280} fill={tone("rod")} />
          <rect x={202} y={70} width={2} height={280} fill={tone("rod-light")} />
        </g>
      )}
      {has("clamp") && (
        <g data-part="clamp">
          <rect
            x={196}
            y={96}
            width={19}
            height={14}
            fill={tone("clamp")}
            stroke={tone("clamp-edge")}
          />
          <line
            x1={215}
            y1={103}
            x2={295}
            y2={136}
            stroke={tone("clamp-edge")}
            strokeWidth={6}
            strokeLinecap="round"
          />
        </g>
      )}
      {has("cork") && (
        <polygon
          data-part="cork"
          points="293,132 307,138 307,150 293,144"
          fill={tone("cork")}
          stroke={tone("cork-edge")}
        />
      )}
      {has("thread") && (
        <g data-part="thread">
          {/* The vertical through the pivot, and the mark at the bottom of the swing */}
          <line
            x1={pivot.x}
            y1={pivot.y + 2}
            x2={pivot.x}
            y2={pivot.y + thread + 14}
            stroke={tone("guide")}
            strokeDasharray="3 4"
          />
          <circle
            cx={rest.x}
            cy={rest.y}
            r={BOB_R}
            fill="none"
            stroke="var(--pa-accent-fill)"
            strokeOpacity={0.32}
          />
          {a.thread === "clamp-arm" && (
            <circle cx={pivot.x} cy={pivot.y} r={3} fill="none" stroke={tone("thread")} />
          )}
          <line
            x1={pivot.x}
            y1={pivot.y}
            x2={bob.x}
            y2={bob.y}
            stroke={tone("thread")}
            strokeWidth={1.3}
          />
        </g>
      )}
      {markLabel !== undefined && has("thread") && (
        <text
          x={rest.x - 22}
          y={rest.y + 5}
          textAnchor="end"
          fontSize={16}
          fontFamily="var(--font-mono)"
          fill="var(--pa-fg)"
        >
          {markLabel}
        </text>
      )}
      {has("bob") && (
        <g data-part="bob">
          <path
            d={`M${pivot.x},${pivot.y + ARC_R} A${ARC_R},${ARC_R} 0 0,${swing > 0 ? 0 : 1} ${arcEnd.x},${arcEnd.y}`}
            fill="none"
            stroke="var(--pa-topic-mechanics)"
            strokeWidth={1.5}
          />
          <circle cx={bob.x} cy={bob.y} r={BOB_R} fill="var(--pa-accent-fill)" />
          <circle cx={bob.x - 4} cy={bob.y - 5} r={4} fill={tone("bob-light")} />
          <ellipse cx={bob.x - 8} cy={FLOOR_Y} rx={16} ry={5} fill={tone("ink")} opacity={0.45} />
        </g>
      )}
      {has("watch") && (
        <g data-part="watch">
          <rect x={DIAL.x - 3} y={357} width={6} height={5} fill={tone("clamp")} />
          <circle cx={DIAL.x} cy={DIAL.y} r={17} fill={tone("dial-rim")} stroke={tone("clamp")} />
          <circle cx={DIAL.x} cy={DIAL.y} r={12} fill={tone("dial")} />
          <line
            x1={DIAL.x}
            y1={DIAL.y}
            x2={DIAL.x}
            y2={DIAL.y - 9}
            stroke={tone("ink")}
            strokeWidth={1.5}
          />
          <line
            x1={DIAL.x}
            y1={DIAL.y}
            x2={DIAL.x + 7 * Math.sin(hand)}
            y2={DIAL.y - 7 * Math.cos(hand)}
            stroke="var(--pa-accent-fill)"
            strokeWidth={1.5}
          />
        </g>
      )}
      {/* Letters keying the parts, beside each one */}
      {letters && (
        <g fontFamily="var(--font-mono)" fontSize={15} fill={tone("thread")}>
          {(Object.entries(letters) as [PendulumPart, string][])
            .filter(([part]) => a[part] !== undefined)
            .map(([part, letter]) => {
              const at = {
                base: { x: 268, y: 392 },
                rod: { x: 216, y: 230 },
                clamp: { x: 186, y: 92 },
                cork: { x: 314, y: 132 },
                thread: { x: pivot.x + 8, y: pivot.y + thread * 0.45 },
                bob: { x: bob.x + 18, y: bob.y + 5 },
                watch: { x: DIAL.x - 34, y: DIAL.y + 5 },
              }[part];
              return pins ? (
                <g key={part} data-letter={part}>
                  <circle cx={at.x + 4} cy={at.y - 5} r={10} fill={tone("ink")} />
                  <text
                    x={at.x + 4}
                    y={at.y - 0.5}
                    textAnchor="middle"
                    fontSize={12}
                    fontWeight={600}
                    fill={tone("dial")}
                  >
                    {letter}
                  </text>
                </g>
              ) : (
                <text key={part} x={at.x} y={at.y} data-letter={part}>
                  {letter}
                </text>
              );
            })}
        </g>
      )}
      {/* Where the part being placed can go */}
      {lit.map((s) => {
        const p = slotPoint(s, a);
        return (
          <circle
            key={s}
            data-bench-slot={s}
            cx={p.x}
            cy={p.y}
            r={16}
            fill="var(--pa-accent-fill)"
            fillOpacity={0.12}
            stroke="var(--pa-accent-fill)"
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />
        );
      })}
    </svg>
  );
}
