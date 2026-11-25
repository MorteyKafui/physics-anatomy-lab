import { NextResponse, type NextRequest } from "next/server";

import {
  contentSecurityPolicy,
  cspHeaderName,
  cspMode,
  newNonce,
  TURNSTILE_ORIGIN,
} from "@pa/security";

/** Turnstile is drawn only on the screens that ask for it (src/app/_access/turnstile.tsx). */
const WITH_TURNSTILE = /^\/(sign-in|join)(\/|$)/;

/**
 * Every page gets a new nonce and a Content Security Policy that names it (ASVS brief, option A).
 * Next reads the policy from the request, adds the nonce to its own scripts, and the response
 * carries the same policy to the browser. `CSP_MODE=enforce` turns it from Report-Only to enforced.
 */
export function proxy(request: NextRequest) {
  const nonce = newNonce();
  const policy = contentSecurityPolicy({
    nonce,
    dev: process.env.NODE_ENV === "development",
    https: request.nextUrl.protocol === "https:",
    frames: WITH_TURNSTILE.test(request.nextUrl.pathname) ? [TURNSTILE_ORIGIN] : [],
    // The print sheets preview their PDF in an <object> (src/app/lab/sheets/screen.tsx).
    objects: ["blob:"],
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
      // Pages only: not the API, Next's static files, the service worker, icons or fonts, and
      // not the router's prefetches, which carry no scripts.
      source:
        "/((?!api/|_next/static|_next/image|sw\\.js|favicon\\.ico|icon\\.svg|icons/|fonts/|manifest\\.webmanifest).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
