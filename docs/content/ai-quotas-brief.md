# Quotas, caching and feature flags: brief

The fourth Phase 4 item (master plan, "Quotas, caching, feature flags"), written for review before
anything is built. It is what lets AI be switched on for real: until it merges, AI stays off on
every deployed server (item 2, decision 1). The plan says:

- every call is metered per user and per IP, with a daily quota;
- small model for hints, larger model for report review; prompt caching; answers cached by
  experiment, step and mistake;
- a feature flag switches any AI feature off instantly;
- the admin portal's AI page: requests, cost per feature, cache hit rate, evaluation results,
  flagged replies, the off switch; an alert when AI spend passes the daily budget.

The models per feature and prompt caching are already in place (items 1 and 2).

- **Status:** approved by Mortey on 2026-11-19: decisions 1 to 7 as proposed. The quotas are the
  table's; the daily budget is the monthly AI ceiling ÷ 30, set when the ceiling is chosen; the
  switches are in our own database.

## The decisions

### 1. Daily quotas, per person

Counted from the AI request log (`ai_requests`, by pseudonym and feature, since midnight in
Ghana, which is UTC). A request over its quota is refused before anything reaches Claude, with
one plain line ("You have used today's AI help for the tutor. The coach still works.") and the
time it resets. Replies served from the cache (decision 3) do not count.

| Feature           | Student, per day | Teacher, per day                     |
| ----------------- | ---------------- | ------------------------------------ |
| Tutor             | 30 questions     | 60                                   |
| What if           | 15               | 30                                   |
| Report review     | 5                | 20                                   |
| Question drafting | none             | 20 (replaces item 3's interim limit) |

They are settings, so they can change without a release.

### 2. Per address, and a daily budget

- **Per address:** at most 1,500 AI requests a day from one network address (a school's whole lab
  often shares one), counted in the existing rate-limit table. It catches a script, not a class.
- **A daily spend budget** (`AI_DAILY_BUDGET_USD`): when the day's cost in the log passes it, AI
  switches itself off until midnight for everyone, with the line "AI help has reached today's
  limit. The coach still works." The portal shows it, and the alert fires (master plan,
  "Alerts"). The budget is the monthly AI ceiling (still open in the plan) ÷ 30. A deployed
  server with AI on refuses to start without it.

### 3. Caching answers

- **Prompt caching** of the fixed system text stays (items 1 and 2).
- **What if:** a question asked again for the same experiment and version (compared after
  lowercasing and squashing spaces) gets the same checked scenario from the cache. Scenarios
  hold nothing personal.
- **Tutor:** the first reply on a step is cached by experiment, version, step, the latest coach
  finding (by rule) and the question, but only when the reply uses no number (so it cannot
  depend on one student's readings) and the question has none either. Later turns of a thread,
  report review and question drafting are never cached.
- Cache entries are kept 30 days and hold the question's hash, never its text. A served reply is
  logged as `cached`, at no cost.

### 4. Feature flags

- **One switch per AI feature, plus all AI**, in the admin portal's AI page, each change audited
  (ADR 0040) with undo. Off means the feature's routes answer "switched off" at once (a few
  seconds at most: the API reads the switches with a 10-second cache) and the app hides it.
- `AI_ENABLED` stays the server's master switch; the portal's switches work beneath it.
- The switches are in our own database: no extra service, instant, audited with the rest.
  PostHog stays planned for product analytics and pilot rollouts in Phase 6.

### 5. The admin portal's AI page

Replaces today's "not built yet" page, in the portal's dashboard pattern (D30):

- headline tiles: requests today, spend today against the budget, cache hit rate, held replies;
- requests and cost per feature over the chosen range (24 hours, 7 days, 30 days), as hatched
  bars;
- the switches (decision 4);
- a needs-attention list: the budget near or past, a feature's held replies rising.

Evaluation results and flagged replies come with item 5's evaluation suite.

### 6. What the student and teacher see

- In the Ask tab, the What if panel and report review: the quota line when a quota is used up,
  and "switched off" when a switch is off; the coach still works. `GET /ai/status` gains each
  feature's state (available, quota used, switched off, budget reached) so buttons are hidden or
  explained before anyone presses them.

### 7. A board first

The admin AI page is a new screen, so a board, `design/mockups/AiAdmin.dc.html`, comes as its own
pull request first: the tiles, the per-feature bars, the switches with their undo toast, the
needs-attention list, and the budget reached. The student-side lines reuse the existing states.

## The pull requests, in order

1. This brief.
2. The board, for approval.
3. Quotas, the address limit and the daily budget, with `GET /ai/status` per feature.
4. The answer cache for what if and the tutor.
5. The switches (API and storage) and the admin AI page.

## What Mortey needs to provide, to turn AI on after this item

| Item                                                                                | Expected cost   |
| ----------------------------------------------------------------------------------- | --------------- |
| The Anthropic API key, as a secret, in a workspace with a monthly spend limit       | Below           |
| `AI_LOG_KEY`, a long random secret                                                  | Nothing         |
| The monthly AI budget (master plan, still open), from which the daily budget is set | Mortey's figure |

At 1,000 students, the cost model's usage on these models is about $10 a month for the tutor and
$80 for report review on Sonnet 5.5. The quotas above cap the worst case: a class of 40 using every
quota every school day (22 a month) would cost at most about $110 a month, most of it report review.

## Not in this item

- The evaluation suite and flagged replies (item 5), voice quotas (the voice is the browser's own,
  so it costs nothing), and PostHog.
