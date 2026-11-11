import type { Lead, Terminal } from "@pa/experiments";

/**
 * The Ohm's law bench, as drawn on the approved board ("Ohm's law: wiring and measuring"): two
 * dry cells in a holder, a plug key, the resistor R, an ammeter and a voltmeter, and the
 * potentiometer wire PQ on a board with a metre rule and its jockey. The student's leads are
 * drawn between the terminals they joined. Colours are the figure tones in packages/ui.
 *
 * The figure draws a given state and does no physics: the caller passes the needles' positions
 * from the meters' readings (packages/experiments), so what moves is the model.
 */

/** The drawing's own units. */
export const CIRCUIT_VIEWBOX = { width: 600, height: 420 };

/** Where the wire runs on the board: P to Q, in drawing units. */
export const WIRE = { x0: 80, x1: 520, y: 318 };

/** Each terminal's point in the drawing, for drawing leads and placing the screen's buttons. */
export const TERMINAL_POINTS: Record<Exclude<Terminal, "jockey">, { x: number; y: number }> = {
  "cell-": { x: 66, y: 170 },
  "cell+": { x: 170, y: 170 },
  "key.1": { x: 76, y: 251 },
  "key.2": { x: 124, y: 251 },
  "R.1": { x: 244, y: 170 },
  "R.2": { x: 326, y: 170 },
  "A+": { x: 410, y: 224 },
  "A-": { x: 474, y: 224 },
  "V+": { x: 202, y: 284 },
  "V-": { x: 262, y: 284 },
  "wire.P": { x: 70, y: WIRE.y },
  "wire.Q": { x: 530, y: WIRE.y },
};

/** x in the drawing of a point PJ metres along a wire `length` long. */
export const wireX = (pj: number, length = 1) => WIRE.x0 + (pj / length) * (WIRE.x1 - WIRE.x0);

/** Where the jockey's own terminal (its handle) is drawn. */
export function jockeyPoint(at: number, pressed: boolean, length = 1) {
  return { x: wireX(at, length), y: pressed ? 288 : 274 };
}

export function terminalPoint(t: Terminal, jockey: { at: number; pressed: boolean }, length = 1) {
  return t === "jockey" ? jockeyPoint(jockey.at, jockey.pressed, length) : TERMINAL_POINTS[t];
}

const PLUS: readonly Terminal[] = ["cell+", "A+", "V+"];
const tone = (name: string) => `var(--pa-figure-${name})`;

/** A lead hangs between its two ends, sagging more the longer it is. */
function leadPath(a: { x: number; y: number }, b: { x: number; y: number }) {
  const sag = 24 + 0.12 * Math.hypot(b.x - a.x, b.y - a.y);
  return `M${a.x},${a.y} C${a.x},${a.y + sag} ${b.x},${b.y + sag} ${b.x},${b.y}`;
}

export interface CircuitBenchProps {
  /** The leads the student has joined. */
  leads: readonly Lead[];
  keyClosed: boolean;
  /** Where the jockey is, PJ in m, and whether it is pressed on the wire. */
  jockey: { at: number; pressed: boolean };
  /** The ammeter's needle, as a fraction of full scale (0 to 1). */
  ammeter: number;
  /** The voltmeter's needle, as a fraction of full scale (0 to 1). */
  voltmeter: number;
  /** The wire's length, m. */
  wireLength?: number;
  /** A lead being drawn from a terminal to a point in drawing units. */
  pending?: { from: Terminal; to: { x: number; y: number } };
  /** Terminals to light: where a lead could go, or the ones the coach marks as wrong. */
  lit?: readonly Terminal[];
  /** Leads to light, such as a shorting lead the safety check blocked. */
  litLeads?: readonly Lead[];
  /** PJ to show beside the jockey while it is pressed, already formatted ("60.0 cm"). */
  pjLabel?: string;
  /** Accessible description; omit for a decorative copy. */
  label?: string;
  className?: string;
}

const same = (l: Lead, m: Lead) =>
  (l[0] === m[0] && l[1] === m[1]) || (l[0] === m[1] && l[1] === m[0]);

