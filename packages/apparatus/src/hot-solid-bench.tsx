import { useId } from "react";

/**
 * The method of mixtures with a hot solid, as drawn on the approved board ("The method of mixtures:
 * a hot solid, read every minute"): the balance, the beaker of boiling water on its tripod over the
 * heater, the solid on its thread, and the lagged calorimeter with its lid, thermometer and
 * stirrer. Colours are the figure tones in packages/ui.
 *
 * The figure draws a given state and does no physics: the caller passes where the solid is, the
 * water, and the thermometer's reading from the heat model (packages/experiments).
 */

/** The drawing's own units. */
export const HOT_SOLID_VIEWBOX = { width: 600, height: 300 };

const tone = (name: string) => `var(--pa-figure-${name})`;

/** The thermometer's stem: 20 °C just above the bulb, 3.3 px to a degree. */
const STEM = { x: 412, top: 40, bulb: 232, zero: 224, perDegree: 3.3 };
/** The calorimeter's floor and inside; 1 px of height to 0.75 g of water. */
const CAN = { x: 394, y: 128, w: 122, h: 112, floor: 238 };
/** Where the solid hangs: in the beaker, in the air between, or in the calorimeter. */
const SOLID = {
  beaker: { x: 214, top: 150 },
  air: { x: 314, top: 90 },
  calorimeter: { x: 456, top: 196 },
} as const;
const BUBBLES = [
  { x: 196, y: 186 },
  { x: 210, y: 170 },
  { x: 226, y: 182 },
  { x: 236, y: 160 },
  { x: 202, y: 152 },
];

export interface HotSolidBenchProps {
  /** What the balance shows, g; undefined before anything is weighed. */
  balance: number | undefined;
  /** Where the solid is. */
  solid: keyof typeof SOLID;
  /** Drops of boiling water still on it: it was not shaken. */
  wet: boolean;
  /** The water in the calorimeter, g; 0 when empty. */
  water: number;
  covered: boolean;
  stirring: boolean;
  /** What the thermometer shows, °C. */
  thermometer: number;
  /** Accessible description; omit for a decorative copy. */
  label?: string;
  className?: string;
}

export function HotSolidBench({
  balance,
  solid,
  wet,
  water,
  covered,
  stirring,
  thermometer,
  label,
  className,
}: HotSolidBenchProps) {
  const felt = `${useId()}-felt`;
  const at = SOLID[solid];
  const height = Math.min(CAN.h - 6, water / 0.75);
  const mercury = Math.max(
    STEM.top + 2,
    Math.min(STEM.bulb, STEM.zero - (thermometer - 20) * STEM.perDegree),
  );
  return (
    <svg
      viewBox={`0 0 ${HOT_SOLID_VIEWBOX.width} ${HOT_SOLID_VIEWBOX.height}`}
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
      </defs>

      <polygon
        points="20,250 580,250 600,290 0,290"
        fill={tone("floor")}
        stroke={tone("floor-edge")}
      />

      <g data-part="balance">
        <rect
          x="34"
          y="214"
          width="96"
          height="36"
          fill={tone("base-side")}
          stroke={tone("base-edge")}
        />
        <rect x="44" y="204" width="76" height="8" fill={tone("base-edge")} />
        <rect x="52" y="224" width="60" height="18" fill={tone("ink")} stroke={tone("base-top")} />
        <text
          x="108"
          y="238"
          fill={tone("dial")}
          fontFamily="var(--pa-font-mono)"
          fontSize="12"
          textAnchor="end"
        >
          {balance === undefined ? "0.0 g" : `${balance.toFixed(1)} g`}
        </text>
      </g>

      <g data-part="beaker">
        <line x1="170" y1="250" x2="182" y2="200" stroke={tone("clamp-edge")} strokeWidth="2" />
        <line x1="258" y1="250" x2="246" y2="200" stroke={tone("clamp-edge")} strokeWidth="2" />
        <line x1="176" y1="200" x2="252" y2="200" stroke={tone("clamp-edge")} strokeWidth="3" />
        <path
          d="M206,250 Q214,226 214,214 Q222,232 222,250 Z"
          fill={tone("lamp")}
          fillOpacity="0.7"
        />
        <path
          d="M182,118 L182,198 L246,198 L246,118"
          fill="none"
          stroke={tone("glass-edge")}
          strokeWidth="1.5"
        />
        <rect x="183" y="138" width="62" height="59" fill={tone("water")} fillOpacity="0.3" />
        {BUBBLES.map((b) => (
          <circle
            key={`${b.x}-${b.y}`}
            cx={b.x}
            cy={b.y}
            r="2"
            fill="none"
            stroke={tone("glass-edge")}
            strokeOpacity="0.8"
          />
        ))}
      </g>

      <g data-part="jacket">
        <rect
          x="370"
          y="116"
          width="170"
          height="134"
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
          fill={tone("floor")}
          stroke={tone("copper")}
          strokeWidth="3"
        />
        {height > 0 && (
          <>
            <rect
              x={CAN.x + 2}
              y={CAN.floor - height}
              width={CAN.w - 4}
              height={height}
              fill={tone("water")}
              fillOpacity="0.35"
            />
            <line
              x1={CAN.x + 2}
              y1={CAN.floor - height}
              x2={CAN.x + CAN.w - 2}
              y2={CAN.floor - height}
              stroke={tone("glass-edge")}
              strokeOpacity="0.6"
            />
          </>
        )}
      </g>

      <g data-part="solid">
        <line x1={at.x} y1="20" x2={at.x} y2={at.top} stroke={tone("rod-light")} strokeWidth="1" />
        <rect
          x={at.x - 10}
          y={at.top}
          width="20"
          height="26"
          fill={tone("rod")}
          stroke={tone("rod-light")}
        />
        {wet && solid !== "beaker" && (
          <>
            <circle cx={at.x - 4} cy={at.top + 30} r="2" fill={tone("water")} />
            <circle cx={at.x + 5} cy={at.top + 34} r="2" fill={tone("water")} />
          </>
        )}
      </g>

      {covered && (
        <g data-part="lid">
          <rect x="388" y="118" width="134" height="8" fill={tone("base-edge")} />
        </g>
      )}
      <g data-part="stirrer" transform={stirring ? "translate(0,-6)" : undefined}>
        <line x1="496" y1="60" x2="496" y2="228" stroke={tone("rod-light")} strokeWidth="2" />
        <rect
          x="404"
          y="226"
          width="96"
          height="5"
          fill="none"
          stroke={tone("rod-light")}
          strokeWidth="2"
        />
      </g>
      <g data-part="thermometer">
        <rect
          x={STEM.x}
          y={STEM.top}
          width="12"
          height="190"
          fill={tone("floor")}
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
    </svg>
  );
}
