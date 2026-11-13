/**
 * Units a student can record in. Each table column has a quantity kind; the student picks the
 * unit (cm or m, g or kg) and every calculation converts to SI first. Harvested from Physics
 * Bench and extended for the v1 experiments (pendulum, Ohm's law and the potentiometer, the
 * converging lens, the method of mixtures).
 */

export type QuantityKind =
  | "length"
  | "inverse-length"
  | "area"
  | "volume"
  | "mass"
  | "time"
  | "time-squared"
  | "frequency"
  | "angle"
  | "temperature"
  | "temperature-difference"
  | "inverse-temperature-difference"
  | "current"
  | "voltage"
  | "resistance"
  | "force"
  | "energy"
  | "heat-capacity"
  | "specific-heat-capacity"
  | "count";

export interface UnitDef {
  symbol: string;
  /** Multiply a value in this unit by `toSI` to get SI. */
  toSI: number;
  /** Added after scaling, for temperatures read on a scale with a different zero. */
  offset?: number;
}

export const UNITS: Readonly<Record<QuantityKind, readonly UnitDef[]>> = {
  length: [
    { symbol: "m", toSI: 1 },
    { symbol: "cm", toSI: 1e-2 },
    { symbol: "mm", toSI: 1e-3 },
  ],
  // 1/u and 1/v for the lens; a lens's power in dioptres is in m⁻¹.
  "inverse-length": [
    { symbol: "m⁻¹", toSI: 1 },
    { symbol: "cm⁻¹", toSI: 1e2 },
  ],
  area: [
    { symbol: "m²", toSI: 1 },
    { symbol: "cm²", toSI: 1e-4 },
    { symbol: "mm²", toSI: 1e-6 },
  ],
  volume: [
    { symbol: "m³", toSI: 1 },
    { symbol: "cm³", toSI: 1e-6 },
    { symbol: "ml", toSI: 1e-6 },
    { symbol: "l", toSI: 1e-3 },
  ],
  mass: [
    { symbol: "kg", toSI: 1 },
    { symbol: "g", toSI: 1e-3 },
  ],
  time: [
    { symbol: "s", toSI: 1 },
    { symbol: "ms", toSI: 1e-3 },
    { symbol: "min", toSI: 60 },
  ],
  // T² for the pendulum graph.
  "time-squared": [{ symbol: "s²", toSI: 1 }],
  frequency: [
    { symbol: "Hz", toSI: 1 },
    { symbol: "kHz", toSI: 1e3 },
  ],
  angle: [
    { symbol: "°", toSI: Math.PI / 180 },
    { symbol: "rad", toSI: 1 },
  ],
  // A reading on a thermometer: 0 °C is 273.15 K.
  temperature: [
    { symbol: "°C", toSI: 1, offset: 273.15 },
    { symbol: "K", toSI: 1 },
  ],
  // A change in temperature, such as a rise in the method of mixtures: 1 °C of change is 1 K,
  // with no offset. Using "temperature" here would add 273.15 to the rise.
  "temperature-difference": [
    { symbol: "°C", toSI: 1 },
    { symbol: "K", toSI: 1 },
  ],
  // 1/T for the method of mixtures' graph of V against 1/T.
  "inverse-temperature-difference": [
    { symbol: "°C⁻¹", toSI: 1 },
    { symbol: "K⁻¹", toSI: 1 },
  ],
  current: [
    { symbol: "A", toSI: 1 },
    { symbol: "mA", toSI: 1e-3 },
  ],
  voltage: [
    { symbol: "V", toSI: 1 },
    { symbol: "mV", toSI: 1e-3 },
  ],
  resistance: [
    { symbol: "Ω", toSI: 1 },
    { symbol: "kΩ", toSI: 1e3 },
  ],
  force: [
    { symbol: "N", toSI: 1 },
    { symbol: "mN", toSI: 1e-3 },
  ],
  energy: [
    { symbol: "J", toSI: 1 },
    { symbol: "kJ", toSI: 1e3 },
  ],
  "heat-capacity": [{ symbol: "J K⁻¹", toSI: 1 }],
  "specific-heat-capacity": [
    { symbol: "J kg⁻¹ K⁻¹", toSI: 1 },
    { symbol: "J g⁻¹ K⁻¹", toSI: 1e3 },
  ],
  count: [{ symbol: "", toSI: 1 }],
};

export function findUnit(kind: QuantityKind, symbol: string): UnitDef | undefined {
  return UNITS[kind].find((u) => u.symbol === symbol);
}

function unitOrThrow(kind: QuantityKind, symbol: string): UnitDef {
  const unit = findUnit(kind, symbol);
  if (!unit) throw new RangeError(`Unknown unit "${symbol}" for ${kind}`);
  return unit;
}

export function toSI(value: number, kind: QuantityKind, symbol: string): number {
  const unit = unitOrThrow(kind, symbol);
  return value * unit.toSI + (unit.offset ?? 0);
}

export function fromSI(value: number, kind: QuantityKind, symbol: string): number {
  const unit = unitOrThrow(kind, symbol);
  return (value - (unit.offset ?? 0)) / unit.toSI;
}

/**
 * When a value looks recorded in a different unit from the rest of its column (45.3 among 0.62
 * and 0.58), return the factor it is out by. It works on the order of magnitude, so a column's
 * natural spread (a 2:1 range of lengths) never looks like a slip.
 */
export function suspectedUnitSlip(value: number, typical: number): 10 | 100 | 1000 | undefined {
  if (value === 0 || typical === 0) return undefined;
  const orders = Math.log10(Math.abs(value / typical));
  const nearest = Math.round(Math.abs(orders));
  if (nearest < 1 || nearest > 3 || Math.abs(Math.abs(orders) - nearest) > 0.4) return undefined;
  return (10 ** nearest) as 10 | 100 | 1000;
}
