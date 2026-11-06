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
