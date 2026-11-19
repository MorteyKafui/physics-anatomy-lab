# Question drafting, with reviewer approval in the admin portal: brief

The third Phase 4 item (master plan, "Question drafting with reviewer approval in the admin
portal"), written for review before anything is built. The plan says:

| Feature           | What Claude does                         | Guardrail                                                               |
| ----------------- | ---------------------------------------- | ----------------------------------------------------------------------- |
| Question drafting | Drafts follow-up questions for exam mode | A teacher or Dr Acquah approves each question before it enters the bank |

And the admin portal's Question bank: "AI-drafted questions waiting for review; approve, edit or
reject". Exam mode already ends with three follow-up questions per experiment, written into
`packages/experiments` and approved by the physics reviewer (for the pendulum: the small-angle
limit, the seconds pendulum, the mass of the bob).

- **Status:** draft for Mortey's approval. Decisions 1 to 8; the questions for Mortey are marked
  **Choose**.

## The decisions

### 1. Who drafts, and where

- **Teachers**, signed in, on a new **Questions** page in the teacher's area (`/teach/questions`).
  Question drafting is the one AI feature students never get (item 1's rule already says so).
- The teacher picks the experiment and what the questions should test (the step, such as
  "precautions" or "the graph"), and asks for a draft. Claude drafts three questions, each with a
  model answer and the marks it is worth, as JSON (structured outputs), on Claude Sonnet 5.5 as
  approved in item 1.
- The teacher edits any draft, throws away the ones they do not want, and **submits** the rest
  to the bank. Nothing a teacher drafts reaches a student before review.

### 2. What is sent to Claude

The experiment, its step names, its existing follow-up questions (so the drafts do not repeat
them), the stated settings the lab uses (for the pendulum: the lengths, 20 oscillations, the
amplitude below 10°) and the teacher's note on what to test. Nothing about the teacher or any
student.

### 3. Numbers in questions and answers

Physics is never typed in (rule 1), so a drafted question may use only the experiment's stated
settings, and its model answer may use no number that is not either one of those or worked out
by `packages/physics` when the question is shown. Practically: drafts are kept to questions that
explain, predict or name ("Why do you time 20 oscillations, not one?"), and a draft with any
other number is held, as the tutor's replies are (the same check, `app/ai/numbers.py`).

### 4. The review, in the admin portal

- **Question bank** (the portal's placeholder page today) lists submitted drafts, newest first,
  with the experiment, the step, the teacher who submitted it (staff see teachers' emails, ADR 0040) and the date.
- A drawer per question, in the portal's one dashboard pattern (D30): the question, the model
  answer and marks, and one main action, **Approve**. Also **Edit**, then approve, and **Reject**,
  with a short reason the teacher sees.
- Who approves: staff with the portal's Cloudflare Access (Dr Acquah as physics reviewer). Every
  decision goes in the admin audit log (ADR 0040), with no question text in the log line.
- The teacher's Questions page shows each of their submissions with its state: waiting, approved,
  rejected (with the reason).

### 5. Where approved questions go

- **Choose:** approved questions are shown in exam mode to **everyone** using that experiment,
  as part of the shared bank (proposed: the reviewer's approval is the content review), or only to
  the **classes of the teacher who submitted them**.
- Exam mode keeps its three built-in follow-ups and adds up to three from the bank, picked by the
  attempt's seed, on the exam's result sheet and its PDF.
- **Offline first:** the lab fetches the approved questions for an experiment when online and
  keeps them on the device; an exam offline uses the ones it has, or the built-in three.

### 6. What is stored

A `questions` table: the experiment and step, the question, the model answer and marks, who
submitted it (a teacher's account), the state (submitted, approved, rejected), who reviewed it
(the staff email, as in the audit log), when, and the rejection reason. No student data. A
teacher who deletes their account takes their unreviewed submissions with them; approved ones
stay in the bank without their name.

### 7. Limits

A teacher may draft at most 20 times a day until item 4's quotas replace this, and submit at most
30 questions waiting for review at a time.

### 8. A board first

The teacher's Questions page and the admin Question bank (the list and the drawer) are new
screens, so a board, `design/mockups/Questions.dc.html`, comes as its own pull request first:
drafting, editing and submitting, a held draft, the teacher's list of submissions with their
states, and the admin list and drawer (approve, edit, reject), dark, at desktop and phone width.

## The pull requests, in order

1. This brief.
2. The board, for approval.
3. The API: the table and migration, drafting (`POST /ai/question-drafting`), submitting, the
   teacher's list, and the staff review endpoints with the audit log.
4. The teacher's Questions page.
5. The admin Question bank.
6. Exam mode showing approved questions, with the offline copy.

## What Mortey needs to provide

Nothing new. Drafting is occasional: about 4,000 tokens in and 1,500 out per draft on Sonnet 5.5,
about $0.025 a draft, so 100 teachers drafting twice a week is about $20 a month.

## Not in this item

- Questions for students to answer during the lab (exam mode only), translation of the bank,
  and question drafting for the other four experiments' follow-ups beyond what exam mode shows.
