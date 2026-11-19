const whole = new Intl.NumberFormat("en-GB");

export const n = (value: number) => whole.format(value);

export function percent(part: number, of: number): string {
  return of > 0 ? `${String(Math.round((part / of) * 100))}%` : "–";
}

export function bytes(value: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let v = value;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]!}`;
}

const dateTime = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});
const date = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/** Times are shown in UTC (which is Ghana's time all year), with the zone said. */
export const when = (iso: string | number) => `${dateTime.format(new Date(iso))} UTC`;
export const day = (iso: string | number) => date.format(new Date(iso));

export function initials(email: string): string {
  const name = email.split("@")[0] ?? "";
  const parts = name.split(/[._-]+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0]![0]! + parts[1]![0]! : name.slice(0, 2);
  return letters.toUpperCase();
}
