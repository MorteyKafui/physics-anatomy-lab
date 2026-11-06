/**
 * The four themes (decision D3 and the master plan, "Design system"). Each theme gives the same
 * roles different colours; components only ever use roles, never palette colours.
 *
 *   lab        dark, instrument-like: the lab, the dashboards, the admin portal (default)
 *   bench      warm bench paper: the light lab
 *   site       light: the public site, reports, printed sheets
 *   projector  light and high contrast, for shared projectors in bright classrooms
 *
 * themes.css holds the same values as CSS; a test keeps the two in step and checks contrast.
 */

export const THEMES = ["lab", "bench", "site", "projector"] as const;
export type Theme = (typeof THEMES)[number];

export interface ThemeRoles {
  /** Page background. */
  bg: string;
  /** Cards, panels, the table. */
  surface: string;
  /** Menus, popovers, hovered rows, raised controls. */
  raised: string;
  /** Hairline borders between things. */
  border: string;
  /** Borders of inputs and other controls you act on. */
  control: string;
  /** Body text. */
  fg: string;
  /** Secondary text: labels, help. */
  fgSoft: string;
  /** Muted text: hints, timestamps. */
  fgMuted: string;
  /** The signature red-orange, filled: primary buttons, the bob, the fit line. */
  accent: string;
  /** Text and icons on an accent fill. */
  onAccent: string;
  /** Accent used as text or a thin line on this background (links, selected tab). */
  accentText: string;
  /** Keyboard focus ring. */
  ring: string;
  /** Status text. Every status also carries an icon or a word, never colour alone. */
  ok: string;
  warn: string;
  danger: string;
}

export const themes: Readonly<Record<Theme, ThemeRoles>> = {
  lab: {
    bg: "#0D0D0D",
    surface: "#161616",
    raised: "#1E1D1D",
    border: "#2A2928",
    // The mockups draw input borders in #3A3936 (1.7:1); raised to 3:1 so controls can be seen.
    control: "#66645E",
    fg: "#F2F0EA",
    fgSoft: "#C9C6BF",
    fgMuted: "#A3A19B",
    accent: "#F0482A",
    onAccent: "#0D0D0D",
    accentText: "#FF8A6E",
    ring: "#FF8A6E",
    ok: "#8FD18A",
    warn: "#F5C46B",
    danger: "#F27A6E",
  },
  bench: {
    bg: "#F4EFE6",
    surface: "#FBF8F2",
    raised: "#FFFFFF",
    border: "#E6DFD2",
    control: "#8C8579",
    fg: "#1F1D1A",
    fgSoft: "#3D3B37",
    fgMuted: "#5F5A51",
    accent: "#E2401F",
    onAccent: "#0D0D0D",
    accentText: "#A8300F",
    ring: "#A8300F",
    ok: "#2F6B2A",
    warn: "#7A5200",
    danger: "#A8300F",
  },
  site: {
    bg: "#FBFBF6",
    surface: "#FFFFFF",
    raised: "#EFEDE6",
    border: "#E2DFD6",
    control: "#8F8C86",
    fg: "#141414",
    fgSoft: "#3D3B37",
    fgMuted: "#5F5D57",
    accent: "#F0482A",
    onAccent: "#141414",
    accentText: "#C2361B",
    ring: "#C2361B",
    ok: "#2F6B2A",
    warn: "#7A5200",
    danger: "#C2361B",
  },
  projector: {
    bg: "#FFFFFF",
    surface: "#FFFFFF",
    raised: "#F1F0EB",
    border: "#8F8C86",
    control: "#3D3B37",
    fg: "#0A0A0A",
    fgSoft: "#2A2928",
    fgMuted: "#3D3B37",
    accent: "#9E2A12",
    onAccent: "#FFFFFF",
    accentText: "#8F2410",
    ring: "#0A0A0A",
    ok: "#1F4D1B",
    warn: "#5C3D00",
    danger: "#8F2410",
  },
};

/** The CSS custom property for each role, as written in themes.css. */
export const roleVariable: Readonly<Record<keyof ThemeRoles, string>> = {
  bg: "--pa-bg",
  surface: "--pa-surface",
  raised: "--pa-raised",
  border: "--pa-border",
  control: "--pa-control",
  fg: "--pa-fg",
  fgSoft: "--pa-fg-soft",
  fgMuted: "--pa-fg-muted",
  accent: "--pa-accent-fill",
  onAccent: "--pa-on-accent",
  accentText: "--pa-accent-text",
  ring: "--pa-ring",
  ok: "--pa-ok-fg",
  warn: "--pa-warn-fg",
  danger: "--pa-danger-fg",
};

/** WCAG relative luminance of a #RRGGBB colour. */
export function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

/** WCAG contrast ratio between two #RRGGBB colours, from 1 to 21. */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}
