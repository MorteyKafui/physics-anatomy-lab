import type { ReactNode } from "react";

/**
 * The magnifier: a lens laid over a figure that shows the part under it larger, for reading
 * fine scales (verniers, micrometers, meters) and checking small parts such as the split cork.
 * It redraws the same figure with a narrower viewBox, so what it shows is the live state, not a
 * picture of it.
 *
 * Place it inside a positioned box with the figure's aspect ratio. Everything is in the figure's
 * own units and percentages, so it needs no measuring of the screen. A lens is round in reality,
 * so it stays round (design/README.md).
 */
export interface MagnifierProps {
  /** The point the lens is centred on, in the figure's units. */
  at: { x: number; y: number };
  /** The figure's size in its own units (its viewBox width and height). */
  figure: { width: number; height: number };
  /** How many times larger the lens shows things. */
  zoom?: number;
  /** The lens's diameter, in the figure's units. */
  diameter?: number;
  /** Draw the figure with the given viewBox. */
  children: (viewBox: string) => ReactNode;
}

/** The part of the figure a lens centred at a point shows. */
export function lensViewBox(at: { x: number; y: number }, zoom: number, diameter: number) {
  const span = diameter / zoom;
  return `${at.x - span / 2} ${at.y - span / 2} ${span} ${span}`;
}

export function Magnifier({ at, figure, zoom = 3, diameter = 132, children }: MagnifierProps) {
  return (
    <div
      aria-hidden
      data-magnifier
      style={{
        position: "absolute",
        pointerEvents: "none",
        left: `${((at.x - diameter / 2) / figure.width) * 100}%`,
        top: `${((at.y - diameter / 2) / figure.height) * 100}%`,
        width: `${(diameter / figure.width) * 100}%`,
        aspectRatio: "1",
        overflow: "hidden",
        borderRadius: "50%",
        background: "var(--pa-bg)",
        border: "2px solid var(--pa-fg-soft)",
        boxShadow: "0 0 0 1px var(--pa-border)",
      }}
    >
      {children(lensViewBox(at, zoom, diameter))}
    </div>
  );
}
