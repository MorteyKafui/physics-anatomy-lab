# 0046. Pages render on each request, for a nonce Content Security Policy

- Status: accepted (Mortey, 2026-11-25, in chat, approving option A of the ASVS review brief)
- Date: 2026-11-25
- Builds on: the master plan's controls table ("a strict Content Security Policy with nonces")
  and `docs/security/asvs-review-brief.md`

## Context

The plan asks for a strict Content Security Policy with nonces. In Next 16 a nonce is new on
every request, and Next adds it to its scripts only while it renders a page. A page prerendered
at build time has no nonce, so its scripts would be blocked.

## Decision

- **Every page of the web app and the admin portal renders on its request.** Each root layout
  awaits `connection()`. File routes (icons, the manifest, social cards) stay prerendered.
- **The proxy** (`src/proxy.ts` in each app) makes a 128-bit nonce for every page and sets the
  policy from `@pa/security` on the request, where Next reads it, and on the response.
- **The policy:** scripts only with the nonce, plus what they load (`'strict-dynamic'`); no
  eval outside `next dev`; styles may be inline (React writes `style` attributes); everything
  else from this origin only; no framing; Turnstile's frame only on sign-in and join; the print
  sheets' own PDF in an `<object>` from `blob:`.
- **The fixed headers** (HSTS, `nosniff`, Referrer-Policy, Permissions-Policy, X-Frame-Options,
  COOP, CORP) are set in `next.config.ts`, so static files carry them too. The API adds its own
  (`app/security_headers.py`), with `Cache-Control: no-store` unless a route sets one.
- **Report-Only first.** `CSP_MODE=enforce` switches it on. The next pull request enforces it,
  once a release has shown no violations.
- **The offline pack is unchanged.** The service worker's list now comes from Next's list of
  pages (`app-path-routes-manifest.json`), each dynamic page expanded by its own
  `generateStaticParams`. The worker fetches every page when it installs, so each saved page
  keeps the nonce and policy it came with.
- **Files a page needs are bundled.** The legal texts and the people lists are imported with
  `?raw` (a Turbopack rule), because a page rendered on a Worker has no files to read.

## Consequences

- Cloudflare cannot cache the HTML, so each page costs a render on a Worker. Scripts, styles and
  fonts are still cached by name. The landing page's LCP is measured in the pull request.
- A page module's top-level code runs on the server when it loads, not once at build. The
  people lists are still checked when the module loads, which the build does.
- Partial prerendering and `"use cache"` on whole pages are ruled out while nonces are used.
- **When to change this:** if the landing page's LCP on the emulated benchmark phone goes over
  2.5 s, or Workers' render cost becomes a real share of the running costs, consider hashes
  (Next's experimental SRI) for the public pages and keep nonces for signed-in pages.

## Alternatives considered

- **Nonces only on signed-in pages** (option B in the brief). Keeps public pages static, but they
  would need `'unsafe-inline'` scripts. Mortey chose A.
- **Next's experimental SRI with hashes.** Keeps static pages, but is experimental and does not
  cover Next's inline scripts.
