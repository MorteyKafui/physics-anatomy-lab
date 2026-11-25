import { describe, expect, test } from "bun:test";

import {
  contentSecurityPolicy,
  cspHeaderName,
  cspMode,
  newNonce,
  securityHeaders,
  TURNSTILE_ORIGIN,
} from "../src";

const directives = (policy: string) =>
  new Map(
    policy.split("; ").map((d) => {
      const [name, ...values] = d.split(" ");
      return [name!, values];
    }),
  );

describe("the content security policy", () => {
  const nonce = newNonce();
  const prod = directives(contentSecurityPolicy({ nonce, dev: false, https: true }));

  test("scripts run only with the page's nonce, and never eval in production", () => {
    expect(prod.get("script-src")).toEqual([`'nonce-${nonce}'`, "'strict-dynamic'"]);
    expect(prod.get("script-src")).not.toContain("'unsafe-inline'");
    expect(prod.get("script-src")).not.toContain("'unsafe-eval'");
  });

  test("dev adds eval for React's error overlay, and only dev", () => {
    const dev = directives(contentSecurityPolicy({ nonce, dev: true, https: false }));
    expect(dev.get("script-src")).toContain("'unsafe-eval'");
  });

  test("the page cannot be framed, and plugins and <base> are refused", () => {
    expect(prod.get("frame-ancestors")).toEqual(["'none'"]);
    expect(prod.get("object-src")).toEqual(["'none'"]);
    expect(prod.get("base-uri")).toEqual(["'none'"]);
    expect(prod.get("frame-src")).toEqual(["'none'"]);
  });

  test("Turnstile's frame is allowed only where it is asked for", () => {
    const p = directives(
      contentSecurityPolicy({ nonce, dev: false, https: true, frames: [TURNSTILE_ORIGIN] }),
    );
    expect(p.get("frame-src")).toEqual([TURNSTILE_ORIGIN]);
  });

  test("upgrades subresources only over HTTPS, so local http runs still load", () => {
    expect(prod.has("upgrade-insecure-requests")).toBe(true);
    const local = directives(contentSecurityPolicy({ nonce, dev: false, https: false }));
    expect(local.has("upgrade-insecure-requests")).toBe(false);
  });
});

describe("nonces", () => {
  test("are 128 bits of base64 and new every time", () => {
    const seen = new Set(Array.from({ length: 1000 }, newNonce));
    expect(seen.size).toBe(1000);
    for (const n of seen) expect(atob(n)).toHaveLength(16);
  });
});

describe("the mode", () => {
  test("reports unless told to enforce", () => {
    expect(cspMode(undefined)).toBe("report");
    expect(cspMode("yes")).toBe("report");
    expect(cspMode("enforce")).toBe("enforce");
    expect(cspHeaderName("report")).toBe("Content-Security-Policy-Report-Only");
    expect(cspHeaderName("enforce")).toBe("Content-Security-Policy");
  });
});

describe("the fixed headers", () => {
  const h = new Map(securityHeaders().map(({ key, value }) => [key, value]));

  test("cover HSTS, sniffing, referrers, framing and window openers", () => {
    expect(h.get("Strict-Transport-Security")).toBe("max-age=63072000; includeSubDomains");
    expect(h.get("X-Content-Type-Options")).toBe("nosniff");
    expect(h.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(h.get("X-Frame-Options")).toBe("DENY");
    expect(h.get("Cross-Origin-Opener-Policy")).toBe("same-origin");
  });

  test("switch off the microphone and camera (D19: no recording of voices)", () => {
    const pp = h.get("Permissions-Policy")!;
    expect(pp).toContain("microphone=()");
    expect(pp).toContain("camera=()");
    expect(pp).toContain("fullscreen=(self)");
  });
});
