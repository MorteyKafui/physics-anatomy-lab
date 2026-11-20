interface NetworkInformation {
  saveData?: boolean;
  effectiveType?: string;
}

/**
 * Whether the page should stay still (landing page brief, decision 2): Lite mode's signals (2 GB
 * of memory or less, Save-Data, a 2G connection, a wish for less data) or reduced motion. Call it in an
 * effect, never while rendering, so the server's HTML and the first paint match.
 */
export function stillPage(): boolean {
  if (typeof window === "undefined") return true;
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: NetworkInformation };
  const media = (q: string) => window.matchMedia?.(q).matches ?? false;
  return (
    media("(prefers-reduced-motion: reduce)") ||
    media("(prefers-reduced-data: reduce)") ||
    (nav.deviceMemory !== undefined && nav.deviceMemory <= 2) ||
    nav.connection?.saveData === true ||
    /(^|-)2g$/.test(nav.connection?.effectiveType ?? "")
  );
}
