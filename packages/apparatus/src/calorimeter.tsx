import { useId } from "react";

/**
 * The method of mixtures, as drawn on the approved board ("The method of mixtures: reading the
 * highest temperature"): the copper calorimeter in its lagging, the lid, the stirrer and the
 * thermometer through it, and the beaker the hot water is poured from. Colours are the figure
 * tones in packages/ui.
 *
 * The figure draws a given state and does no physics: the caller passes the volumes, the
 * thermometer's reading and how much of the poured water still lies on top, all from the heat
 * model (packages/experiments).
 */

/** The drawing's own units. */
export const CALORIMETER_VIEWBOX = { width: 600, height: 300 };

const tone = (name: string) => `var(--pa-figure-${name})`;

/** The calorimeter's floor and inside width; 1 px of height to 0.7 cm³ of water. */
const CAN = { x: 180, y: 110, w: 140, h: 130, floor: 240 };
const PX_PER_CM3 = 1 / 0.7;
/** The thermometer's stem: 20 °C just above the bulb, 3.3 px to a degree. */
const STEM = { x: 218, top: 22, bulb: 222, zero: 214, perDegree: 3.3 };
/** The beaker, and 1 px of height to 0.8 cm³ in it. */
const BEAKER = { x: 420, w: 66, top: 170, floor: 248 };

export interface CalorimeterProps {
  /** The water in the calorimeter and in the beaker, cm³; 0 when empty. */
  calorimeterWater: number;
  beakerWater: number;
  /** The lid on, and the student stirring. */
  covered: boolean;
  stirring: boolean;
  /** What the thermometer shows, °C. */
  thermometer: number;
  /**
   * How much of the poured water still lies on top, unmixed, from 0 (mixed) to 1 (just poured):
   * the hot and cold water's difference now over their difference at the pour.
   */
  layered: number;
  /** Accessible description; omit for a decorative copy. */
  label?: string;
  className?: string;
}

export function Calorimeter({
  calorimeterWater,
  beakerWater,
  covered,
  stirring,
  thermometer,
  layered,
  label,
  className,
}: CalorimeterProps) {
  const id = useId();
  const felt = `${id}-felt`;
  const layers = `${id}-layers`;
  const height = Math.min(CAN.h - 4, calorimeterWater * PX_PER_CM3);
  const top = CAN.floor - height;
  const mercury = Math.max(
    STEM.top + 2,
    Math.min(STEM.bulb, STEM.zero - (thermometer - 20) * STEM.perDegree),
  );
  const beakerHeight = Math.min(BEAKER.floor - BEAKER.top - 4, beakerWater / 0.8);
  // The hot layer thins as it mixes: from the top 40% of the water to nothing.
  const hot = Math.max(0, Math.min(1, layered));
  return (
    <svg
      viewBox={`0 0 ${CALORIMETER_VIEWBOX.width} ${CALORIMETER_VIEWBOX.height}`}
      className={className}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <defs>
        <pattern
          id={felt}
          width="6"
          height="6"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect width="6" height="6" fill={tone("felt")} />
          <line x1="0" y1="0" x2="0" y2="6" stroke={tone("felt-line")} strokeWidth="2" />
        </pattern>
        <linearGradient id={layers} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={tone("hot-water")} stopOpacity={0.35 + 0.2 * hot} />
          <stop offset={0.4 * hot} stopColor={tone("hot-water")} stopOpacity={0.4 * hot} />
          <stop
            offset={Math.min(1, 0.4 * hot + 0.12)}
            stopColor={tone("water")}
            stopOpacity="0.35"
          />
          <stop offset="1" stopColor={tone("water")} stopOpacity="0.35" />
        </linearGradient>
      </defs>

      <polygon
        points="30,250 570,250 600,290 0,290"
        fill={tone("floor")}
        stroke={tone("floor-edge")}
      />

      <g data-part="jacket">
        <rect
          x="150"
          y="96"
          width="200"
          height="154"
          fill={`url(#${felt})`}
          stroke={tone("base-edge")}
        />
      </g>

      <g data-part="calorimeter">
        <rect
          x={CAN.x}
          y={CAN.y}
          width={CAN.w}
          height={CAN.h}
          fill={tone("ink")}
          stroke={tone("copper")}
          strokeWidth="3"
        />
        {height > 0 && (
          <>
            <rect
              x={CAN.x + 2}
              y={top}
              width={CAN.w - 4}
              height={height}
              fill={hot > 0.02 ? `url(#${layers})` : tone("water")}
              fillOpacity={hot > 0.02 ? 1 : 0.35}
            />
            <line
              x1={CAN.x + 2}
              y1={top}
              x2={CAN.x + CAN.w - 2}
              y2={top}
              stroke={tone("glass-edge")}
              strokeOpacity="0.6"
            />
          </>
        )}
      </g>

      {covered && (
        <g data-part="lid">
          <rect x="174" y="100" width="152" height="8" fill={tone("base-edge")} />
        </g>
      )}

      <g data-part="stirrer" transform={stirring ? "translate(0,-6)" : undefined}>
        <line x1="286" y1="40" x2="286" y2="226" stroke={tone("rod-light")} strokeWidth="2" />
        <rect
          x="196"
          y="224"
          width="108"
          height="5"
          fill="none"
          stroke={tone("rod-light")}
          strokeWidth="2"
        />
        <rect x="278" y="34" width="16" height="8" fill={tone("clamp-edge")} />
      </g>

      <g data-part="thermometer">
        <rect
          x={STEM.x}
          y={STEM.top}
          width="12"
          height="196"
          fill={tone("ink")}
          stroke={tone("rod")}
        />
        <circle cx={STEM.x + 6} cy={STEM.bulb} r="8" fill={tone("mercury")} />
        <rect
          x={STEM.x + 3}
          y={mercury}
          width="6"
          height={STEM.bulb - mercury}
          fill={tone("mercury")}
        />
      </g>

      <g data-part="beaker">
        {beakerHeight > 0 && (
          <rect
            x={BEAKER.x + 1}
            y={BEAKER.floor - beakerHeight}
            width={BEAKER.w - 2}
            height={beakerHeight}
            fill={tone("hot-water")}
            fillOpacity="0.35"
          />
        )}
        <path
          d={`M${BEAKER.x},${BEAKER.top} L${BEAKER.x},${BEAKER.floor} L${BEAKER.x + BEAKER.w},${BEAKER.floor} L${BEAKER.x + BEAKER.w},${BEAKER.top}`}
          fill="none"
          stroke={tone("glass-edge")}
          strokeWidth="1.5"
        />
        <path
          d={`M${BEAKER.x - 6},${BEAKER.top} L${BEAKER.x},${BEAKER.top}`}
          stroke={tone("glass-edge")}
          strokeWidth="1.5"
        />
      </g>
    </svg>
  );
}

