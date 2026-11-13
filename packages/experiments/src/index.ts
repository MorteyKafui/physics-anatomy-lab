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
  typedAnswerFindings,
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
export { markOhmsLawScript, ohmsLawFollowUps } from "./ohms-law-exam";
export type { OhmsLawExamFacts } from "./ohms-law-exam";
export {
  blurredImage,
  convergingLens,
  correctLensBench,
  insideFocalLength,
  LENS_PROCEDURE_RULES,
  lensWorld,
  notCoaxial,
  readFromEdge,
  readPosition,
  recordedPosition,
  scaleAtAngle,
  screenImage,
  sharpScreenRange,
} from "./converging-lens";
export type {
  LensBench,
  LensProcedureContext,
  LensReading,
  LensWorld,
  ReadFrom,
  ScreenImage,
} from "./converging-lens";
export {
  asLensReading,
  decideLensBench,
  GAUZE_REACH,
  HOLDER_GAP,
  initialLensBench,
  LENS_BENCH_START,
  LENS_PARTS,
  lensBenchProjection,
  lensReadingData,
} from "./converging-lens-bench";
export type {
  LensBenchCommand,
  LensBenchDecision,
  LensBenchRefusal,
  LensBenchState,
  LensPart,
} from "./converging-lens-bench";
export {
  focalLengthFrom,
  LENS_ANALYSIS_RULES,
  LENS_ANSWERS,
  LENS_GRAPH_RULES,
  LENS_INSTRUMENTS,
  LENS_PLOT,
  LENS_ROWS,
  LENS_STANDARD_TABLE,
  LENS_TEMPLATES,
  lensAnswerRules,
  lensExpected,
  lensReadingsIntoTable,
  plotsInverseVAgainstInverseU,
  wrongLensGraph,
  xInterceptOf,
  yInterceptOf,
} from "./converging-lens-table";
export type {
  LensAnalysisContext,
  LensAnswer,
  LensGraphContext,
  LensTemplate,
} from "./converging-lens-table";
export { LENS_SHEET_NUMBER, lensSheet } from "./converging-lens-sheets";
export type { LensSheet } from "./converging-lens-sheets";
export { lensFollowUps, markLensScript } from "./converging-lens-exam";
export type { LensExamFacts } from "./converging-lens-exam";
export {
  asPinsReading,
  correctPinsBench,
  decidePinsBench,
  eyeOffAxis,
  initialPinsBench,
  lensPins,
  lineUpAt,
  noParallaxStretch,
  parallaxStillThere,
  PINS_BENCH_START,
  PINS_PARTS,
  PINS_PROCEDURE_RULES,
  pinsBenchProjection,
  pinsEyeView,
  pinsReadFromEdge,
  pinsReadingData,
  pinsView,
  seenApart,
  tipsOffAxis,
} from "./converging-lens-pins";
export type {
  PinsBench,
  PinsBenchCommand,
  PinsBenchDecision,
  PinsBenchRefusal,
  PinsBenchState,
  PinsEyeView,
  PinsPart,
  PinsProcedureContext,
  PinsReading,
  PinsView,
} from "./converging-lens-pins";
export {
  PINS_ANALYSIS_RULES,
  PINS_ANSWERS,
  PINS_GRAPH_RULES,
  PINS_INSTRUMENTS,
  PINS_PLOT,
  PINS_ROWS,
  PINS_STANDARD_TABLE,
  PINS_TEMPLATES,
  pinsAnswerRules,
  pinsExpected,
  pinsReadingsIntoTable,
  plotsXyAgainstXPlusY,
  wrongPinsGraph,
} from "./converging-lens-pins-table";
export type {
  PinsAnalysisContext,
  PinsAnswer,
  PinsGraphContext,
  PinsTemplate,
} from "./converging-lens-pins-table";
export { PINS_SHEET_NUMBER, pinsSheet } from "./converging-lens-pins-sheets";
export type { PinsSheet } from "./converging-lens-pins-sheets";
export { markPinsScript, pinsFollowUps } from "./converging-lens-pins-exam";
export type { PinsExamFacts } from "./converging-lens-pins-exam";
export {
  asMixturesReading,
  correctMixturesBench,
  cylinderAtAngle,
  cylinderRead,
  decideMixtures,
  filledVolume,
  hotAtPour,
  initialMixturesBench,
  methodOfMixtures,
  MIXTURES_BENCH_START,
  MIXTURES_PROCEDURE_RULES,
  MIXTURES_THERMOMETER,
  mixturesAt,
  mixturesCalorimeter,
  mixturesPeak,
  mixturesProjection,
  mixturesReadingData,
  notCovered,
  notStirred,
  readBeforePeak,
  readThermometer,
  recordedTemperature,
  slowPour,
  thermometerAtAngle,
  thermometerTruth,
} from "./method-of-mixtures";
export type {
  MixturesBench,
  MixturesCommand,
  MixturesDecision,
  MixturesProcedureContext,
  MixturesReading,
  MixturesRefusal,
} from "./method-of-mixtures";
export {
  MIXTURES_ANALYSIS_RULES,
  MIXTURES_ANSWERS,
  MIXTURES_GRAPH_RULES,
  MIXTURES_INSTRUMENTS,
  MIXTURES_PLOT,
  MIXTURES_ROWS,
  MIXTURES_STANDARD_TABLE,
  MIXTURES_TEMPLATES,
  mixturesExpected,
  mixturesReadingsIntoTable,
  plotsVAgainstInverseT,
  waterEquivalentFrom,
  wrongMixturesGraph,
} from "./method-of-mixtures-table";
export type {
  MixturesAnalysisContext,
  MixturesAnswer,
  MixturesGraphContext,
  MixturesTemplate,
} from "./method-of-mixtures-table";
export { MIXTURES_SHEET_NUMBER, mixturesSheet } from "./method-of-mixtures-sheets";
export type { MixturesSheet } from "./method-of-mixtures-sheets";
export { markMixturesScript, mixturesFollowUps } from "./method-of-mixtures-exam";
export type { MixturesExamFacts } from "./method-of-mixtures-exam";
export {
  asSolidReading,
  cFromReadings,
  correctSolidBench,
  decideSolid,
  hotSolid,
  initialSolidBench,
  readBalance,
  SOLID_PROCEDURE_RULES,
  solidAtEntry,
  solidCalorimeter,
  solidNotCovered,
  solidNotStirred,
  solidPeak,
  solidProjection,
  solidReadBeforePeak,
  solidReadingData,
  solidSlowTransfer,
  solidSplashed,
  solidThermometer,
  solidThermometerAtAngle,
  solidWaterCarried,
  solidWorld,
  WEIGHINGS,
} from "./method-of-mixtures-solid";
export type {
  Metal,
  SolidBench,
  SolidCommand,
  SolidDecision,
  SolidProcedureContext,
  SolidReading,
  SolidRefusal,
  SolidWorld,
  Transfer,
  Weighing,
} from "./method-of-mixtures-solid";
export {
  metalOf,
  plotsThetaAgainstT,
  SOLID_ANALYSIS_RULES,
  SOLID_ANSWERS,
  SOLID_GRAPH_RULES,
  SOLID_INSTRUMENTS,
  SOLID_PLOT,
  SOLID_STANDARD_TABLE,
  SOLID_TEMPLATES,
  solidExpected,
  solidReadingsIntoTable,
  tabulatedRun,
  wrongSolidGraph,
} from "./method-of-mixtures-solid-table";
export type {
  SolidAnalysisContext,
  SolidAnswer,
  SolidGraphContext,
} from "./method-of-mixtures-solid-table";
export { SOLID_SHEET_NUMBER, solidSheet } from "./method-of-mixtures-solid-sheets";
export type { SolidSheet, SolidSheetMetal } from "./method-of-mixtures-solid-sheets";
export { markSolidScript, solidFollowUps } from "./method-of-mixtures-solid-exam";
export type { SolidExamFacts } from "./method-of-mixtures-solid-exam";
export type {
  CheckFinding,
  DataTemplate,
  LabCheck,
  LabRow,
  TemplateColumn,
  TemplateValue,
} from "./lab-data";
export {
  PENDULUM_CHECK_COLUMNS,
  PENDULUM_DATA_TEMPLATE,
  pendulumCarefulSpread,
  pendulumCheck,
  pendulumExample,
  pendulumModelT2,
} from "./pendulum-check";
export {
  OHMS_LAW_CHECK_COLUMNS,
  OHMS_LAW_DATA_TEMPLATE,
  ohmsLawCarefulSpread,
  ohmsLawCheck,
  ohmsLawExample,
} from "./ohms-law-check";
export type { OhmsLawResult } from "./ohms-law-check";
export {
  LENS_CHECK_COLUMNS,
  LENS_DATA_TEMPLATE,
  lensCarefulSpread,
  lensCheck,
  lensExample,
  lensModelInvV,
} from "./converging-lens-check";
export type { LensResult } from "./converging-lens-check";
export {
  PINS_CHECK_COLUMNS,
  PINS_DATA_TEMPLATE,
  pinsCarefulSpread,
  pinsCheck,
  pinsExample,
  pinsModelLine,
} from "./converging-lens-pins-check";
export type { PinsResult } from "./converging-lens-pins-check";
export {
  MIXTURES_CHECK_COLUMNS,
  MIXTURES_DATA_TEMPLATE,
  mixturesCarefulShortfall,
  mixturesCarefulSpread,
  mixturesCheck,
  mixturesExample,
  mixturesModelRise,
} from "./method-of-mixtures-check";
export type { MixturesResult } from "./method-of-mixtures-check";
export {
  SOLID_CHECK_COLUMNS,
  SOLID_DATA_TEMPLATE,
  solidCarefulSpread,
  solidCheck,
  solidExample,
} from "./method-of-mixtures-solid-check";
export type { SolidResult } from "./method-of-mixtures-solid-check";
