// @pa/engine: the event log, the guided ten-step state machine, the rule engine, the coach, audio
// cues and scoring. So far: the event log, the ten-step machine and the coach.
export { ATTEMPT_FORMAT_VERSION, assertJson, compareEvents } from "./events/types";
export type { Attempt, AttemptMode, Json, LabEvent, NewEvent } from "./events/types";
export { newDeviceId } from "./events/store";
export type { EventStore, StoreOptions } from "./events/store";
export { createMemoryStore } from "./events/memory-store";
export { createIndexedDbStore } from "./events/indexeddb-store";
export type { IndexedDbStoreOptions } from "./events/indexeddb-store";
export { replay, resume } from "./events/replay";
export type { Projection, Resumed } from "./events/replay";
export {
  ATTEMPT_FILE_FORMAT,
  exportAttempt,
  importAttempt,
  toAttemptFile,
} from "./events/attempt-file";
export type { AttemptFile } from "./events/attempt-file";
export {
  coachIsOn,
  decide,
  frontier,
  guidedProjection,
  HELP_LEVELS,
  initialGuidedState,
  STEPS,
} from "./steps/machine";
export type { Command, Decision, GuidedState, HelpLevel, Refusal, Step } from "./steps/machine";
export { coach, coachProjection, ESCALATION, helpLevelFor, setSkillLevel } from "./coach/coach";
export type { Advice, CoachState, Escalation, Moment } from "./coach/coach";
export { decideTable, EMPTY_TABLE, MAX_CELL, TABLE_LAYOUTS, tableProjection } from "./table/table";
export type {
  TableCommand,
  TableDecision,
  TableLayout,
  TableRefusal,
  TableState,
} from "./table/table";
export { decideGraph, EMPTY_GRAPH, graphProjection } from "./graph/graph";
export type { GraphCommand, GraphDecision, GraphRefusal, GraphState } from "./graph/graph";
export { answersProjection, EMPTY_ANSWERS, writeAnswer } from "./answers/answers";
export type { AnswersState, WrittenAnswer } from "./answers/answers";
export {
  decideSnapshot,
  EMPTY_SNAPSHOTS,
  eventsBefore,
  figureNumber,
  MAX_CAPTION,
  SNAPSHOT_KINDS,
  snapshotsProjection,
  visibleSnapshots,
} from "./snapshots/snapshots";
export type {
  Snapshot,
  SnapshotCommand,
  SnapshotKind,
  SnapshotPoint,
  SnapshotsState,
} from "./snapshots/snapshots";
export { eventsBeforeStep, redoEvents, runProjection } from "./runs/runs";
export type { RunOrigin } from "./runs/runs";
export {
  decideReport,
  EMPTY_REPORT,
  MAX_SECTION,
  REPORT_FORMATS,
  reportProjection,
} from "./report/report";
export type { ReportCommand, ReportFormat, ReportState } from "./report/report";
export { decideExam, EMPTY_EXAM, examProjection } from "./exam/exam";
export type { ExamCommand, ExamState } from "./exam/exam";
