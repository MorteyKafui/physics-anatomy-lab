/** The same tokens as tokens.css, for canvas drawing, SVG export and tests. */

export const colour = {
  ink1000: "#0A0A0A",
  ink950: "#0D0D0D",
  ink900: "#111110",
  ink850: "#161616",
  ink800: "#1E1D1D",
  line: "#2A2928",
  lineStrong: "#3A3936",
  text: "#F2F0EA",
  textSoft: "#C9C6BF",
  textMuted: "#A3A19B",
  textFaint: "#8F8D88",
  paper: "#FBFBF6",
  paper2: "#F3F1E8",
  paperLine: "#E6E4DB",
  onPaper: "#141414",
  onPaperMuted: "#4A4843",
  accent: "#F0482A",
  accentSoft: "#FF8A6E",
} as const;

export type Topic =
  "mechanics" | "heat" | "light" | "waves" | "electricity" | "measurement" | "modern";

export const topicHue: Readonly<Record<Topic, string>> = {
  mechanics: "#F5A524",
  heat: "#FF7A3D",
  light: "#8B7CF6",
  waves: "#2EC4B6",
  electricity: "#3B82F6",
  measurement: "#6CC25A",
  modern: "#E64980",
};

/** Graph colours for the two export modes (decision D31). */
export const graphPalette = {
  colour: {
    gridMinor: "#CFE7C8",
    gridMajor: "#8FC98A",
    frame: "#4F8F4A",
    point: "#B86E00",
    fit: "#F0482A",
    triangle: "#6D5BD8",
    /** The sheet itself, and its numbers and labels, from the Table mockup. */
    paper: "#FFFFFF",
    label: "#3D3B37",
    mark: "#6B6963",
  },
  mono: {
    gridMinor: "#E3E3E3",
    gridMajor: "#BDBDBD",
    frame: "#555555",
    point: "#141414",
    fit: "#141414",
    triangle: "#141414",
    paper: "#FFFFFF",
    label: "#3D3B37",
    mark: "#6B6963",
  },
} as const;

/** Lyra: zero radius. Only physically round things use `round`. */
export const radius = { none: 0, round: 9999 } as const;

/**
 * Apparatus figure tones, from the approved lab mockup's bench drawing (Anatomy kit style:
 * muted solids, hairline edges, one lit part). Figures use these, never their own colours.
 */
export const figureTone = {
  floor: "#121211",
  floorLine: "#1F1E1D",
  floorEdge: "#2A2928",
  baseTop: "#3A3936",
  baseEdge: "#55534F",
  baseSide: "#262524",
  baseSideDark: "#1C1B1A",
  rod: "#8F8C86",
  rodLight: "#C9C6BF",
  clamp: "#5A5853",
  clampEdge: "#77746E",
  cork: "#B98B5E",
  corkEdge: "#8A6440",
  guide: "#4A4845",
  thread: "#E8E4DC",
  bobLight: "#FF9A80",
  dial: "#E8E4DC",
  dialRim: "#1E1D1D",
  ink: "#141414",
} as const;

/**
 * The same parts on paper (the Anatomy light theme): print sheets and the report. Light solids
 * with dark edges, so the drawing reads on white and photocopies in black and white.
 */
export const figureTonePaper: Record<keyof typeof figureTone, string> = {
  floor: "#FAFAF7",
  floorLine: "#E6E4DB",
  floorEdge: "#BDBAB1",
  baseTop: "#F3F1E8",
  baseEdge: "#77746E",
  baseSide: "#E6E4DB",
  baseSideDark: "#D6D3C9",
  rod: "#A3A19B",
  rodLight: "#E6E4DB",
  clamp: "#C9C6BF",
  clampEdge: "#77746E",
  cork: "#D9B98F",
  corkEdge: "#8A6440",
  guide: "#BDBAB1",
  thread: "#3D3B37",
  bobLight: "#FFD0C2",
  dial: "#FFFFFF",
  dialRim: "#3D3B37",
  ink: "#141414",
};
