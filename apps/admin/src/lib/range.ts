export const RANGES = [
  { id: "24h", label: "24 h", long: "Last 24 hours" },
  { id: "7d", label: "7 days", long: "Last 7 days" },
  { id: "30d", label: "30 days", long: "Last 30 days" },
] as const;
export type RangeId = (typeof RANGES)[number]["id"];

export function rangeOf(value: string | string[] | undefined): (typeof RANGES)[number] {
  return RANGES.find((r) => r.id === value) ?? RANGES[1];
}
