# 0043. Claude from the API, streamed to the browser

- Status: accepted (Mortey approved the brief, `docs/content/ai-api-brief.md`, on 2026-11-19)
- Date: 2026-11-19
- Builds on: [0008](./0008-ai-from-the-api.md), [0011](./0011-accounts-optional.md),
  [0038](./0038-sign-in-sessions-and-class-codes.md), and the master plan's "Reports, insights
  and AI" section

## Context

Phase 4 adds the tutor, what-if scenarios, report review and question drafting. All four call
Claude, and all four must keep the same promises: no AI for signed-out users, off by default for
classes, nothing personal sent, no number from the model, the key only on the server, and the lab
working with no connection. This record fixes the plumbing they share, so each feature cannot
get one of those wrong on its own.

## Decision

### Who may use AI

One rule, `why_unavailable` in `apps/api/app/ai/policy.py`, checked on every AI request before
anything reaches Claude:

- signed out: never (401);
- a teacher: yes;
- a student: only while their class has `ai_enabled` (off by default), and never question
  drafting (403);
- nobody while `AI_ENABLED` is off (the default) or `ANTHROPIC_API_KEY` is unset (503).

`GET /ai/status` gives the same answer with a reason (`signed-out`, `class-off`,
`switched-off`, `not-configured`), a sentence to show, and the features this person may use.
Deployed servers refuse to start with AI on and no key, or no `AI_LOG_KEY`.

### What is sent

Every request is built by `build_request` from an `AiContext` (`apps/api/app/ai/context.py`):
the experiment and its version, the step, the help level, up to 40 recent events and up to 40
quantities worked out by `packages/physics`, and the student's text (up to 2,000 characters).

- The context refuses any field it does not list, so a name, class, code, email or id cannot be
  added by mistake. Event details hold only numbers, switches and slugs, never free text.
- The student's text goes inside a `<student_text>` block that the system prompt calls data;
  anything that could close the block early is removed.
- The system prompt tells Claude to use only the given quantities and to say when one is missing.
  The fixed part of the prompt is cached.

### The SDK

- The official `anthropic` Python SDK (async), one client per process, made only when the key is
  set. No tools. A 30-second timeout and two retries. Effort per feature (`low` for the tutor and
  what-if, `medium` for report review and question drafting).
- The model is a setting per feature: Claude Haiku 5.5 for the tutor and what-if, Claude Sonnet
  5.5 for report review and question drafting, as approved.
- On Sonnet 5.5 and Opus 5.5 requests ask for the server-side refusal fallback
  (`fallbacks: "default"`), so a false refusal is retried on another model inside the same call.
  Haiku 5.5 has none; a refusal there ends as `refused`.

### The stream

`POST /ai/<feature>` answers as Server-Sent Events (`sse-starlette`), with four events only:

| Event     | Data                   | Meaning                                    |
| --------- | ---------------------- | ------------------------------------------ |
| `text`    | `{"text"}`             | A piece of the reply, in order             |
| `done`    | `{"cut_short"}`        | Complete, or cut at the length limit       |
| `refused` | `{"message"}`          | The model declined; discard any text shown |
| `error`   | `{"message", "retry"}` | No reply; whether trying later may help    |

Exactly one of `done`, `refused` or `error` ends every stream; a reply has 90 seconds. A refusal
by the rule comes before the stream, as a plain HTTP error. In the browser, `streamAi()`
(`packages/api-client/src/ai.ts`) reads the stream and turns every failure (offline, cut off, too
slow) into an `error` event with a sentence; Stop ends it quietly. The bytes in
`packages/api-client/test/fixtures/ai-stream.txt` are checked by both the API's test and the
client's, so the two sides cannot drift apart.

### Offline first

Nothing in the lab calls AI on its own. `streamAi()` runs only when a person presses an AI
button, and every failure says that the coach still works offline.

### The log

One row per request in `ai_requests`: feature, model, teacher or student, a pseudonym
(HMAC-SHA256 of the person's id under `AI_LOG_KEY`), tokens in, out, cache read and cache write,
cost in millionths of a dollar from the published prices (`app/ai/prices.py`), duration and how it
ended (`done`, `cut-short`, `refused`, `error`, `cancelled`). No prompt or reply text, no foreign
key to the person. Rows are kept 90 days; until the API has scheduled jobs, each new row deletes
the old ones. Without the key the pseudonyms cannot be tied back to a person.

### Tests

CI never calls Claude: `get_claude` and `get_ai_log` are replaced by fakes, and the SDK wrapper is
tested against a recorded Messages stream through a mock transport. A test-only route
(`/test-only/ai/<feature>`, local and test only, not in OpenAPI) streams a reply through the same
path the features will use.

## Consequences

- Each feature in items 2 and 3 adds only its route, its fixed instructions and its own checks
  (item 2 checks every number in a reply against the context).
- Quotas per person and per address, answer caching and the admin portal's per-feature switches
  are item 4; until then `AI_ENABLED` is the one switch.
- A student who deletes their work leaves pseudonymous log rows for up to 90 days. They hold no
  text and cannot be read back without the key.

## Amendment, 2026-11-19: the tutor's held replies

The tutor (`POST /ai/tutor`, `docs/content/ai-tutor-brief.md`) checks every number in its reply
when the reply ends (`apps/api/app/ai/numbers.py`). A reply with a number that is not in the
context, the student's words or plain counting ends with `refused` and the message that it has
been hidden, and is logged with a new outcome, `held` (migration 0007). The stream's four events
are unchanged. A tutor request also carries the thread so far (`thread`, at most ten turns,
student and tutor in turn), which the device keeps in memory only.
