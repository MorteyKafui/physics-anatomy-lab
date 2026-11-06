// @pa/engine: the event log, the guided ten-step state machine, the rule engine, the coach, audio
// cues and scoring. So far: the event log (attempts, stores, exact resume) and the ten-step machine.
export { ATTEMPT_FORMAT_VERSION, assertJson, compareEvents } from "./events/types";
export type { Attempt, AttemptMode, Json, LabEvent, NewEvent } from "./events/types";
export { newDeviceId } from "./events/store";
export type { EventStore, StoreOptions } from "./events/store";
export { createMemoryStore } from "./events/memory-store";
export { createIndexedDbStore } from "./events/indexeddb-store";
export type { IndexedDbStoreOptions } from "./events/indexeddb-store";
export { replay, resume } from "./events/replay";
export type { Projection, Resumed } from "./events/replay";
export { ATTEMPT_FILE_FORMAT, exportAttempt, importAttempt } from "./events/attempt-file";
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
