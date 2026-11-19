# Claude in the API, streamed to the browser: brief

The first Phase 4 item (master plan, "Claude through the Anthropic Python SDK in the API, streamed
to the browser"), written for review before anything is built. The plan says:

- **AI = Claude from the FastAPI backend** (D8, ADR 0008): online only, never for signed-out users,
  off by default for classes; a teacher turns it on.
- **The key lives only on the server.** Every call is metered per user and per IP, with a daily
  quota; a feature flag switches any AI feature off at once.
- **Claude never computes physics.** Every number comes from the validated models.
- **Student text is data, never instructions; AI calls have no tools; output must match a schema.**

This item is the plumbing that the tutor, what-if scenarios, report review and question drafting
(items 2 and 3) are built on. It ships no screen and makes no call to Claude in production: the
first real feature is the tutor, in item 2. Quotas, answer caching and the admin portal's off
switch are item 4; the evaluation suite is item 5.

- **Status:** approved by Mortey on 2026-11-19: decisions 1 to 7 and the proposed models, as written.

## The decisions

### 1. Who may use AI

One rule in the API, `ai_allowed(principal, feature)`, checked on every AI request before
anything else, and the same rule behind a `GET /ai/status` answer the web app uses to show or
hide AI buttons:

| Who | AI |
| --- | --- |
| Signed out | Never. The request is refused with 401 and nothing reaches Claude. |
| Teacher (signed-in adult) | Yes, for features open to teachers. |
| Student in a class | Only while that class's teacher has AI on (`classes.ai_enabled`, already in the database, off by default). Turned off mid-lesson, the next request is refused. |
| Anyone, when AI is switched off | No (decision 5). |

`GET /ai/status` says `available` or the reason it is not (`signed-out`, `class-off`,
`switched-off`, `not-configured`), so the app can say "Your teacher has not turned AI on for this
class" rather than show a broken button.

### 2. What is sent to Claude, and what never is

Each feature's request is built by one function from a typed context, so nothing reaches the
prompt by accident:

- **Sent:** the experiment and its version, the step, the help level, recent events from the
  attempt (parts placed, readings, findings), numbers already worked out by `packages/physics`
  for that bench, and the student's own question or report text.
- **Never sent:** display names, class names or codes, emails, user or member ids, IP addresses,
  device details, other students' work. Student text is passed inside a marked block the system
  prompt calls data, and is length-limited.
- **Physics:** the prompt carries the numbers; Claude is told to use only those and to say when
  one is missing. Item 2 adds a check that every number in a reply appears in the context.

### 3. The SDK and the models

- The official `anthropic` Python SDK, async client, one per process, created only when the key
  is set. Calls have no tools, a timeout and two retries.
- **The model is a setting per feature**, never typed into code paths. The plan says "small model
  for hints, larger model for report review". Proposed defaults, for Mortey to choose:

| Feature | Proposed model | Price per million tokens (in / out) |
| --- | --- | --- |
| Tutor, what-if | Claude Haiku 5.5 (`claude-haiku-5-5`) | $0.10 / $0.50 |
| Report review, question drafting | Claude Sonnet 5.5 (`claude-sonnet-5-5`) | $2 / $10 |
| Alternative for anything | Claude Opus 5.5 (`claude-opus-5-5`), the most capable | $4 / $20 |

- The stable system prompt is cached (prompt caching), so repeated requests pay a tenth for it.

### 4. Streaming to the browser

- **Server:** `POST /ai/<feature>` answers as Server-Sent Events (`sse-starlette`, as the plan's
  stack table says) with four event types: `text` (a piece of the reply), `done` (token counts and
  whether the reply was cut short), `refused` (the model declined; a plain sentence is shown) and
  `error` (a plain sentence and whether a retry may help). Nothing else is ever sent.
- **Browser:** `streamAi()` in `packages/api-client`, which posts through the web app's existing
  `/api` route with the session cookie, reads the stream and yields typed events, with cancel
  (Stop) and a time limit.
- **Offline first:** AI is never on the lab's critical path. The lab loads and works with the API
  down; `streamAi()` is only called when a student presses an AI button, and a failure shows
  "AI help is not available right now. The coach still works offline."

### 5. Switching AI off

Item 4 builds the admin portal's per-feature switches. This item adds the first one, an
environment setting: `AI_ENABLED=false` (the default) switches every AI feature off, and with no
`ANTHROPIC_API_KEY` set, AI reports `not-configured`. Deployed environments refuse to start with
AI on and no key.

### 6. Logs and retention

A row per AI request (`ai_requests`): feature, model, pseudonymous principal (a keyed hash, not
the id), tokens in and out, cache reads, cost, duration, outcome. No prompt or reply text in this
item. Rows are kept 90 days (the API has no scheduled cleanup yet, so a delete of older rows runs
with each new row until the background jobs arrive) and are counted in the admin portal's AI tile
in item 4. The Legal pack's "AI and acceptable use" policy should say what is sent and kept; I
will list the wording it needs in the pull request for the UEW review, and the Your data page
gains a line.

### 7. Tests, with no key and no bill

- A fake Claude client in the tests (the SDK is never called in CI): the rule in decision 1 for
  every row of the table, nothing personal in a built prompt, the event stream's shape, refusals,
  errors and timeouts, the key never in a log or response.
- `streamAi()` tested against a recorded stream, including a cut connection and Stop.
- One end-to-end test in Playwright against a test-only route (mounted only in local and test, as
  the load test's is), so the browser side is proved without a key.

## What Mortey needs to provide

| Item | When | Expected monthly cost |
| --- | --- | --- |
| An Anthropic API key in a workspace with a monthly spend limit, as a secret (never in the repo) | Before item 2 runs anywhere but tests | Nothing in this item. For the tutor at 1,000 students asking 20 questions a month on Haiku 5.5: about $10. Report review, 4 a month each: about $80 on Sonnet 5.5, or about $4 on Haiku 5.5. |
| The monthly AI budget ceiling (master plan, still open) | Before the pilot | Sets the spend limit above |
| Voice for the tutor's spoken replies | Item 2's brief | Nothing with the browser's own voice; about $300 a month at 100,000 students with a cloud voice (cost model) |

These estimates rest on assumed usage (about 3,000 tokens in and 300 out per tutor question,
6,000 in and 800 out per review) and should be replaced with measured usage after the pilot.

## The pull request

One pull request: the settings, the rule and `GET /ai/status`, the client wrapper, the SSE
endpoint machinery with the test-only route, `ai_requests` and its migration, `streamAi()`, and
the tests. A new ADR, 0043, records the streaming and data rules above. No screen changes, so no
board.

## Not in this item

- Any feature that calls Claude for real (item 2), quotas and answer caching (item 4), the
  evaluation suite (item 5), the teacher's AI switch on the class page (the API already lets a
  teacher set `ai_enabled` and the admin portal shows it; the switch on the teacher's screen
  comes with item 2's board).
