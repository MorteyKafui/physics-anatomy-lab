# Services

Owner, account, plan and what fails if each service is down. Filled in as accounts are created
in Phase 0 (master plan, "Services inventory"). Secrets live in the provider's secret store,
never in this repository.

| Service                | Used for                                                                | Owner  | Plan      | If it is down                                                      |
| ---------------------- | ----------------------------------------------------------------------- | ------ | --------- | ------------------------------------------------------------------ |
| GitHub                 | Code, pull requests, Actions                                            | Mortey | to choose | No deploys; the live site keeps running                            |
| Cloudflare             | DNS, Workers (web), Containers (API), R2, WAF, Turnstile, Access, Email | Mortey | to choose | Site and API down                                                  |
| Neon                   | PostgreSQL 18, point-in-time recovery, preview branches                 | Mortey | to choose | Sign-in, sync and live classes stop; the offline lab keeps working |
| Anthropic              | AI tutor, scenarios, report review                                      | Mortey | to choose | AI features show "unavailable"; nothing else is affected           |
| Sentry                 | Errors and performance                                                  | Mortey | to choose | We stop seeing errors                                              |
| PostHog                | Product analytics with consent                                          | Mortey | to choose | No analytics                                                       |
| Uptime and status page | Alerts and the public status light                                      | Mortey | to choose | The footer status light cannot update                              |
| Renovate               | Dependency updates                                                      | Mortey | free      | Updates pause                                                      |

## What a deployed API refuses to start without

`apps/api/app/config.py` checks its settings when it starts and fails closed. On a server:

- **`ENVIRONMENT`** is `preview`, `staging` or `production`. `local` and `test` start only when
  `WEB_ORIGIN` is on this machine (`localhost`, `127.0.0.1`, `::1` or `*.localhost`). A server
  whose `ENVIRONMENT` was forgotten would otherwise run as `local`, with the test-only sign-in
  route and every check below off.
- **`WEB_ORIGIN`** starts with `https://`, so the session cookie is `Secure` and `__Host-`.
- **`EMAIL_DELIVERY`** is `resend` (with `RESEND_API_KEY`) or `none`, never `log`.
- **`CLIENT_IP_HEADER`** is set (`cf-connecting-ip` behind Cloudflare).
- **`TURNSTILE_SECRET_KEY`** is set.
- **`ADMIN_DEV_BYPASS_EMAIL`** is not set.
- With the admin API set up (**`CF_ACCESS_TEAM_DOMAIN`** and **`CF_ACCESS_AUDIENCE`**):
  **`ADMIN_STAFF_EMAILS`**, the staff who may use the portal.
- With **`AI_ENABLED`**: `ANTHROPIC_API_KEY`, `AI_LOG_KEY` and `AI_DAILY_BUDGET_USD`.
