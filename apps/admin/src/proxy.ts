import { NextResponse, type NextRequest } from "next/server";

import { contentSecurityPolicy, cspHeaderName, cspMode, newNonce } from "@pa/security";

/**
 * Every page gets a new nonce and a Content Security Policy that names it
 * (docs/security/asvs-review-brief.md, option A). Next reads the policy from the request and adds
 * the nonce to its own scripts; the response carries the same policy to the browser.
 * `CSP_MODE=enforce` turns it from Report-Only to enforced.
 */
export function proxy(request: NextRequest) {
  const nonce = newNonce();
  const policy = contentSecurityPolicy({
    nonce,
    dev: process.env.NODE_ENV === "development",
    https: request.nextUrl.protocol === "https:",
  });
  const header = cspHeaderName(cspMode(process.env.CSP_MODE));

  const headers = new Headers(request.headers);
  headers.set(header, policy);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set(header, policy);
  return response;
}

export const config = {
  matcher: [
    {
      // Pages only: not Next's static files, and not the router's prefetches, which carry no
      // scripts.
      source: "/((?!_next/static|_next/image|favicon\\.ico|icon\\.svg).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
