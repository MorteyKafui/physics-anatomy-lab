// The ten steps of an attempt, as GLOSSARY.md names them.
const STEP_NAMES: Readonly<Record<string, string>> = {
  question: "Question",
  predict: "Predict",
  build: "Build",
  check: "Check",
  measure: "Measure",
  tabulate: "Tabulate",
  plot: "Plot",
  analyse: "Analyse",
  conclude: "Conclude",
  report: "Report",
};

export const stepName = (step: string) => STEP_NAMES[step] ?? step;

export const STEPS = [
  "question",
  "predict",
  "build",
  "check",
  "measure",
  "tabulate",
  "plot",
  "analyse",
  "conclude",
  "report",
] as const;