export function CircuitBench({
  leads,
  keyClosed,
  jockey,
  ammeter,
  voltmeter,
  wireLength = 1,
  pending,
  lit = [],
  litLeads = [],
  pjLabel,
  label,
  className,
}: CircuitBenchProps) {
  const at = (t: Terminal) => terminalPoint(t, jockey, wireLength);
  const jx = wireX(jockey.at, wireLength);
  const jy = jockey.pressed ? 0 : -14;
  const needle = (cx: number, cy: number, frac: number) => {
    const a = Math.PI * (1 - Math.min(1, Math.max(0, frac)));
    return { x: cx + 26 * Math.cos(a), y: cy - 26 * Math.sin(a) };
  };
  const an = needle(442, 196, ammeter);
  const vn = needle(232, 262, voltmeter);
  const ticks = Array.from({ length: 11 }, (_, i) => WIRE.x0 + (i * (WIRE.x1 - WIRE.x0)) / 10);
  const terminal = (t: Exclude<Terminal, "jockey">, plus: boolean) => {
    const p = TERMINAL_POINTS[t];
    return (
      <g key={t} data-terminal={t}>
        {lit.includes(t) && (
          <circle
            cx={p.x}
            cy={p.y}
            r={12}
            fill="none"
            stroke="var(--pa-accent-soft)"
            strokeWidth={2}
          />
        )}
        <circle
          cx={p.x}
          cy={p.y}
          r={t.startsWith("wire.") ? 7 : 5.5}
          fill={
            plus
              ? tone("terminal-plus")
              : t.startsWith("wire.") || t.startsWith("key.") || t.startsWith("R.")
                ? tone("clamp")
                : tone("terminal-minus")
          }
          stroke={tone("rod-light")}
        />
      </g>
    );
  };

  return (
    <svg
      viewBox={`0 0 ${CIRCUIT_VIEWBOX.width} ${CIRCUIT_VIEWBOX.height}`}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={className}
    >
      {/* Bench top */}
      <polygon
        points="40,120 560,120 600,400 0,400"
        fill={tone("floor")}
        stroke={tone("floor-edge")}
      />
      <g stroke={tone("floor-line")}>
        <line x1={10} y1={330} x2={590} y2={330} />
        <line x1={25} y1={225} x2={575} y2={225} />
      </g>

      {/* The potentiometer board, its metre rule and the wire PQ */}
      <g data-part="wire">
        <polygon
          points="60,300 540,300 556,350 44,350"
          fill={tone("base-top")}
          stroke={tone("base-edge")}
        />
        <polygon points="44,350 556,350 556,360 44,360" fill={tone("base-side")} />
        <line x1={WIRE.x0} y1={336} x2={WIRE.x1} y2={336} stroke={tone("clamp-edge")} />
        {ticks.map((x, i) => (
          <line
            key={x}
            x1={x}
            y1={336}
            x2={x}
            y2={i % 5 === 0 ? 328 : 332}
            stroke={tone("clamp-edge")}
          />
        ))}
        {[0, 20, 40, 60, 80, 100].map((cm) => (
          <text
            key={cm}
            x={wireX(cm / 100)}
            y={348}
            fill={tone("rod")}
            fontSize={8}
            textAnchor="middle"
            className="font-mono"
          >
            {cm}
          </text>
        ))}
        <line
          x1={WIRE.x0}
          y1={WIRE.y}
          x2={WIRE.x1}
          y2={WIRE.y}
          stroke={tone("rod-light")}
          strokeWidth={1.6}
        />
        <text
          x={70}
          y={296}
          fill={tone("thread")}
          fontSize={12}
          fontWeight={600}
          textAnchor="middle"
        >
          P
        </text>
        <text
          x={530}
          y={296}
          fill={tone("thread")}
          fontSize={12}
          fontWeight={600}
          textAnchor="middle"
        >
          Q
        </text>
      </g>

      {/* Two dry cells in a holder */}
      <g data-part="cells">
        <rect
          x={70}
          y={150}
          width={96}
          height={40}
          fill={tone("base-side")}
          stroke={tone("base-edge")}
        />
        <rect x={78} y={158} width={38} height={24} fill={tone("base-top")} />
        <rect x={118} y={158} width={38} height={24} fill={tone("base-top")} />
        <text x={118} y={206} fill={tone("rod")} fontSize={11} textAnchor="middle">
          E
        </text>
      </g>

      {/* The plug key */}
      <g data-part="key">
        <rect
          x={64}
          y={238}
          width={70}
          height={26}
          fill={tone("base-top")}
          stroke={tone("base-edge")}
        />
        <rect
          x={93}
          y={keyClosed ? 240 : 226}
          width={12}
          height={keyClosed ? 22 : 14}
          fill={tone("cork")}
          stroke={tone("cork-edge")}
        />
        <text x={99} y={280} fill={tone("rod")} fontSize={11} textAnchor="middle">
          K
        </text>
      </g>

      {/* The resistor R */}
      <g data-part="resistor">
        <rect
          x={250}
          y={160}
          width={70}
          height={20}
          fill={tone("base-top")}
          stroke={tone("base-edge")}
        />
        <rect x={268} y={163} width={34} height={14} fill={tone("rod")} />
        <text x={285} y={198} fill={tone("rod")} fontSize={11} textAnchor="middle">
          R
        </text>
      </g>

      {/* The ammeter */}
      <g data-part="ammeter">
        <rect
          x={400}
          y={140}
          width={84}
          height={74}
          fill={tone("dial-rim")}
          stroke={tone("base-edge")}
        />
        <path d="M412,196 A30,30 0 0,1 472,196" fill={tone("dial")} />
        <line x1={442} y1={196} x2={an.x} y2={an.y} stroke={tone("ink")} strokeWidth={1.6} />
        <text x={442} y={208} fill={tone("rod")} fontSize={10} textAnchor="middle">
          A
        </text>
      </g>

      {/* The voltmeter */}
      <g data-part="voltmeter">
        <rect
          x={190}
          y={206}
          width={84}
          height={66}
          fill={tone("dial-rim")}
          stroke={tone("base-edge")}
        />
        <path d="M202,262 A30,30 0 0,1 262,262" fill={tone("dial")} />
        <line x1={232} y1={262} x2={vn.x} y2={vn.y} stroke={tone("ink")} strokeWidth={1.6} />
        <text x={232} y={240} fill={tone("rod")} fontSize={10} textAnchor="middle">
          V
        </text>
      </g>

      {/* The leads the student has joined */}
      <g fill="none" strokeWidth={2.2} strokeLinecap="round">
        {leads.map((l) => (
          <path
            key={`${l[0]}~${l[1]}`}
            data-lead={`${l[0]}~${l[1]}`}
            d={leadPath(at(l[0]), at(l[1]))}
            stroke={
              litLeads.some((m) => same(l, m))
                ? "var(--pa-accent)"
                : PLUS.includes(l[0]) || PLUS.includes(l[1])
                  ? tone("lead-plus")
                  : tone("lead")
            }
          />
        ))}
        {pending && (
          <path
            d={leadPath(at(pending.from), pending.to)}
            stroke="var(--pa-accent-soft)"
            strokeDasharray="6 8"
          />
        )}
      </g>

      {/* Terminals, drawn over the leads' ends */}
      {(Object.keys(TERMINAL_POINTS) as Exclude<Terminal, "jockey">[]).map((t) =>
        terminal(t, PLUS.includes(t)),
      )}

      {/* The jockey */}
      <g data-part="jockey">
        <polygon
          points={`${jx - 5},${300 + jy} ${jx + 5},${300 + jy} ${jx},${316 + jy}`}
          fill={tone("rod")}
          stroke={tone("rod-light")}
        />
        <circle
          cx={jx}
          cy={jockey.pressed ? 288 : 274}
          r={5}
          fill={tone("clamp")}
          stroke={tone("rod-light")}
        />
        {lit.includes("jockey") && (
          <circle
            cx={jx}
            cy={jockey.pressed ? 288 : 274}
            r={12}
            fill="none"
            stroke="var(--pa-accent-soft)"
            strokeWidth={2}
          />
        )}
        {jockey.pressed && (
          <>
            <circle cx={jx} cy={WIRE.y} r={3.5} fill={tone("bob-light")} />
            {pjLabel && (
              <text
                x={jx}
                y={372}
                fill={tone("bob-light")}
                fontSize={10}
                textAnchor="middle"
                className="font-mono"
              >
                PJ = {pjLabel}
              </text>
            )}
          </>
        )}
      </g>
    </svg>
  );
}
