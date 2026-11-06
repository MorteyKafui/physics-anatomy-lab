/**
 * The simple pendulum on a retort stand, as drawn in the approved lab mockup (Fig. 1): an
 * isometric bench, the stand and clamp, the split cork, the thread, the bob, the mark at the
 * bottom of the swing, and a stopwatch on the bench. Colours are the figure tones in
 * packages/ui (--pa-figure-*); the bob is the one lit part.
 *
 * The figure draws a given state. It does no physics: the caller passes the bob's angle from
 * packages/experiments, so what moves is the model, not an animation.
 */

export interface PendulumBenchProps {
  /** The bob's angle from the vertical, radians; positive is to the right. */
  angle: number;
  /** The stopwatch's reading, s, which turns its hand (one turn a minute). */
  stopwatchSeconds: number;
  /** A count to show beside the mark, for the coach's demonstration. */
  markLabel?: string;
  /** Accessible description of what the figure shows. */
  label: string;
  className?: string;
}

// Geometry from the mockup's 420 × 460 drawing.
const PIVOT = { x: 300, y: 148 };
const THREAD = 174;
const BOB_R = 13;
const FLOOR_Y = 404;
const DIAL = { x: 110, y: 378 };
const ARC_R = 42;

const tone = (name: string) => `var(--pa-figure-${name})`;

export function PendulumBench({
  angle,
  stopwatchSeconds,
  markLabel,
  label,
  className,
}: PendulumBenchProps) {
  const bob = { x: PIVOT.x + THREAD * Math.sin(angle), y: PIVOT.y + THREAD * Math.cos(angle) };
  const rest = { x: PIVOT.x, y: PIVOT.y + THREAD };
  const arcEnd = { x: PIVOT.x + ARC_R * Math.sin(angle), y: PIVOT.y + ARC_R * Math.cos(angle) };
  const hand = (stopwatchSeconds / 60) * 2 * Math.PI;

  return (
    <svg viewBox="0 0 420 460" role="img" aria-label={label} className={className}>
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
      {/* Base of the retort stand */}
      <polygon
        points="200,340 260,365 230,378 170,353"
        fill={tone("base-top")}
        stroke={tone("base-edge")}
      />
      <polygon points="170,353 230,378 230,386 170,361" fill={tone("base-side")} />
      <polygon points="230,378 260,365 260,373 230,386" fill={tone("base-side-dark")} />
      {/* Rod, boss and clamp arm */}
      <rect x={202} y={70} width={7} height={280} fill={tone("rod")} />
      <rect x={202} y={70} width={2} height={280} fill={tone("rod-light")} />
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
      {/* Split cork */}
      <polygon
        points="293,132 307,138 307,150 293,144"
        fill={tone("cork")}
        stroke={tone("cork-edge")}
      />
      {/* The vertical through the pivot, and the mark at the bottom of the swing */}
      <line
        x1={PIVOT.x}
        y1={150}
        x2={PIVOT.x}
        y2={336}
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
      {markLabel !== undefined && (
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
      {/* Thread, angle arc and bob */}
      <line
        x1={PIVOT.x}
        y1={PIVOT.y}
        x2={bob.x}
        y2={bob.y}
        stroke={tone("thread")}
        strokeWidth={1.3}
      />
      <path
        d={`M${PIVOT.x},${PIVOT.y + ARC_R} A${ARC_R},${ARC_R} 0 0,${angle > 0 ? 0 : 1} ${arcEnd.x},${arcEnd.y}`}
        fill="none"
        stroke="var(--pa-topic-mechanics)"
        strokeWidth={1.5}
      />
      <circle cx={bob.x} cy={bob.y} r={BOB_R} fill="var(--pa-accent-fill)" />
      <circle cx={bob.x - 4} cy={bob.y - 5} r={4} fill={tone("bob-light")} />
      <ellipse cx={bob.x - 8} cy={FLOOR_Y} rx={16} ry={5} fill={tone("ink")} opacity={0.45} />
      {/* Stopwatch on the bench */}
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
    </svg>
  );
}
