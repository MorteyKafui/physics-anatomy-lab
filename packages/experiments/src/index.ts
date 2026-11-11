// @pa/experiments: one folder per experiment: definition, mistake catalogue, coach script, text,
// print sheets and tests. The simple pendulum is the first.
export {
  benchPeriod,
  bobAngle,
  countedFromOne,
  countFromOne,
  countFromOneErrorPercent,
  passTimes,
  recordedTime,
  simplePendulum,
  stoppedEarly,
  TIMING_RULES,
} from "./simple-pendulum";
export type { Timing, TimingContext } from "./simple-pendulum";
export {
  ASSEMBLY_RULES,
  assembled,
  assemblyProjection,
  carriedBy,
  CORRECT_ASSEMBLY,
  decideAssembly,
  EMPTY_ASSEMBLY,
  nextPart,
  PART_SPECS,
  PENDULUM_PARTS,
  PENDULUM_SLOTS,
  readySlots,
  slotReady,
  threadOnClamp,
  waitsFor,
} from "./pendulum-assembly";
export type {
  Assembly,
  AssemblyCommand,
  AssemblyContext,
  AssemblyDecision,
  AssemblyRefusal,
  PendulumPart,
  PendulumSlot,
} from "./pendulum-assembly";
export {
  asReading,
  LENGTHS,
  lengthProjection,
  PENDULUM_INSTRUMENTS,
  PENDULUM_PLOT,
  PENDULUM_STANDARD_TABLE,
  PENDULUM_TEMPLATES,
  readingsIntoTable,
  setLength,
  STARTING_ROWS,
  stepLength,
} from "./pendulum-table";
export type { PendulumReading, PendulumTemplate } from "./pendulum-table";
export {
  ANALYSIS_RULES,
  answerRules,
  expectedAnswers,
  G_DIMS,
  gFromSlope,
  PENDULUM_ANSWERS,
  plotsTSquaredAgainstL,
  slopeOf,
  typedQuantity,
} from "./pendulum-analysis";
export type { AnalysisContext, PendulumAnswer, TypedAnswer } from "./pendulum-analysis";
export { PENDULUM_FORMULAS, PENDULUM_SYMBOLS, symbolFacts } from "./pendulum-symbols";
export type { FormulaCard, PendulumSymbol, SymbolFacts } from "./pendulum-symbols";
export {
  effectOf,
  readingErrorPercent,
  rightWay,
  STEP_FOR_SKILL,
  swingsTimed,
} from "./pendulum-review";
export type { MistakeEffect, RightWay, TimedReading } from "./pendulum-review";
export { PENDULUM_SHEET_NUMBER, pendulumSheet, SHEET_LENGTHS } from "./pendulum-sheets";
export type { PendulumSheet } from "./pendulum-sheets";
export { EXAM_MINUTES, EXAM_PARTS, examClock, followUps, markScript } from "./pendulum-exam";
export type { ExamFacts, ExamPart, Mark, MarkedSection } from "./pendulum-exam";
export {
  benchNetwork,
  correctBench,
  jockeySlid,
  keyLeftClosed,
  meterReadings,
  ohmsLaw,
  ohmsLawWorld,
  PROCEDURE_RULES,
  recorded,
  trueReadings,
  unsafeToClose,
  wireResistanceTo,
} from "./ohms-law";
export type {
  BenchState,
  KeyInterval,
  OhmsLawWorld,
  ProcedureContext,
  TrueReadings,
  Unsafe,
} from "./ohms-law";
export {
  classifyWiring,
  CORRECT_LEADS,
  netsOf,
  TERMINALS,
  wiredRight,
  wiring,
  WIRING_MISTAKES,
  WIRING_RULES,
  wrongTerminals,
} from "./ohms-law-wiring";
export type { Lead, Terminal, WiringMistake } from "./ohms-law-wiring";
export {
  benchProjection,
  decideBench,
  initialBench,
  keyIntervalsAt,
  polarisationAt,
} from "./ohms-law-bench";
export type { BenchCommand, BenchDecision, BenchRefusal, CircuitBench } from "./ohms-law-bench";
export {
  asOhmsLawReading,
  OHMS_LAW_ANALYSIS_RULES,
  OHMS_LAW_ANSWERS,
  OHMS_LAW_INSTRUMENTS,
  OHMS_LAW_PLOT,
  OHMS_LAW_ROWS,
  OHMS_LAW_STANDARD_TABLE,
  OHMS_LAW_TEMPLATES,
  ohmsLawAnswerRules,
  ohmsLawExpected,
  ohmsLawReadingsIntoTable,
  plotsIAgainstV,
  readingData,
  rFromSlope,
  vInterceptOf,
} from "./ohms-law-table";
export type {
  OhmsLawAnalysisContext,
  OhmsLawAnswer,
  OhmsLawReading,
  OhmsLawTemplate,
} from "./ohms-law-table";
export { OHMS_LAW_SHEET_NUMBER, ohmsLawSheet } from "./ohms-law-sheets";
export type { OhmsLawSheet } from "./ohms-law-sheets";