/** The trace's own units. */
export const TRACE_VIEWBOX = { x: 0, y: -12, width: 300, height: 162 };

export interface ThermometerTraceProps {
  /** What the thermometer showed, s after the pour and °C, as far as the student has seen. */
  points: readonly { t: number; reading: number }[];
  /** Accessible description; omit for a decorative copy. */
  label?: string;
  className?: string;
  /** The axes' words, from the caller's messages. */
  axes: { time: string; temperature: string };
}

/**
 * The thermometer against time since the pour, as on the board: 0 to 180 s along and 25 to 50 °C
 * up, drawn only as far as the student has watched it. Past 180 s the time axis doubles.
 */
export function ThermometerTrace({ points, label, className, axes }: ThermometerTraceProps) {
  const last = points.at(-1)?.t ?? 0;
  let span = 180;
  while (last > span) span *= 2;
  const tx = (s: number) => 36 + (s * 256) / span;
  const ty = (c: number) => 120 - ((Math.min(50, Math.max(25, c)) - 25) * 112) / 25;
  const xs = Array.from({ length: 7 }, (_, i) => (i * span) / 6);
  const ys = [25, 30, 35, 40, 45, 50];
  const line = points.map((p) => `${tx(p.t).toFixed(1)},${ty(p.reading).toFixed(1)}`).join(" ");
  const now = points.at(-1);
  return (
    <svg
      viewBox={`${TRACE_VIEWBOX.x} ${TRACE_VIEWBOX.y} ${TRACE_VIEWBOX.width} ${TRACE_VIEWBOX.height}`}
      className={className}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <rect x="36" y="8" width="256" height="112" fill={tone("floor-line")} />
      <g stroke={tone("floor-edge")} strokeWidth="1">
        {ys.map((c) => (
          <line key={`y${c}`} x1="36" y1={ty(c)} x2="292" y2={ty(c)} />
        ))}
        {xs.map((s) => (
          <line key={`x${s}`} x1={tx(s)} y1="8" x2={tx(s)} y2="120" />
        ))}
      </g>
      <g fill={tone("rod")} fontFamily="var(--pa-font-mono)" fontSize="10">
        {ys.map((c) => (
          <text key={`ly${c}`} x="30" y={ty(c) + 3} textAnchor="end">
            {c}
          </text>
        ))}
        {xs.map((s) => (
          <text key={`lx${s}`} x={tx(s)} y="134" textAnchor="middle">
            {s}
          </text>
        ))}
      </g>
      <text
        x="164"
        y="148"
        fill={tone("rod")}
        fontFamily="var(--pa-font-sans)"
        fontSize="10"
        textAnchor="middle"
      >
        {axes.time}
      </text>
      <text x="4" y="-2" fill={tone("rod")} fontFamily="var(--pa-font-sans)" fontSize="10">
        {axes.temperature}
      </text>
      {points.length > 1 && (
        <polyline points={line} fill="none" stroke={tone("light")} strokeWidth="2" />
      )}
      {now && <circle cx={tx(now.t)} cy={ty(now.reading)} r="3.5" fill={tone("light")} />}
    </svg>
  );
}
