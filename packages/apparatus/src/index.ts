// @pa/apparatus: the Anatomy kit and the figure for every part of every apparatus.
export { BENCH_VIEWBOX, PendulumBench, slotPoint, snapSlot, SNAP_RADIUS } from "./pendulum-bench";
export type { PendulumBenchProps } from "./pendulum-bench";
export { lensViewBox, Magnifier } from "./magnifier";
export type { MagnifierProps } from "./magnifier";
export {
  CIRCUIT_FIGURE,
  CIRCUIT_VIEWBOX,
  CircuitBench,
  jockeyPoint,
  TERMINAL_POINTS,
  terminalPoint,
  WIRE,
  wireX,
} from "./circuit-bench";
export type { CircuitBenchProps } from "./circuit-bench";
export {
  benchX,
  EyeView,
  OPTICAL_VIEWBOX,
  OpticalBench,
  PinsBench,
  RULE,
  ScreenFace,
} from "./optical-bench";
export type {
  EyeViewProps,
  OpticalBenchProps,
  PinsBenchProps,
  ScreenFaceProps,
} from "./optical-bench";
export { CALORIMETER_VIEWBOX, Calorimeter, ThermometerTrace, TRACE_VIEWBOX } from "./calorimeter";
export type { CalorimeterProps, ThermometerTraceProps } from "./calorimeter";
export { HOT_SOLID_VIEWBOX, HotSolidBench } from "./hot-solid-bench";
export type { HotSolidBenchProps } from "./hot-solid-bench";
