/**
 * The browser security headers for the web app and the admin portal (master plan, "Security,
 * privacy and minors"; ASVS 5.0.0 chapter 3, web frontend security).
 *
 * Two parts:
 * - `securityHeaders()`: the same on every response, so `next.config.ts` sets them, static files
 *   included.
 * - `contentSecurityPolicy()`: new on every page, because it carries that request's nonce. The
 *   app's proxy sets it, and Next adds the nonce to its own scripts (docs/security/asvs-l2.md).
 */

/** Whether the policy is enforced or only reported (the brief ships it as Report-Only first). */
export type CspMode = "enforce" | "report";

export interface CspOptions {
  /** This request's nonce, from `newNonce()`. */
  nonce: string;
  /** `next dev`: React's dev build needs eval for its error overlay. Never in production. */
  dev: boolean;
  /** The page was served over HTTPS, so subresources may be upgraded. */
  https: boolean;
  /** Extra origins a page may frame, such as Cloudflare Turnstile's challenge. */
  frames?: readonly string[];
  /**
   * Sources an `<object>` may show. The print sheets preview their own PDF from a `blob:` URL,
   * which only this origin's scripts can make; plugins from anywhere else stay refused.
   */
  objects?: readonly string[];
}

/** Cloudflare Turnstile loads its script from, and draws its challenge in a frame on, this origin. */
export const TURNSTILE_ORIGIN = "https://challenges.cloudflare.com";

/** A random 128-bit nonce, base64. A new one for every page. */
export function newNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

/**
 * The policy, as one header value.
 *
 * - Scripts run only with this page's nonce. `'strict-dynamic'` lets a script with the nonce load
 *   the app's other chunks (and Turnstile's script), so no list of hosts is needed.
 * - Styles allow `'unsafe-inline'`: React writes `style` attributes for the bench and the graphs,
 *   and a nonce cannot cover an attribute. Injected CSS cannot run code, so the gain from going
 *   further is small (recorded in the ASVS checklist).
 * - Everything else is this origin only. The page cannot be framed, and plugins (except the
 *   `objects` asked for) and `<base>` are refused.
 */
export function contentSecurityPolicy({
  nonce,
  dev,
  https,
  frames = [],
  objects = [],
}: CspOptions): string {
  const directives: [string, ...string[]][] = [
    ["default-src", "'self'"],
    ["script-src", `'nonce-${nonce}'`, "'strict-dynamic'", ...(dev ? ["'unsafe-eval'"] : [])],
    ["style-src", "'self'", "'unsafe-inline'"],
    ["img-src", "'self'", "data:", "blob:"],
    ["font-src", "'self'"],
    ["connect-src", "'self'"],
    ["media-src", "'self'", "blob:"],
    ["worker-src", "'self'"],
    ["manifest-src", "'self'"],
    ["frame-src", ...(frames.length > 0 ? frames : ["'none'"])],
    ["object-src", ...(objects.length > 0 ? objects : ["'none'"])],
    ["base-uri", "'none'"],
    ["form-action", "'self'"],
    ["frame-ancestors", "'none'"],
  ];
  const policy = directives.map((d) => d.join(" "));
  if (https) policy.push("upgrade-insecure-requests");
  return policy.join("; ");
}

/** The header the policy goes in, for the mode. */
export function cspHeaderName(mode: CspMode): string {
  return mode === "enforce" ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only";
}

/** Reads `CSP_MODE`; anything but `enforce` reports only. */
export function cspMode(value: string | undefined): CspMode {
  return value === "enforce" ? "enforce" : "report";
}

/**
 * Features no page uses, switched off so a script that gets in cannot ask for them. The lab
 * speaks (speech synthesis needs no permission) but never listens (D19: no recording of voices).
 */
const NO_FEATURES = [
  "accelerometer",
  "browsing-topics",
  "camera",
  "display-capture",
  "geolocation",
  "gyroscope",
  "hid",
  "magnetometer",
  "microphone",
  "midi",
  "payment",
  "publickey-credentials-get",
  "serial",
  "usb",
];

/** The headers that are the same on every response. */
export function securityHeaders(): { key: string; value: string }[] {
  return [
    // Two years, subdomains too. Not on the preload list until the domain is settled.
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: [...NO_FEATURES.map((f) => `${f}=()`), "fullscreen=(self)"].join(", "),
    },
    // For browsers without frame-ancestors.
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  ];
}
