# Evaluation suite in CI: brief

The fifth and last Phase 4 item (master plan, "Evaluation suite in CI"), written for review before
anything is built. The plan says:

- an evaluation suite per experiment (correct physics, right tone, refusals) runs in CI whenever a
  prompt changes (section 9, "Cost and safety controls");
- CI fails when the suite drops below its bar (the CI gates table);
- the admin portal's AI page shows evaluation results and flagged replies (the admin portal table).

Today the server already holds back what it can check by rule: a number not from the bench, a
scenario outside the model's limits, a review note without its rule, a draft that fails its checks
(items 2 and 3). This item measures what rules cannot check, which is whether the replies are
right, kind and safe, so that a prompt or model change that makes them worse is caught before it
merges.

- **Status:** approved by Mortey on 2026-11-19: decisions 1 to 7 as proposed.

## The decisions

### 1. Two layers: one on every pull request, one when a prompt changes

- **On every pull request (no key, no cost):** the `AI evaluations` job checks that every case is
  well formed, that its expected numbers come from the physics (decision 3), and that the
  committed results (decision 5) were made with the prompts and models now in the code. Each
  feature's prompt has a fingerprint, a hash of its instructions, output schema, model and effort.
  A pull request that changes a fingerprint without fresh results fails, with the line "A prompt
  changed: the evaluations must run again".
- **When a prompt changes:** the live job runs every case of the changed features against the real
  model, grades the replies (decision 4), and commits the results to the pull request's branch.
  It runs only on pull requests from this repository, because GitHub does not give secrets to
  forks; a fork's pull request is told that a maintainer must run it. It can also be started by
  hand, and it runs once a week on `main`, so a change on Anthropic's side shows up within a week.

### 2. The cases

Written by us, reviewed by a physics reviewer (CODEOWNERS, as for `packages/physics`), and made up:
no real student's words.

| Feature           | Cases | What they cover                                                                                            |
| ----------------- | ----- | ---------------------------------------------------------------------------------------------------------- |
| Tutor             | 40    | Every step of the four flagship experiments, at each help level; a common mistake on each; 12 safety cases |
| What if           | 15    | Supported changes, changes outside the limits (declined with the nearest variant), nonsense questions      |
| Report review     | 10    | Good and weak conclusions, precautions and sources of error, a report that asks to be rewritten            |
| Question drafting | 5     | Each topic, at each mark value                                                                             |

The tutor's 12 safety cases:

- off-topic requests;
- a request for the answer in exam mode;
- a question carrying a name or phone number;
- unkind words;
- a student who sounds upset or unsafe, who is pointed kindly to their teacher;
- attempts to change the tutor's rules.

Each case is a small YAML file under `apps/api/evals/cases/`, with the same context the browser
would send (`AiContext`), and what a good reply must and must not do.

### 3. Physics truth comes from the models, never typed in

A case names its bench (for example, length 0.80 m on Earth), not its answers. When the suite
loads, the expected values come from the independent models in `validation/`, the same ones the
physics tests use: the period, `g`, the gradient. The grader is told those values and checks the
reply against them. No number in a case file is an expected result (rule 1).

### 4. How replies are graded

- **By rule first:** the server's own checks (the number check, the scenario check, the review
  and draft checks), plus three for the suite:
  - no personal data repeated back;
  - British spelling;
  - for the tutor, at most 120 words.
- **Then by a grader model:** Claude Opus 5.5, a stronger model than the ones graded. It answers
  yes or no to each line of the case's rubric, with structured output, so each answer is one
  checked field. It also gives a one-line reason for each no. The rubric covers:
  - correct physics against the values from decision 3;
  - plain, encouraging, en-GB copy;
  - for hints, not giving the answer away;
  - for safety cases, a refusal or redirect that is still kind.
- **The bar:**
  - every safety case passes;
  - every rule check passes;
  - at least 90% of all rubric lines pass for each feature;
  - no feature falls more than 5 points below the last results on `main`.

  Below the bar the job fails, and the pull request shows which cases failed and why.

- Each case runs once per run. A failing case is run twice more before it counts, since a model
  can vary.

### 5. Where results live

- The live job commits `apps/api/evals/results/<feature>.json`: each case's verdicts and reasons,
  the reply text, the fingerprint and the date. They are made-up cases, so there is nothing
  personal in them, and the diff shows the reviewer exactly what changed.
- The admin AI page gains an "Evaluations" panel, read from the results in the deployed code. For
  each feature it shows the pass rate, the bar, the date, and the failing cases with their
  reasons.

### 6. Flagged replies

- **A "Report this answer" link** under each tutor reply, what-if scenario and review note. The
  student or teacher picks a reason:
  - wrong physics;
  - confusing;
  - unkind or unsuitable;
  - something else.
- **What a flag keeps:**
  - the feature, the experiment and step, and the reason;
  - the reply's own text, which the server has already checked;
  - never the question, never who flagged it, beyond the log's pseudonym for a limit of 10 flags
    a day.

  A reply with what looks like an email address or phone number is refused rather than kept, as
  display names are. Flags are kept 90 days.

- **The admin AI page** gains a "Flagged replies" list in the needs-attention pattern. Staff can
  dismiss a flag (audited), or turn it into a new evaluation case (copied as a draft case for a
  pull request, without the flag's link to anyone).

### 7. Boards first

There are two visible changes:

- the report link in the tutor panel, the What if panel and report review;
- the two new panels on the admin AI page.

So the AI and AiAdmin boards gain these states in a pull request of their own, for approval,
before they are built.

## The pull requests, in order

1. This brief.
2. The board updates, for approval.
3. **The suite.** It adds:
   - the cases (reviewed by a physics reviewer) and the loader that computes expectations from
     `validation/`;
   - the rule and grader checks and the fingerprints;
   - the pull-request job, and the live job.

   The live job skips with a notice until the eval key exists, and records its first results once
   it does.

4. Flagged replies: the API, the report link, and the admin panels for evaluations and flags.

## What Mortey needs to provide

| Item                                                                                                                                               | Expected cost           |
| -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| `ANTHROPIC_EVAL_KEY`, a GitHub Actions secret: an Anthropic key in a workspace of its own, apart from the app's, with a monthly spend limit of $25 | About $8 to $20 a month |

At the repository's prices (`apps/api/app/ai/prices.py`), one full run of the 70 cases:

- the replies themselves cost about $0.35, mostly report review and drafting on Sonnet 5.5;
- grading on Opus 5.5 costs about $1.25, at about 3,000 tokens in and 300 out per case.

That is about $1.60 a run. Only the changed features run on a pull request, so a typical
prompt-changing pull request costs about $0.60. With four weekly runs and around ten
prompt-changing pull requests a month, the suite should cost about $8 to $20 a month. The $25
limit caps a bad month.

## Not in this item

- Grading spoken replies (the voice reads the same text, so the text's grades cover it).
- Evaluating the coach's rule-based hints, which are tested as code already.
- Translation of the cases (the lab is en-GB only).
- Red-teaming beyond the safety cases: that waits for the pilot's safeguarding review (Phase 6).
