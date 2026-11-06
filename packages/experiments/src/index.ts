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
