# ASVS Level 2 review and external penetration test: brief

The first Phase 6 item (master plan, "Hardening and pilot"), written for review before anything
is built. The plan says OWASP ASVS Level 2 is the checklist where data is kept, every feature has
a short threat model, and an external penetration test is commissioned before wider rollout
("Security, privacy and minors").

- **Status:** approved by Mortey on 2026-11-25, with option A (nonces on every page), ASVS 5.0.0, and the item unticked until the pen test is done.

## What this item delivers

1. **The checklist**, `docs/security/asvs-l2.md`. Every ASVS 5.0.0 requirement at Levels 1 and 2,
   one row each: pass, fail, not applicable, or "for the tester". Each row names its evidence
   (a file and line, or the test that proves it). A fail links the pull request that fixes it.
2. **A threat model**, `docs/security/threat-model.md`. The assets (children's work, teacher
   emails, sessions, the AI budget, the admin portal), who might attack them, the trust
   boundaries (browser, Cloudflare, web server, API, PostgreSQL, Anthropic, Resend, Google), and
   what stops each attack. The features built before this rule was followed get theirs here.
3. **Fixes as pull requests**, one per area, each with a test that fails before the fix.
4. **The tester's brief**, `docs/security/pentest-brief.md`. The scope, the rules of engagement,
   the test accounts, what we hand over, what we want back, and the retest.
5. **A responsible disclosure page.** The Legal Pack's "AI and Acceptable Use" includes a
   disclosure policy. It is published at `/security`, with `/.well-known/security.txt`
   (RFC 9116). There is no board for it yet: I would draft `Security.dc.html` first (it is a
   text page in the style of `/terms`).

## What a first look found

Two gaps from the plan's own controls table, found before the full review:

- **No security headers on the web or admin apps.** Neither `next.config.ts` sets a Content
  Security Policy, HSTS, `frame-ancestors`, Permissions-Policy, `nosniff` or Referrer-Policy.
  The plan asks for all of them.
- **GitHub Actions are pinned by tag, not by commit SHA.** For example, `actions/checkout@v7`.
  The plan asks for SHA pins. Renovate can keep them current.

Already in place, and checked again in the review: hashed session tokens in HttpOnly cookies,
the origin check against CSRF, rate limits, Turnstile, body size limits, Cloudflare Access
checked on every admin call, gitleaks and osv-scanner in CI.

## Decisions for you

### 1. The Content Security Policy: nonces or not

The plan says "a strict Content Security Policy with nonces". In Next 16 a nonce has to be new
on every request, so **every page becomes dynamic**: no static pages, and Cloudflare cannot cache
the HTML. That costs time on slow 4G (the landing page's LCP budget is 2.5 s; it is about 1.0 s
now). The offline lab is not affected, because the service worker serves the saved page with the
nonce it came with.

- **A (recommended).** Nonces everywhere, as the plan says. The policy ships first as
  `Report-Only` for one pull request, and I measure LCP on the emulated benchmark phone before
  and after. If the landing page goes over budget, I stop and bring you the numbers.
- **B.** Nonces only on signed-in pages (`/teach`, `/settings`, `/sign-in`, `/join`). Public
  pages stay static, with a policy that allows the app's own inline scripts. That is weaker on
  the pages without sessions, which is where the harm is smallest.

### 2. Which version of ASVS

ASVS 5.0.0 (May 2025) is the current version and renumbers everything from 4.0.3. **I would use
5.0.0**, so the tester and the checklist use the same numbers.

### 3. How the item is ticked

The pen test needs a person and a staging server, so, as with Phase 3's k6 item, **the item
stays unticked** until the tester's report is in and its findings are fixed. The checklist, the
fixes and the tester's brief are merged before that. I then go on to item 2.

## Pull requests

1. This brief.
2. Security headers and the CSP, with tests that read the headers of every route.
3. Actions pinned by SHA, and Renovate set to update the pins.
4. Any further fixes the review finds, one area each.
5. The checklist, the threat model, the tester's brief and the disclosure page (after its board
   is approved).

## What needs a person, an account or money

| Need                                                                | Why                                                                  | Rough cost                                                                                                                                                                                                   |
| ------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A staging environment (Cloudflare Workers, Neon, the API container) | The tester and the k6 run both need it; neither may touch production | About US$25–50 a month (Workers paid plan US$5, Neon Launch about US$19, a small container)                                                                                                                  |
| An external penetration tester                                      | The plan asks for one before wider rollout                           | About 5 to 8 tester days for the web app, API, sockets and admin portal. International firms (CREST or OSCP testers) often quote US$6,000–15,000 for that. A Ghanaian firm may quote less. Get three quotes. |
| A retest after the fixes                                            | Confirms each finding is closed                                      | Often 1 to 2 days, sometimes included in the first quote                                                                                                                                                     |
| A security contact address                                          | For `security.txt` and the disclosure page                           | The domain's email, once the domain is bought                                                                                                                                                                |

Ways to spend less: ask UEW's or KNUST's computer science department whether a supervised
student team or a staff member will test it; or ask a firm for a reduced rate for an education
project for schools. A free scan (OWASP ZAP, which I run myself in this item) does not replace a
person.

## Risks

- A nonce CSP can break third-party scripts that load later (Sentry, PostHog, Turnstile). Each is
  added to the policy by name, and Report-Only catches the rest before it is enforced.
- The tester needs realistic data. Staging gets synthetic classes and display names made by a
  seed script, never children's data.
