/**
 * The landing page's sign-up and join forms hand what was typed to /sign-in and /join through
 * this tab's session storage: an email or a class code never goes in a URL, where it would land in
 * history and server logs. Storage can be blocked; then the next screen simply asks again.
 */
const KEY = { email: "pa.handoff.email", code: "pa.handoff.code" } as const;

export function handOver(kind: keyof typeof KEY, value: string) {
  try {
    sessionStorage.setItem(KEY[kind], value);
  } catch {
    // Blocked storage: the next screen asks again.
  }
}

/** What was handed over, once: reading it clears it. */
export function takeOver(kind: keyof typeof KEY): string {
  try {
    const value = sessionStorage.getItem(KEY[kind]) ?? "";
    sessionStorage.removeItem(KEY[kind]);
    return value;
  } catch {
    return "";
  }
}
