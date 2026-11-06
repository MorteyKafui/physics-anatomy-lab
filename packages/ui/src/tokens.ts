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

export type Topic = "mechanics" | "heat" | "light" | "waves" | "electricity" | "measurement" | "modern";

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
  colour: { gridMinor: "#CFE7C8", gridMajor: "#8FC98A", frame: "#4F8F4A", point: "#B86E00", fit: "#F0482A", triangle: "#6D5BD8" },
  mono: { gridMinor: "#E3E3E3", gridMajor: "#BDBDBD", frame: "#555555", point: "#141414", fit: "#141414", triangle: "#141414" },
} as const;

/** Lyra: zero radius. Only physically round things use `round`. */
export const radius = { none: 0, round: 9999 } as const;
