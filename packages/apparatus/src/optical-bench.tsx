/**
 * The converging lens bench, as drawn on the approved board ("The converging lens: finding the
 * image"): the ray box R with its lit wire gauze, the lens L and the screen S on an optical bench,
 * each holder read on the rule at its red centre mark, with the light from the gauze drawn
 * through the lens. Colours are the figure tones in packages/ui.
 *
 * The figure draws a given state and does no physics: the caller passes where the image is
 * sharpest and its magnification from the model (packages/experiments), so what moves is the model.
 */

/** The drawing's own units. */
export const OPTICAL_VIEWBOX = { width: 600, height: 300 };

/** The rule: 0 to 100 cm between these x, and the principal axis's height. */
export const RULE = { x0: 40, x1: 560, axis: 150 };

/** Heights are drawn 8 px to 1 cm (not to scale along the bench), so the gauze and its image show. */
const PX_PER_M_UP = 800;

/** Where a place on the rule (m from its zero) is drawn. */
export const benchX = (m: number) => RULE.x0 + (m / 1) * (RULE.x1 - RULE.x0);

const tone = (name: string) => `var(--pa-figure-${name})`;

export interface OpticalBenchProps {
  /** Each holder's centre mark on the rule, m. */
  object: number;
  lens: number;
  screen: number;
  /** Height of the gauze's centre above the lens's axis, m. */
  offAxis: number;
  /** Half the gauze's height, m. */
  objectHalfHeight: number;
  /**
   * The real image, from the model: where it is sharpest (m from the lens) and its
   * magnification. Undefined when there is none (the light leaves the lens still spreading).
   */
  image: { at: number; magnification: number } | undefined;
  /** Accessible description; omit for a decorative copy. */
  label?: string;
  className?: string;
}

