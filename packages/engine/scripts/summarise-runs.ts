// Summarise attempt files for the unaided test (docs/how-to/run-the-unaided-test.md).
// From the repository root:
//   bun packages/engine/scripts/summarise-runs.ts P1/attempt.json P2/attempt.json …
// Each file is the attempt.json inside the notebook's "Download all with the report (ZIP)".
// The file's folder (P1, P2, …) is the tester's label; nothing else about them is read or printed.
import { basename, dirname } from "node:path";

import { STEPS, summariseRun, type AttemptFile } from "../src";

const files = process.argv.slice(2);
if (!files.length) {
  console.error("Give one or more attempt.json files.");
  process.exit(1);
}

const minutes = (s: number) =>
  `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
const rows: string[][] = [];
for (const path of files) {
  const file = (await Bun.file(path).json()) as AttemptFile;
  if (file.format !== "physics-anatomy/attempt") {
    console.error(`${path}: not an attempt file`);
    process.exit(1);
  }
  const s = summariseRun(file.attempt, file.events);
  const label = basename(dirname(path)) || path;
  const slowest = Object.entries(s.stepSeconds).sort((a, b) => b[1] - a[1])[0];
  rows.push([
    label,
    s.finished ? "yes" : `no, stopped at ${s.reached} (${STEPS.indexOf(s.reached) + 1} of 10)`,
    minutes(s.seconds),
    slowest ? `${slowest[0]} ${minutes(slowest[1])}` : "",
    String(s.coachHelp),
    s.coachHelpBySkill.map(([k, n]) => `${k} ${n}`).join(", "),
    String(s.wentBack),
    String(s.readings),
  ]);
}

const head = [
  "Tester",
  "Finished",
  "Time",
  "Slowest step",
  "Coach help",
  "Help by skill",
  "Went back",
  "Readings",
];
const line = (cells: string[]) => process.stdout.write(`| ${cells.join(" | ")} |\n`);
line(head);
line(head.map(() => "---"));
for (const r of rows) line(r);
