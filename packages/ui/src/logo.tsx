import { logo } from "./logo-paths";

export interface LogoProps {
  /** Width and height in pixels. */
  size?: number;
  /** Accessible name; leave empty when a visible "Physics Anatomy" sits next to it. */
  title?: string;
  className?: string;
}

/**
 * The pendulum P (decision D27). The letter and thread take the text colour; the bob is the
 * only red-orange part, in every theme.
 */
export function Logo({ size = 32, title = "", className }: LogoProps) {
  const label = title ? { role: "img", "aria-label": title } : { "aria-hidden": true };
  return (
    <svg width={size} height={size} viewBox={logo.viewBox} className={className} {...label}>
      <path d={logo.letter} fill="none" stroke="currentColor" strokeWidth={18} />
      <line {...logo.thread} stroke="currentColor" strokeWidth={5} />
      <circle {...logo.bob} fill={logo.bobColour} />
    </svg>
  );
}
