import { colour, logo } from "@pa/ui";
import { ImageResponse } from "next/og";

/**
 * The pendulum P as a square app icon (decision D27): the letter and thread in the light text
 * colour on the lab's ink, the bob in the accent. `inset` keeps the mark inside a maskable icon's
 * safe zone.
 */
export function markImage(size: number, inset = 0.16) {
  const mark = Math.round(size * (1 - 2 * inset));
  return new ImageResponse(
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: colour.ink950,
      }}
    >
      <svg width={mark} height={mark} viewBox={logo.viewBox}>
        <path d={logo.letter} fill="none" stroke={colour.text} strokeWidth={18} />
        <line
          x1={logo.thread.x1}
          y1={logo.thread.y1}
          x2={logo.thread.x2}
          y2={logo.thread.y2}
          stroke={colour.text}
          strokeWidth={5}
        />
        <circle cx={logo.bob.cx} cy={logo.bob.cy} r={logo.bob.r} fill={logo.bobColour} />
      </svg>
    </div>,
    { width: size, height: size },
  );
}
