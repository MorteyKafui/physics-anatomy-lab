/**
 * The pendulum P (decision D27). The bob is the only red-orange part.
 * viewBox 0 0 160 160. Use these paths for the logo component, exported figures and print sheets.
 */
export const logo = {
  viewBox: "0 0 160 160",
  letter: "M44 148 V16 H92 A40 40 0 0 1 92 96 H44",
  thread: { x1: 84, y1: 26, x2: 98, y2: 60 },
  bob: { cx: 100, cy: 68, r: 12 },
  bobColour: "#F0482A",
} as const;