export function OpticalBench({
  object,
  lens,
  screen,
  offAxis,
  objectHalfHeight,
  image,
  label,
  className,
}: OpticalBenchProps) {
  const ox = benchX(object);
  const lx = benchX(lens);
  const sx = benchX(screen);
  const axis = RULE.axis;
  const gauze = {
    top: axis - (objectHalfHeight + offAxis) * PX_PER_M_UP,
    mid: axis - offAxis * PX_PER_M_UP,
  };
  // Three rays from the top of the gauze: through the lens above, at and below its centre.
  const lensHits = [axis - 22, axis, axis + 22];
  const rays = lensHits.map((y) => {
    if (image) {
      const ix = benchX(lens + image.at);
      const iy = axis + image.magnification * (axis - gauze.top);
      const atScreen = y + ((iy - y) * (sx - lx)) / (ix - lx);
      return `M${ox + 2},${gauze.top} L${lx},${y} L${sx},${atScreen.toFixed(1)}`;
    }
    // No real image: the rays leave the lens still spreading.
    const slope = (y - gauze.top) / (lx - ox);
    return `M${ox + 2},${gauze.top} L${lx},${y} L${sx},${(y + slope * 0.4 * (sx - lx)).toFixed(1)}`;
  });
  const ticks = Array.from({ length: 21 }, (_, i) => ({ x: benchX(i * 0.05), long: i % 2 === 0 }));
  const holder = (x: number, stemTop: number, part: string) => (
    <g data-part={`${part}-holder`}>
      <rect x={x - 3} y={stemTop} width={6} height={232 - stemTop} fill={tone("base-edge")} />
      <rect x={x - 15} y={226} width={30} height={6} fill={tone("clamp-edge")} />
      <line x1={x} y1={226} x2={x} y2={250} stroke={tone("mark")} strokeWidth={1.5} />
    </g>
  );
  return (
    <svg
      viewBox={`0 0 ${OPTICAL_VIEWBOX.width} ${OPTICAL_VIEWBOX.height}`}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={className}
    >
      {/* Bench top, and the principal axis */}
      <polygon
        points="30,40 570,40 600,290 0,290"
        fill={tone("floor")}
        stroke={tone("floor-edge")}
      />
      <line
        x1={RULE.x0}
        y1={axis}
        x2={RULE.x1}
        y2={axis}
        stroke={tone("base-top")}
        strokeDasharray="4 4"
      />

      {/* The light from the gauze */}
      <g data-part="light" stroke={tone("light")} strokeWidth={1} fill="none" opacity={0.75}>
        {rays.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>

      {/* The optical bench's rail and its metre rule */}
      <rect
        x={26}
        y={232}
        width={548}
        height={12}
        fill={tone("base-top")}
        stroke={tone("base-edge")}
      />
      <rect x={26} y={244} width={548} height={24} fill={tone("dial")} />
      <g stroke={tone("ink")} strokeWidth={1}>
        {ticks.map((k, i) => (
          <line key={i} x1={k.x} y1={244} x2={k.x} y2={k.long ? 254 : 250} />
        ))}
      </g>
      <g
        fill={tone("ink")}
        fontFamily="var(--font-mono, ui-monospace, monospace)"
        fontSize={10}
        textAnchor="middle"
      >
        {Array.from({ length: 11 }, (_, i) => (
          <text key={i} x={benchX(i * 0.1)} y={265}>
            {i * 10}
          </text>
        ))}
      </g>

      {/* Ray box R with its illuminated wire gauze, which slides up and down its holder */}
      <g data-part="ray-box">
        <rect
          x={ox - 38}
          y={gauze.mid - 32}
          width={40}
          height={64}
          fill={tone("floor-edge")}
          stroke={tone("base-edge")}
        />
        <circle cx={ox - 22} cy={gauze.mid} r={8} fill={tone("lamp")} opacity={0.9} />
        <rect
          data-part="gauze"
          x={ox - 2}
          y={gauze.top}
          width={4}
          height={2 * objectHalfHeight * PX_PER_M_UP}
          fill={tone("gauze")}
        />
        {holder(ox, gauze.mid + 32, "ray-box")}
        <text
          x={ox}
          y={gauze.mid - 40}
          fill={tone("rod")}
          fontFamily="var(--font-sans, sans-serif)"
          fontSize={11}
          textAnchor="middle"
        >
          R
        </text>
      </g>

      {/* The lens L */}
      <g data-part="lens">
        <path
          d={`M${lx},${axis - 36} Q${lx + 9},${axis} ${lx},${axis + 36} Q${lx - 9},${axis} ${lx},${axis - 36} Z`}
          fill={tone("glass")}
          fillOpacity={0.35}
          stroke={tone("glass-edge")}
          strokeWidth={1.2}
        />
        {holder(lx, axis + 34, "lens")}
        <text
          x={lx}
          y={axis - 44}
          fill={tone("rod")}
          fontFamily="var(--font-sans, sans-serif)"
          fontSize={11}
          textAnchor="middle"
        >
          L
        </text>
      </g>

      {/* The screen S */}
      <g data-part="screen">
        <rect
          x={sx - 3}
          y={axis - 54}
          width={6}
          height={108}
          fill={tone("screen")}
          stroke={tone("rod")}
        />
        {holder(sx, axis + 54, "screen")}
        <text
          x={sx}
          y={axis - 62}
          fill={tone("rod")}
          fontFamily="var(--font-sans, sans-serif)"
          fontSize={11}
          textAnchor="middle"
        >
          S
        </text>
      </g>
    </svg>
  );
}

export interface ScreenFaceProps {
  /**
   * The image on the screen: its blur patch as a fraction of the screen's height, its size
   * (image height over the screen's), and its centre's offset from the screen's centre (fraction,
   * up is positive). Undefined for no image: an even, faint patch of light.
   */
  image: { blur: number; size: number; offset: number } | undefined;
  label?: string;
  className?: string;
}

/** The screen's face, as the student sees it: the gauze's image, inverted, blurred or sharp. */
export function ScreenFace({ image, label, className }: ScreenFaceProps) {
  const S = 150;
  const h = image ? image.size * S : 0;
  const cy = S / 2 - (image?.offset ?? 0) * S;
  const x0 = S / 2 - h / 2;
  const y0 = cy - h / 2;
  const lines = image
    ? [1, 2, 3, 4].flatMap((i) => [
        { x1: x0 + (h * i) / 5, y1: y0, x2: x0 + (h * i) / 5, y2: y0 + h },
        { x1: x0, y1: y0 + (h * i) / 5, x2: x0 + h, y2: y0 + (h * i) / 5 },
      ])
    : [];
  return (
    <svg
      width={S}
      height={S}
      viewBox={`0 0 ${S} ${S}`}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={className}
    >
      <defs>
        <clipPath id="screen-face">
          <rect width={S} height={S} />
        </clipPath>
        <filter id="screen-blur" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation={image ? image.blur * S : 0} />
        </filter>
      </defs>
      <rect width={S} height={S} fill={tone("screen")} />
      <g clipPath="url(#screen-face)">
        {image ? (
          <g
            filter="url(#screen-blur)"
            stroke={tone("image")}
            strokeWidth={2.2}
            fill={tone("image-light")}
          >
            <rect x={x0} y={y0} width={h} height={h} />
            {lines.map((l, i) => (
              <line key={i} {...l} />
            ))}
          </g>
        ) : (
          <circle cx={S / 2} cy={S / 2} r={S * 0.42} fill={tone("image-light")} opacity={0.45} />
        )}
      </g>
    </svg>
  );
}
